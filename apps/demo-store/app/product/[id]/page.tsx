import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct, PRODUCTS } from "../../../lib/catalog";
import { ProductDetail } from "../../../components/product-detail";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  return {
    title: product
      ? `${product.name} — Glassbox Demo Store`
      : "Product — Glassbox Demo Store",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
