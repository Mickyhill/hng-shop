import Link from "next/link";
import { getProducts } from "@/lib/products";
import { formatKobo, FREE_SHIPPING_THRESHOLD_KOBO } from "@/lib/format";
import { ProductVisual } from "@/components/ProductVisual";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Made by hand in Nigeria</p>
          <h1 className="hero-title">Goods with a maker behind every piece.</h1>
          <p className="hero-copy">
            Adire from Abeokuta, aso-oke from Iseyin, leather from Aba. Order online and we deliver
            across Nigeria. Free shipping on orders over {formatKobo(FREE_SHIPPING_THRESHOLD_KOBO)}.
          </p>
          <a href="#shop" className="btn btn-primary btn-lg">
            Browse the shop
          </a>
        </div>
      </section>

      <section id="shop" className="container section">
        <div className="section-head">
          <h2 className="section-title">The shop</h2>
          <p className="muted">{products.length} pieces</p>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No products yet</p>
            <p className="muted">Run supabase/schema.sql in your Supabase project to add the catalogue.</p>
          </div>
        ) : (
          <ul className="product-grid">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.slug}`} className="product-card">
                  <ProductVisual name={p.name} accent={p.accent} imageUrl={p.image_url} />
                  <div className="product-card-body">
                    <p className="product-category">{p.category}</p>
                    <h3 className="product-name">{p.name}</h3>
                    <div className="product-meta">
                      <span className="price">{formatKobo(p.price_kobo)}</span>
                      {p.stock === 0 ? (
                        <span className="badge badge-muted">Sold out</span>
                      ) : p.stock <= 5 ? (
                        <span className="badge">Only {p.stock} left</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
