/**
 * ADK-based agent implementations.
 * Re-exports runner functions with identical signatures to the legacy agents.
 */

// Agents
export { runAlignmentPipeline as runCoordinator } from "./runners/alignment-runner";
export { runMentorPipeline as runMentorAgent } from "./runners/mentor-runner";
export { runEngineerPipeline as runEngineerAgent } from "./runners/engineer-runner";
export {
  runPersonaPipeline as runPersonaSimulatorAgent,
  generateBehaviorConfig as generateBehaviorFromDescription,
} from "./runners/persona-runner";

// Re-export types from legacy modules (types are the same)
export type { CoordinatorResult } from "../coordinator";
export type { ArchitectResult, RankedItem } from "../architect";
export type { CatalogScanResult } from "../engineer";
export type { ReasoningLabel } from "../reasoner";
export type { MentorResult } from "../mentor";
export type {
  SimulationResult,
  SimulatedInteraction,
} from "../persona-simulator";
