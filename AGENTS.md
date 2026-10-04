# AGENTS.md

Guidance for AI coding agents working on this repository.

## Project

MickyHill Store: a Next.js shop for HNG Internship 15, Task 2. Product catalogue, cart, Google sign-in, checkout, Postgres storage, confirmation emails through Brevo (default) or Mailgun.

## Stack

- Next.js 15 App Router, React 19, TypeScript (strict)
- Supabase (`@supabase/ssr`) for Postgres, Row Level Security and Google OAuth
- Brevo or Mailgun HTTP API through `fetch` (no SDK), chosen by `EMAIL_PROVIDER`
- Zod for request validation
- Plain CSS in `app/globals.css` with CSS custom properties

## Commands

- `npm install`: install dependencies
- `npm run dev`: local dev server on http://localhost:3000
- `npm run typecheck`: TypeScript check
- `npm run build`: production build. Run before every commit.

## Architecture rules

- Money is stored and passed as integer **kobo** (`price_kobo`, `total_kobo`). Format only at render time with `formatKobo()` in `lib/format.ts`.
- Never trust prices or stock from the browser. Orders are created only through the Postgres function `place_order()` in `supabase/schema.sql`.
- The shipping rule exists in two places: `place_order()` and `shippingFor()` in `lib/format.ts`. Change both together.
- Use `lib/supabase/server.ts` in Server Components and Route Handlers, `lib/supabase/client.ts` in Client Components. Never import a server module into a client file.
- Code that uses secrets (`lib/email.ts`, `lib/products.ts`) imports `server-only`.
- Protected routes are listed in `PROTECTED_PREFIXES` in `lib/supabase/middleware.ts`. Pages also re-check the user.
- Database changes go into `supabase/schema.sql`. Every new table needs RLS enabled and explicit policies.
- A failed email must never fail a checkout. Log it and return `emailSent: false`.

## Style rules

- Use the CSS variables in `:root` of `app/globals.css`. Do not hardcode new colours.
- Every interactive element needs visible text or an `aria-label`.
- Show loading, empty and error states for every data view.
- Keep components small. Add a new file in `components/` only for reused UI.

## Environment

Variables are documented in `.env.example`. Never commit `.env.local` or real keys.
