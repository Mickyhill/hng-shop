"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart, MAX_QTY } from "@/lib/cart";
import type { Product } from "@/lib/types";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const limit = Math.min(MAX_QTY, product.stock);
  const soldOut = product.stock <= 0;

  function handleAdd() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceKobo: product.price_kobo,
        accent: product.accent,
      },
      quantity,
    );
    setAdded(true);
  }

  if (soldOut) {
    return (
      <button type="button" className="btn btn-primary btn-lg" disabled>
        Sold out
      </button>
    );
  }

  return (
    <div className="add-to-cart">
      <div className="qty" role="group" aria-label="Quantity">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
        >
          −
        </button>
        <span aria-live="polite">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(limit, q + 1))}
          aria-label="Increase quantity"
          disabled={quantity >= limit}
        >
          +
        </button>
      </div>
      <button type="button" className="btn btn-primary btn-lg" onClick={handleAdd}>
        Add to cart
      </button>
      {added && (
        <p className="added-note" role="status">
          Added. <Link href="/cart">View cart</Link>
        </p>
      )}
    </div>
  );
}
