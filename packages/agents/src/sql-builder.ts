import type { SliderConfig } from "@glassbox/database";

export interface SearchParams {
  similarityThreshold: number;
  limit: number;
  weights: {
    similarity: number;
    diversity: number;
    novelty: number;
    popularity: number;
  };
  orderByComponents: string[];
}

export function buildSearchParams(sliders: SliderConfig): SearchParams {
  const similarityThreshold = 0.18 + sliders.relevance * 0.37;
  const limit = Math.round(10 + sliders.diversity * 40);

  const weights = {
    similarity: clampWeight(0.45 + sliders.relevance * 0.55),
    diversity: clampWeight(0.15 + sliders.diversity * 0.35),
    novelty: clampWeight(0.1 + sliders.novelty * 0.3),
    popularity: clampWeight(0.08 + sliders.popularity * 0.22),
  };

  const orderByComponents: string[] = [];
  const ranked = Object.entries(weights).sort(([, a], [, b]) => b - a);
  for (const [key] of ranked) {
    switch (key) {
      case "similarity":
        orderByComponents.push("embedding_distance ASC");
        break;
      case "diversity":
        orderByComponents.push("category_rank ASC");
        break;
      case "novelty":
        orderByComponents.push("created_at DESC");
        break;
      case "popularity":
        orderByComponents.push("view_count DESC");
        break;
    }
  }

  return { similarityThreshold, limit, weights, orderByComponents };
}

export function explainSliderTranslation(sliders: SliderConfig): string {
  const parts: string[] = [];
  if (sliders.relevance > 0.7) parts.push("Prioritizing highly relevant matches");
  else if (sliders.relevance < 0.3) parts.push("Relaxing relevance to broaden results");
  if (sliders.diversity > 0.7) parts.push("Maximizing category diversity");
  else if (sliders.diversity < 0.3) parts.push("Allowing category concentration");
  if (sliders.novelty > 0.7) parts.push("Boosting new and undiscovered items");
  else if (sliders.novelty < 0.3) parts.push("Preferring established items");
  if (sliders.popularity > 0.7) parts.push("Surfacing trending items");
  else if (sliders.popularity < 0.3) parts.push("Ignoring popularity signals");
  return parts.length > 0 ? parts.join(". ") + "." : "Balanced ranking across all dimensions.";
}

function clampWeight(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
