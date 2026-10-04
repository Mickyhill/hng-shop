# MickyHill Store

A shop website for handmade Nigerian goods, built for **HNG Internship 15, Task 2**.

Shoppers browse products, add them to a cart, sign in with Google, check out, and get an order confirmation email. Every order is stored in Postgres.

**Live demo:** _add your Vercel link here_

## Task checklist

| Requirement | How this project meets it |
| --- | --- |
| Website for a shop | Product catalogue, product pages, cart |
| Checkout page | `/checkout` with delivery form and order summary |
| Persist everything in a database | Supabase Postgres: `products`, `orders`, `order_items` |
| Confirmation emails | Sent from the server after each order. Brevo by default, Mailgun supported (see note below) |
| Google auth with Google Cloud Console | Google OAuth client from Google Cloud Console, connected through Supabase Auth |

## Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Supabase**: Postgres database, Row Level Security, Google sign-in
- **Brevo** (default) or **Mailgun**: transactional email, switched with `EMAIL_PROVIDER`
- **Zod**: server-side input validation
- **Vercel**: hosting

## How checkout works

1. The cart lives in the browser (localStorage), so visitors shop without an account.
2. `/checkout` requires a signed-in user. Middleware sends visitors to `/login` first.
3. The form posts to `POST /api/checkout`. The route validates input with Zod and calls the Postgres function `place_order()`.
4. `place_order()` runs in one transaction. It reads prices from the `products` table (never from the browser), checks and reduces stock, and writes the order and its items.
5. The route sends the confirmation email through Brevo or Mailgun. A failed email never loses the order. The shopper sees a notice instead.
6. Row Level Security lets each user read only their own orders.

## Project structure

```
app/
  page.tsx                  shop home and product grid
  products/[slug]/page.tsx  product page
  cart/page.tsx             cart
  checkout/                 checkout page and form
  api/checkout/route.ts     validates, places the order, sends email
  orders/                   order history and order detail
  login/                    Google sign-in
  auth/callback/route.ts    OAuth code exchange
  auth/signout/route.ts     sign out
components/                 header, product visual, add-to-cart
lib/
  supabase/                 browser, server and middleware clients
  email.ts                  email template, Brevo and Mailgun senders
  cart.tsx                  cart state
  format.ts                 Naira formatting and shipping rule
supabase/schema.sql         tables, RLS policies, place_order(), seed data
middleware.ts               session refresh and route protection
```

## Run locally

### 1. Install

```bash
git clone https://github.com/Mickyhill/hng-shop.git
cd hng-shop
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and click **Run**.
3. From **Project Settings > API**, copy the Project URL and the `anon` public key into `.env.local`.

### 3. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com), create a project.
2. Go to **APIs & Services > OAuth consent screen**. Choose **External**, fill in the app name and your email, and save.
3. Go to **APIs & Services > Credentials > Create credentials > OAuth client ID**. Choose **Web application**.
4. Under **Authorized redirect URIs**, add `https://<your-project-ref>.supabase.co/auth/v1/callback`.
5. Copy the Client ID and Client Secret.
6. In Supabase, open **Authentication > Sign In / Providers > Google**, turn it on, and paste both values.
7. In Supabase, open **Authentication > URL Configuration**. Set **Site URL** to your live URL and add these **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://<your-vercel-domain>/**`

### 4. Email (Brevo)

1. Create a free account at [brevo.com](https://www.brevo.com). No card is needed.
2. Go to **Senders, Domains & Dedicated IPs > Senders**, add the email you want to send from, and click the verification link Brevo emails you.
3. Go to **SMTP & API > API Keys** and generate a key.
4. In `.env.local`, set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`.

**Why Brevo instead of Mailgun?** The task names Mailgun, but Mailgun no longer offers a free plan, and its trial requires a credit card. The code still supports Mailgun: set `EMAIL_PROVIDER=mailgun` and fill in the `MAILGUN_*` variables.

### 5. Start

```bash
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add every variable from `.env.example` under **Settings > Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to the Vercel URL.
3. Deploy, then add the Vercel URL to Supabase **Redirect URLs** (step 3.7 above).

## Security notes

- Secrets live in environment variables. `.env.local` is git-ignored.
- Prices and stock are enforced in the database, so a tampered cart cannot change what an order costs.
- `place_order()` runs as `security definer` but uses `auth.uid()`, so users can only create orders for themselves.
- Orders and order items are protected by Row Level Security.
- Redirect targets after sign-in are limited to paths on this site.

## Author

Michael Ndianaobong Churchill, Software Engineering student, Federal University of Technology, Ikot Abasi (FUTIA), Nigeria.
Portfolio: [mickyhill.floot.app](https://mickyhill.floot.app) · GitHub: [@Mickyhill](https://github.com/Mickyhill)
