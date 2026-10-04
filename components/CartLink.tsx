"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="nav-link cart-link" aria-label={`Cart, ${count} items`}>
      Cart
      <span className="cart-count" data-empty={!ready || count === 0}>
        {ready ? count : 0}
      </span>
    </Link>
  );
}
