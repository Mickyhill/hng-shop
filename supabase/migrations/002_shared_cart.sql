-- =====================================================================
-- Migration 002: shared cart for website and mobile app
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to re-run. Does NOT touch products, orders or order_items data.
-- =====================================================================

-- ---------- Cart table ----------
create table if not exists public.cart_items (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 20),
  updated_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.cart_items enable row level security;

drop policy if exists "Users manage their own cart" on public.cart_items;
create policy "Users manage their own cart"
  on public.cart_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- Cart functions (run as the caller, so RLS applies) ----------
-- Add to cart: inserts a line or increases its quantity, capped at 20.
create or replace function public.cart_add(p_product_id uuid, p_quantity integer default 1)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.cart_items (user_id, product_id, quantity)
  values (auth.uid(), p_product_id, least(20, greatest(1, p_quantity)))
  on conflict (user_id, product_id)
  do update set quantity   = least(20, public.cart_items.quantity + excluded.quantity),
                updated_at = now();
$$;

-- Set quantity: 0 or less removes the line.
create or replace function public.cart_set(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_quantity <= 0 then
    delete from public.cart_items
    where user_id = auth.uid() and product_id = p_product_id;
  else
    insert into public.cart_items (user_id, product_id, quantity)
    values (auth.uid(), p_product_id, least(20, p_quantity))
    on conflict (user_id, product_id)
    do update set quantity = least(20, excluded.quantity), updated_at = now();
  end if;
end;
$$;

revoke all on function public.cart_add(uuid, integer) from public, anon;
revoke all on function public.cart_set(uuid, integer) from public, anon;
grant execute on function public.cart_add(uuid, integer) to authenticated;
grant execute on function public.cart_set(uuid, integer) to authenticated;

-- ---------- Realtime: push cart changes to every signed-in device ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cart_items'
  ) then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end;
$$;

-- ---------- place_order(): now also empties the cart after a successful order ----------
create or replace function public.place_order(
  p_items     jsonb,
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

  v_shipping := case when v_subtotal >= 5000000 then 0 else 250000 end;

  insert into public.orders (user_id, email, full_name, phone, address, city,
                             subtotal_kobo, shipping_kobo, total_kobo)
  values (v_user_id, p_email, p_full_name, p_phone, p_address, p_city,
          v_subtotal, v_shipping, v_subtotal + v_shipping)
  returning id, orders.order_number into v_order_id, v_order_number;

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

  -- The order now holds these items, so empty the shared cart.
  delete from public.cart_items where user_id = v_user_id;

  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text) to authenticated;
