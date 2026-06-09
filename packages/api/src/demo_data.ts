export const demoProducts = [
  {
    externalId: "demo-headphones",
    name: "Wireless Noise-Cancelling Headphones",
    description:
      "Premium over-ear headphones with 30hr battery life, ANC, and spatial audio support.",
    category: "Electronics",
    metadata: { price: 249, margin: "high", inventory: "healthy" },
  },
  {
    externalId: "demo-matcha",
    name: "Organic Matcha Powder",
    description:
      "Ceremonial grade matcha from Uji, Japan. Rich umami flavor, stone-ground.",
    category: "Food & Beverage",
    metadata: { price: 32, margin: "medium", inventory: "healthy" },
  },
  {
    externalId: "demo-standing-desk",
    name: "Ergonomic Standing Desk",
    description:
      "Electric sit-stand desk with memory presets, cable management, and bamboo top.",
    category: "Furniture",
    metadata: { price: 599, margin: "high", inventory: "limited" },
  },
  {
    externalId: "demo-trail-shoes",
    name: "Ultralight Trail Running Shoes",
    description:
      "Carbon-plated trail shoes with Vibram outsole. 198g per shoe.",
    category: "Sports",
    metadata: { price: 179, margin: "medium", inventory: "healthy" },
  },
  {
    externalId: "demo-garden-kit",
    name: "Smart Indoor Garden Kit",
    description:
      "Automated herb garden with LED grow lights, auto-watering, and companion app.",
    category: "Home & Garden",
    metadata: { price: 129, margin: "high", inventory: "new" },
  },
  {
    externalId: "demo-french-press",
    name: "Titanium French Press",
    description:
      "Double-wall insulated titanium press. Keeps coffee hot for 4 hours.",
    category: "Kitchen",
    metadata: { price: 89, margin: "medium", inventory: "healthy" },
  },
  {
    externalId: "demo-wallet",
    name: "Minimalist Leather Wallet",
    description:
      "Full-grain Italian leather, RFID blocking, fits 8 cards plus cash.",
    category: "Accessories",
    metadata: { price: 74, margin: "high", inventory: "healthy" },
  },
  {
    externalId: "demo-code-assistant",
    name: "AI Code Assistant Subscription",
    description:
      "12-month license for AI pair programming tool with multi-model support.",
    category: "Software",
    metadata: { price: 240, margin: "high", inventory: "digital" },
  },
  {
    externalId: "demo-solar-charger",
    name: "Portable Solar Charger Panel",
    description:
      "28W foldable solar panel with USB-C PD and dual USB-A ports.",
    category: "Electronics",
    metadata: { price: 118, margin: "medium", inventory: "healthy" },
  },
  {
    externalId: "demo-sourdough-kit",
    name: "Artisan Sourdough Starter Kit",
    description:
      "100-year-old starter culture with banneton basket, lame, and recipe booklet.",
    category: "Food & Beverage",
    metadata: { price: 45, margin: "medium", inventory: "healthy" },
  },
];

export function createDemoEmbedding(seed: string, dimensions = 768) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Array.from({ length: dimensions }, (_, index) => {
    hash ^= index + 0x9e3779b9;
    hash = Math.imul(hash, 16777619);
    return ((hash >>> 0) / 0xffffffff) * 2 - 1;
  });
}

export const demoScoringCode = `function score(ctx) {
  const { product, sliders } = ctx;
  const price = product.metadata?.price ?? 100;
  const highMarginBoost = product.metadata?.margin === "high" ? 0.12 : 0;
  const inventoryBoost = product.metadata?.inventory === "healthy" ? 0.08 : 0;

  let score = ctx.similarity * sliders.relevance;
  score += ctx.categoryDiversity * sliders.diversity * 0.25;
  score += (price < 150 ? 0.15 : 0.05) * sliders.popularity;
  score += highMarginBoost + inventoryBoost;

  return Math.min(score, 1);
}`;

export const demoAuditLogs = [
  {
    action: "catalog.seeded",
    agentName: "System",
    reasoning:
      "Created a demo commerce catalog with product categories, merchandising metadata, and starter alignment inputs.",
    confidenceScore: 1,
    inputContext: { source: "demo_seed", productCount: demoProducts.length },
    metadata: { demo: true },
  },
  {
    action: "alignment.profile_created",
    agentName: "Coordinator",
    reasoning:
      "Initialized a balanced intent profile so the recommendation workflow can rank by relevance, diversity, novelty, and popularity.",
    confidenceScore: 0.92,
    inputContext: { relevance: 0.7, diversity: 0.45, novelty: 0.35, popularity: 0.55 },
    metadata: { demo: true },
  },
  {
    action: "scoring.draft_created",
    agentName: "Mentor",
    reasoning:
      "Added a starter scoring function that combines embedding similarity, category diversity, price, inventory, and margin signals.",
    confidenceScore: 0.88,
    inputContext: { scorer: "Demo Commerce Scorer" },
    metadata: { demo: true },
  },
];
