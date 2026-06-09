import { readFile } from "node:fs/promises";
import { z } from "zod";
import type {
  FeedbackDerivedDatasetInput,
  FeedbackEvalEventType,
  FeedbackEvalRecommendationEvent,
} from "./evaluation-from-feedback";

const sliderSchema = z.object({
  relevance: z.number().optional(),
  diversity: z.number().optional(),
  novelty: z.number().optional(),
  popularity: z.number().optional(),
});

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

const feedbackEventSchema = z.object({
  endUserId: z.string().min(1),
  productId: z.string().nullable().optional(),
  eventType: z.enum(["view", "click", "cart_add", "purchase"]),
  createdAt: z.string().nullable().optional(),
});

const recommendationEventSchema = z.object({
  endUserId: z.string().min(1),
  sliders: sliderSchema.nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

const feedbackEvalExportSchema = z.object({
  datasetName: z.string().min(1),
  products: z.array(productSchema).min(1),
  feedbackEvents: z.array(feedbackEventSchema).min(1),
  recommendationEvents: z.array(recommendationEventSchema).optional(),
});

export interface FeedbackEvalExport {
  datasetName: string;
  products: FeedbackDerivedDatasetInput["products"];
  feedbackEvents: FeedbackDerivedDatasetInput["feedbackEvents"];
  recommendationEvents?: FeedbackEvalRecommendationEvent[];
}

export async function loadFeedbackEvalExport(
  exportPath: string
): Promise<FeedbackEvalExport> {
  const raw = await readFile(exportPath, "utf8");
  const parsed = feedbackEvalExportSchema.parse(JSON.parse(raw));

  return {
    datasetName: parsed.datasetName,
    products: parsed.products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category ?? null,
      createdAt: product.createdAt ?? null,
    })),
    feedbackEvents: parsed.feedbackEvents.map((event) => ({
      endUserId: event.endUserId,
      productId: event.productId ?? null,
      eventType: event.eventType as FeedbackEvalEventType,
      createdAt: event.createdAt ?? null,
    })),
    recommendationEvents: parsed.recommendationEvents?.map((event) => ({
      endUserId: event.endUserId,
      sliders: event.sliders ?? null,
      createdAt: event.createdAt ?? null,
    })),
  };
}
