import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <div className="container section narrow legal">
      <p className="eyebrow">Last updated 3 October 2026</p>
      <h1 className="page-title">Terms of service</h1>

      <p>
        MickyHill Store is a student project built for HNG Internship 15 by Michael Ndianaobong
        Churchill. By using the site you agree to these terms.
      </p>

      <h2>Demo store</h2>
      <p>
        This store exists to demonstrate a working shop: product pages, cart, checkout, database
        storage, confirmation emails and Google sign-in. Orders placed here are not fulfilled, no
        payment is taken, and no goods are delivered.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with your Google account. Keep your Google account secure. You are responsible for
        orders placed while signed in.
      </p>

      <h2>Acceptable use</h2>
      <p>Do not attempt to break, overload or misuse the site or its services.</p>

      <h2>Changes</h2>
      <p>These terms may change as the project develops. The date above shows the latest version.</p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:mickyhill4070@gmail.com">mickyhill4070@gmail.com</a>
      </p>
    </div>
  );
}
