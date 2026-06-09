import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@glassbox/database";
import {
  feedbackEvents,
  products,
  recommendationEvents,
} from "@glassbox/database/schema";
import {
  createEvaluationDatasetFromFeedback,
  type FeedbackDerivedDatasetOptions,
  type FeedbackEvalEvent,
} from "../evaluation-from-feedback";

const args = process.argv.slice(2);

function getArg(flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function getIntArg(flag: string) {
  const value = getArg(flag);
  return value ? parseInt(value, 10) : undefined;
}

const projectId = getArg("--project-id");
const outPath = getArg("--out");

if (!projectId || !outPath) {
  throw new Error(
    "Usage: --project-id <uuid> --out <path> [--days 90] [--max-scenarios 25] [--max-candidates 12]"
  );
}

const days = getIntArg("--days") ?? 90;
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const maxScenarios = getIntArg("--max-scenarios");
const maxCandidates = getIntArg("--max-candidates");
const minRelevantEvents = getIntArg("--min-relevant-events");

const projectFeedback = await db
  .select({
    endUserId: feedbackEvents.endUserId,
    productId: feedbackEvents.productId,
    eventType: feedbackEvents.eventType,
    createdAt: feedbackEvents.createdAt,
  })
  .from(feedbackEvents)
  .where(
    and(
      eq(feedbackEvents.projectId, projectId),
      gte(feedbackEvents.createdAt, since)
    )
  )
  .orderBy(desc(feedbackEvents.createdAt));

const productIds = Array.from(
  new Set(projectFeedback.map((event) => event.productId).filter(Boolean))
) as string[];

const projectProducts = productIds.length
  ? await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(inArray(products.id, productIds))
  : [];

const projectRecommendationEvents = await db
  .select({
    endUserId: recommendationEvents.endUserId,
    sliders: recommendationEvents.sliders,
    createdAt: recommendationEvents.createdAt,
  })
  .from(recommendationEvents)
  .where(
    and(
      eq(recommendationEvents.projectId, projectId),
      gte(recommendationEvents.createdAt, since)
    )
  )
  .orderBy(desc(recommendationEvents.createdAt));

const normalizedFeedbackEvents: FeedbackEvalEvent[] = projectFeedback.flatMap((event) => {
  if (
    event.eventType !== "view" &&
    event.eventType !== "click" &&
    event.eventType !== "cart_add" &&
    event.eventType !== "purchase"
  ) {
    return [];
  }

  return [
    {
      endUserId: event.endUserId,
      productId: event.productId,
      eventType: event.eventType,
      createdAt: event.createdAt,
    },
  ];
});

const dataset = createEvaluationDatasetFromFeedback(
  {
    datasetName: `feedback-derived-${projectId}-${days}d`,
    products: projectProducts,
    feedbackEvents: normalizedFeedbackEvents,
    recommendationEvents: projectRecommendationEvents.map((event) => ({
      ...event,
      sliders:
        event.sliders && typeof event.sliders === "object"
          ? (event.sliders as Record<string, number>)
          : null,
    })),
  },
  {
    maxScenarios,
    maxCandidates,
    minRelevantEvents,
  } satisfies FeedbackDerivedDatasetOptions
);

const resolvedOutPath = resolve(outPath);
await mkdir(dirname(resolvedOutPath), { recursive: true });
await writeFile(resolvedOutPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(
  `Generated ${dataset.scenarios.length} recommendation eval scenarios from ${projectFeedback.length} feedback events into ${resolvedOutPath}`
);
