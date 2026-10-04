import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { formatKobo } from "@/lib/format";
import { ProductVisual } from "@/components/ProductVisual";
import { AddToCart } from "@/components/AddToCart";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product
    ? { title: product.name, description: product.description }
    : { title: "Product not found" };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="container section">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Shop</Link> <span aria-hidden="true">/</span> <span>{product.name}</span>
      </nav>

      <div className="product-detail">
        <ProductVisual
          name={product.name}
          accent={product.accent}
          imageUrl={product.image_url}
          size="hero"
        />

        <div className="product-info">
          <p className="product-category">{product.category}</p>
          <h1 className="page-title">{product.name}</h1>
          <p className="price price-lg">{formatKobo(product.price_kobo)}</p>
          <p className="product-description">{product.description}</p>
          <p className="muted stock-line">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
