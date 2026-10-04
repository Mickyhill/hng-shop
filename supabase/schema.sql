-- =====================================================================
-- MickyHill Store: database schema
-- Run this whole file once in Supabase: SQL Editor > New query > Run.
-- Safe to re-run: it drops and recreates the store objects.
-- =====================================================================

-- ---------- Clean slate (re-runnable) ----------
drop function if exists public.place_order(jsonb, text, text, text, text, text);
drop table if exists public.order_items;
drop table if exists public.orders;
drop table if exists public.products;
drop type if exists public.order_status;

-- ---------- Types ----------
create type public.order_status as enum ('pending', 'paid', 'shipped', 'cancelled');

-- ---------- Products ----------
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text not null,
  category     text not null,
  price_kobo   integer not null check (price_kobo > 0),   -- NGN stored in kobo (1 NGN = 100 kobo)
  stock        integer not null default 0 check (stock >= 0),
  image_url    text,
  accent       text not null default '#c2552f',            -- colour used for the product visual
  created_at   timestamptz not null default clock_timestamp()   -- keeps seed order
);

-- ---------- Orders ----------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default ('MH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id          uuid not null references auth.users (id) on delete cascade,
  email            text not null,
  full_name        text not null,
  phone            text not null,
  address          text not null,
  city             text not null,
  status           public.order_status not null default 'pending',
  subtotal_kobo    integer not null check (subtotal_kobo >= 0),
  shipping_kobo    integer not null check (shipping_kobo >= 0),
  total_kobo       integer not null check (total_kobo >= 0),
  created_at       timestamptz not null default now()
);

create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);

-- ---------- Order items ----------
create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid not null references public.products (id),
  product_name     text not null,          -- snapshot, so history survives product edits
  unit_price_kobo  integer not null check (unit_price_kobo > 0),
  quantity         integer not null check (quantity between 1 and 20),
  line_total_kobo  integer not null check (line_total_kobo > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

-- ---------- Row Level Security ----------
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Anyone (signed in or not) can browse products.
create policy "Products are viewable by everyone"
  on public.products for select
  using (true);

-- Shoppers can only read their own orders. Inserts happen through place_order().
create policy "Users can view their own orders"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can view items of their own orders"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  ));

-- ---------- place_order(): atomic, server-priced checkout ----------
-- Prices come from the products table, never from the browser.
-- Stock is checked and decremented in the same transaction.
create or replace function public.place_order(
  p_items     jsonb,   -- [{"product_id": "uuid", "quantity": 2}, ...]
  p_full_name text,
  p_phone     text,
  p_address   text,
  p_city      text,
  p_email     text
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id      uuid := auth.uid();
  v_order_id     uuid;
  v_order_number text;
  v_subtotal     integer := 0;
  v_shipping     integer;
  v_item         jsonb;
  v_product      public.products%rowtype;
  v_qty          integer;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order' using errcode = '28000';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many items in one order' using errcode = '22023';
  end if;

  -- First pass: validate every line and compute the subtotal.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    if not found then
      raise exception 'A product in your cart no longer exists' using errcode = '22023';
    end if;

    if v_product.stock < v_qty then
      raise exception 'Only % left of %', v_product.stock, v_product.name using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + v_product.price_kobo * v_qty;
  end loop;

  -- Flat shipping, free over NGN 50,000.
  v_shipping := case when v_subtotal >= 5000000 then 0 else 250000 end;

  insert into public.orders (user_id, email, full_name, phone, address, city,
                             subtotal_kobo, shipping_kobo, total_kobo)
  values (v_user_id, p_email, p_full_name, p_phone, p_address, p_city,
          v_subtotal, v_shipping, v_subtotal + v_shipping)
  returning id, orders.order_number into v_order_id, v_order_number;

  -- Second pass: write the line items and reduce stock.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    insert into public.order_items (order_id, product_id, product_name,
                                    unit_price_kobo, quantity, line_total_kobo)
    values (v_order_id, v_product.id, v_product.name,
            v_product.price_kobo, v_qty, v_product.price_kobo * v_qty);

    update public.products set stock = stock - v_qty where id = v_product.id;
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text) to authenticated;

-- ---------- Seed products ----------
insert into public.products (slug, name, description, category, price_kobo, stock, accent) values
  ('adire-indigo-throw',   'Adire Indigo Throw',
   'Hand-dyed cotton throw from Abeokuta, made with the traditional resist-dye method. Every piece carries its own pattern. 150 x 200 cm.',
   'Textiles',   2850000, 12, '#2f4a7a'),
  ('aso-oke-table-runner', 'Aso-Oke Table Runner',
   'Strip-woven aso-oke runner in gold and wine. Woven on a narrow loom in Iseyin and finished by hand. 35 x 180 cm.',
   'Textiles',   1800000, 15, '#8a2f3c'),
  ('leather-slide-sandals','Leather Slide Sandals',
   'Full-grain leather slides cut and stitched in Aba. Cushioned footbed, hard-wearing sole. Available in sizes 39 to 46.',
   'Footwear',   2200000, 20, '#7a4a2a'),
  ('carved-calabash-bowl', 'Carved Calabash Bowl',
   'Natural calabash bowl with pyro-engraved geometric patterns. Food safe inside. Each bowl is about 25 cm across.',
   'Home',        950000, 18, '#a8742f'),
  ('raw-shea-butter',      'Raw Shea Butter, 500 g',
   'Unrefined grade-A shea butter from northern Nigeria. Nothing added. Good for skin, hair and lips.',
   'Wellness',    650000, 40, '#c9a46a'),
  ('coral-bead-necklace',  'Coral Bead Necklace',
   'Hand-strung coral-tone beads with a brass clasp, inspired by Edo royal regalia. Length 50 cm.',
   'Accessories', 1500000, 10, '#b8402f'),
  ('woven-raffia-basket',  'Woven Raffia Basket',
   'Sturdy raffia market basket with leather handles. Holds a full shop run. 40 x 30 cm.',
   'Home',       1250000, 14, '#6f7a3a'),
  ('black-soap-bar-set',   'Black Soap Bar Set',
   'Three bars of traditional ose dudu made from plantain skin ash, palm kernel oil and shea butter.',
   'Wellness',    480000, 35, '#3b3530');
