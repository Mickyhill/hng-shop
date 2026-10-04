"use client";

import Link from "next/link";
import { useCart, MAX_QTY } from "@/lib/cart";
import { formatKobo, shippingFor, FREE_SHIPPING_THRESHOLD_KOBO } from "@/lib/format";
import { ProductVisual } from "@/components/ProductVisual";

export default function CartPage() {
  const { lines, ready, subtotalKobo, setQuantity, remove } = useCart();
  const shipping = shippingFor(subtotalKobo);
  const toFree = FREE_SHIPPING_THRESHOLD_KOBO - subtotalKobo;

  if (!ready) {
    return (
      <div className="container section">
        <h1 className="page-title">Your cart</h1>
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container section">
        <h1 className="page-title">Your cart</h1>
        <div className="empty-state">
          <p className="empty-title">Your cart is empty</p>
          <p className="muted">Pick something you love from the shop.</p>
          <Link href="/" className="btn btn-primary">
            Go to shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1 className="page-title">Your cart</h1>

      <div className="checkout-layout">
        <ul className="cart-list">
          {lines.map((line) => (
            <li key={line.productId} className="cart-line">
              <ProductVisual name={line.name} accent={line.accent} size="thumb" />
              <div className="cart-line-body">
                <Link href={`/products/${line.slug}`} className="cart-line-name">
                  {line.name}
                </Link>
                <span className="muted">{formatKobo(line.priceKobo)} each</span>
              </div>
              <div className="qty qty-sm" role="group" aria-label={`Quantity of ${line.name}`}>
                <button
                  type="button"
                  onClick={() => setQuantity(line.productId, line.quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.productId, line.quantity + 1)}
                  aria-label="Increase quantity"
                  disabled={line.quantity >= MAX_QTY}
                >
                  +
                </button>
              </div>
              <span className="cart-line-total">{formatKobo(line.priceKobo * line.quantity)}</span>
              <button
                type="button"
                className="link-button"
                onClick={() => remove(line.productId)}
                aria-label={`Remove ${line.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <aside className="summary" aria-label="Order summary">
          <h2 className="summary-title">Summary</h2>
          <dl className="summary-rows">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatKobo(subtotalKobo)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{shipping === 0 ? "Free" : formatKobo(shipping)}</dd>
            </div>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>{formatKobo(subtotalKobo + shipping)}</dd>
            </div>
          </dl>
          {toFree > 0 && (
            <p className="muted small">Add {formatKobo(toFree)} more for free shipping.</p>
          )}
          <Link href="/checkout" className="btn btn-primary btn-block btn-lg">
            Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
