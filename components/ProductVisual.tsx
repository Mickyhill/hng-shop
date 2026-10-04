import type { CSSProperties } from "react";

type Props = {
  name: string;
  accent: string;
  imageUrl?: string | null;
  size?: "card" | "hero" | "thumb";
};

/**
 * Product image. Uses image_url when set, otherwise draws a woven-pattern
 * panel in the product's accent colour, so the shop looks finished even
 * before real photos are uploaded.
 */
export function ProductVisual({ name, accent, imageUrl, size = "card" }: Props) {
  const initial = name.trim().charAt(0).toUpperCase();

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={`visual visual-${size}`} src={imageUrl} alt={name} loading="lazy" />
    );
  }

  return (
    <div
      className={`visual visual-${size}`}
      style={{ "--accent": accent } as CSSProperties}
      role="img"
      aria-label={name}
    >
      <span className="visual-mark" aria-hidden="true">
        {initial}
      </span>
    </div>
  );
}
