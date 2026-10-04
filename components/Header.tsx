import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CartLink } from "@/components/CartLink";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? user?.email;

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          MickyHill <span>Store</span>
        </Link>

        <nav className="nav" aria-label="Main">
          <Link href="/" className="nav-link">
            Shop
          </Link>
          {user && (
            <Link href="/orders" className="nav-link">
              Orders
            </Link>
          )}
          <CartLink />
          {user ? (
            <form action="/auth/signout" method="post" className="nav-user">
              <span className="nav-greeting">Hi, {displayName}</span>
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn btn-outline btn-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
