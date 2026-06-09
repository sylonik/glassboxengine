import { SequentialAgent } from "@google/adk";
import { architectAgent } from "./architect-agent";
import { reasonerAgent } from "./reasoner-agent";

/**
 * Alignment Pipeline (SequentialAgent): Orchestrates the full alignment loop.
 *
 * 1. ArchitectAgent: translates sliders → pgvector search → ranked feed
 *    Writes result to temp:architect_result
 * 2. ReasonerAgent: generates Glass Box labels from the ranked feed
 *    Reads temp:architect_result, writes temp:reasoning_labels
 *
 * Replaces the manual coordinator.ts orchestration with ADK's
 * built-in sequential composition.
 */
export const alignmentPipelineAgent = new SequentialAgent({
  name: "alignment_pipeline",
  description:
    "Orchestrates the full alignment loop: Architect search followed by Reasoner labeling",
  subAgents: [architectAgent, reasonerAgent],
});
