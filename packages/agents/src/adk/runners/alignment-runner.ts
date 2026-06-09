import type { SliderConfig } from "@glassbox/database";
import { runCoordinator as runLegacyCoordinator, type CoordinatorResult } from "../../coordinator";

/**
 * Runner for the Alignment Pipeline (SequentialAgent).
 * The ADK wrapper intentionally delegates to the deterministic core
 * recommendation pipeline so ADK cannot drift from the canonical output.
 */
export async function runAlignmentPipeline(
  sliders: SliderConfig,
  userId: string,
  queryText: string = "general product recommendations",
  projectId?: string,
  personaId?: string
): Promise<CoordinatorResult> {
  return runLegacyCoordinator(sliders, userId, queryText, projectId, personaId);
}
