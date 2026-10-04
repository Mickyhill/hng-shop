import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "./GoogleSignInButton";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

/** Only allow redirects back into this site. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const destination = safeNext(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(destination);

  return (
    <div className="container section auth-wrap">
      <div className="card auth-card">
        <p className="eyebrow">MickyHill Store</p>
        <h1 className="page-title">Sign in to continue</h1>
        <p className="muted">
          Use your Google account to check out and track your orders. We only read your name and
          email.
        </p>
        {error && (
          <p className="alert alert-error" role="alert">
            Sign-in did not complete. Please try again.
          </p>
        )}
        <GoogleSignInButton next={destination} />
      </div>
    </div>
  );
}
