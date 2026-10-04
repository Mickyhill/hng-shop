import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route; this is a second check.
  if (!user) redirect("/login?next=/checkout");

  return (
    <div className="container section">
      <h1 className="page-title">Checkout</h1>
      <CheckoutForm
        defaultName={(user.user_metadata?.full_name as string | undefined) ?? ""}
        email={user.email ?? ""}
      />
    </div>
  );
}
