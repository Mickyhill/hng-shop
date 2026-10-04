const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Formats an amount stored in kobo as Naira, e.g. 2850000 -> "₦28,500". */
export function formatKobo(kobo: number): string {
  return naira.format(kobo / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Shipping rule, mirrored from place_order() in supabase/schema.sql. */
export const FREE_SHIPPING_THRESHOLD_KOBO = 5_000_000;
export const FLAT_SHIPPING_KOBO = 250_000;

export function shippingFor(subtotalKobo: number): number {
  return subtotalKobo >= FREE_SHIPPING_THRESHOLD_KOBO ? 0 : FLAT_SHIPPING_KOBO;
}
