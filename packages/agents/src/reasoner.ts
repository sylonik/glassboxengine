import type { RankedRecommendationItem } from "./contracts";

export type { ReasoningLabel } from "./contracts";
import type { ReasoningLabel } from "./contracts";

/**
 * Reasoner Agent: Generates faithful, deterministic labels from the
 * actual score breakdown used during ranking.
 */
export async function runReasonerAgent(
  rankedItems: RankedRecommendationItem[],
  sliderContext: string
): Promise<ReasoningLabel[]> {
  if (rankedItems.length === 0) return [];

  return rankedItems.map((item, index) => {
    const topFactors = [...item.scoreBreakdown]
      .sort((left, right) => right.weightedValue - left.weightedValue)
      .slice(0, 3);
    const primary = topFactors[0];
    const secondary = topFactors[1];

    const shortLabelParts = [primary?.name, secondary?.name]
      .filter(Boolean)
      .map((part) => part!.replace(/^\w/, (char) => char.toUpperCase()));

    const detailedReasoning = [
      `"${item.name}" ranked #${index + 1} with a composite score of ${item.score.toFixed(3)}.`,
      `${primary?.contribution ?? "Composite ranking applied"}${secondary ? ` and ${secondary.contribution.toLowerCase()}` : ""}.`,
      sliderContext,
    ].join(" ");

    return {
      itemId: item.itemId,
      shortLabel: shortLabelParts.join(" + ") || "Composite ranking applied",
      detailedReasoning,
      factors: topFactors.map((factor) => ({
        name: factor.name,
        weight: factor.weight,
        contribution: factor.contribution,
      })),
    };
  });
}
