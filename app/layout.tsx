import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MickyHill Store: handmade Nigerian goods",
    template: "%s · MickyHill Store",
  },
  description:
    "Adire, aso-oke, leather and home goods made by Nigerian artisans. Order online and get delivery across Nigeria.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CartProvider>
          <Header />
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <div className="container footer-inner">
              <span>© {new Date().getFullYear()} MickyHill Store</span>
              <nav className="footer-links" aria-label="Legal">
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </nav>
              <span>Built by Michael Ndianaobong Churchill · HNG Internship 15</span>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
