import { NextResponse } from "next/server";
import { PRODUCTS, CURRENCY } from "../../../lib/catalog";

/**
 * The storefront catalog in the GlassBox Catalog Studio import format.
 * Point a "hosted feed URL" import at /api/catalog.json to load the demo
 * store's products into an engine project — externalId is the storefront's
 * product slug, which the engine echoes back on every feed item so the
 * recommendation rail can map results onto local product pages.
 */
export function GET() {
  return NextResponse.json(
    PRODUCTS.map((product) => ({
      externalId: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      metadata: {
        price: product.price,
        currency: CURRENCY,
        emoji: product.emoji,
      },
    })),
    {
      headers: { "Cache-Control": "public, max-age=300" },
    }
  );
}
