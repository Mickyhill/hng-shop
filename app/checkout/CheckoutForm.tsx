"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatKobo, shippingFor } from "@/lib/format";

type Props = { defaultName: string; email: string };

type FieldErrors = Partial<Record<"fullName" | "phone" | "address" | "city", string>>;

export function CheckoutForm({ defaultName, email }: Props) {
  const router = useRouter();
  const { lines, ready, subtotalKobo, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const shipping = shippingFor(subtotalKobo);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      clear();
      router.push(`/orders/${data.orderId}?placed=1${data.emailSent ? "" : "&email=failed"}`);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return <div className="skeleton" style={{ height: 320 }} />;

  if (lines.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title">Your cart is empty</p>
        <Link href="/" className="btn btn-primary">
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-layout">
      <form className="card form" onSubmit={handleSubmit} noValidate>
        <h2 className="summary-title">Delivery details</h2>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" value={email} readOnly className="input input-readonly" />
          <p className="hint">Your confirmation email goes here.</p>
        </div>

        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            className="input"
            defaultValue={defaultName}
            autoComplete="name"
            required
            maxLength={100}
            aria-invalid={!!fieldErrors.fullName}
          />
          {fieldErrors.fullName && <p className="field-error">{fieldErrors.fullName}</p>}
        </div>

        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="input"
            placeholder="0803 000 0000"
            autoComplete="tel"
            required
            maxLength={20}
            aria-invalid={!!fieldErrors.phone}
          />
          {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
        </div>

        <div className="field">
          <label htmlFor="address">Delivery address</label>
          <textarea
            id="address"
            name="address"
            className="input"
            rows={3}
            autoComplete="street-address"
            required
            maxLength={300}
            aria-invalid={!!fieldErrors.address}
          />
          {fieldErrors.address && <p className="field-error">{fieldErrors.address}</p>}
        </div>

        <div className="field">
          <label htmlFor="city">City and state</label>
          <input
            id="city"
            name="city"
            className="input"
            placeholder="Uyo, Akwa Ibom"
            autoComplete="address-level2"
            required
            maxLength={100}
            aria-invalid={!!fieldErrors.city}
          />
          {fieldErrors.city && <p className="field-error">{fieldErrors.city}</p>}
        </div>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? "Placing order…" : `Place order · ${formatKobo(subtotalKobo + shipping)}`}
        </button>
        <p className="hint center">Payment on delivery. Prices are confirmed by our server.</p>
      </form>

      <aside className="summary" aria-label="Order summary">
        <h2 className="summary-title">Your order</h2>
        <ul className="summary-items">
          {lines.map((l) => (
            <li key={l.productId}>
              <span>
                {l.name} <span className="muted">× {l.quantity}</span>
              </span>
              <span>{formatKobo(l.priceKobo * l.quantity)}</span>
            </li>
          ))}
        </ul>
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
      </aside>
    </div>
  );
}
