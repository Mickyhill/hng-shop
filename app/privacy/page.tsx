import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <div className="container section narrow legal">
      <p className="eyebrow">Last updated 3 October 2026</p>
      <h1 className="page-title">Privacy policy</h1>

      <p>
        MickyHill Store is a student project built for HNG Internship 15 by Michael Ndianaobong
        Churchill. This page explains what information the store collects and how it is used.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From Google sign-in:</strong> your name, email address and profile photo. We do not
          receive your Google password.
        </li>
        <li>
          <strong>When you order:</strong> your phone number, delivery address and city, plus the
          items, quantities and prices in your order.
        </li>
        <li>
          <strong>In your browser:</strong> your cart is saved in your browser&apos;s local storage until
          you check out. A session cookie keeps you signed in.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create and show your orders.</li>
        <li>To send your order confirmation email.</li>
        <li>To contact you about delivery.</li>
      </ul>
      <p>We do not sell your information or use it for advertising.</p>

      <h2>Who processes it</h2>
      <ul>
        <li>Supabase stores accounts and orders.</li>
        <li>Brevo sends confirmation emails.</li>
        <li>Vercel hosts the website.</li>
        <li>Google provides sign-in.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        To see, correct or delete your information, email{" "}
        <a href="mailto:mickyhill4070@gmail.com">mickyhill4070@gmail.com</a>. You can also remove the
        store&apos;s access from your Google account settings at any time.
      </p>
    </div>
  );
}
