// ---------- Legacy agent imports ----------
import {
  runCoordinator as legacyRunCoordinator,
  type CoordinatorResult,
} from "./coordinator";
import {
  runArchitectAgent as legacyRunArchitectAgent,
  type ArchitectResult,
  type RankedItem,
} from "./architect";
import {
  runEngineerAgent as legacyRunEngineerAgent,
  type CatalogScanResult,
} from "./engineer";
import {
  runReasonerAgent as legacyRunReasonerAgent,
  type ReasoningLabel,
} from "./reasoner";
import {
  runMentorAgent as legacyRunMentorAgent,
  type MentorResult,
} from "./mentor";
import {
  runPersonaSimulatorAgent as legacyRunPersonaSimulatorAgent,
  generateBehaviorFromDescription as legacyGenerateBehaviorFromDescription,
  type SimulationResult,
  type SimulatedInteraction,
} from "./persona-simulator";

// ---------- ADK agent imports ----------
import {
  runCoordinator as adkRunCoordinator,
  runMentorAgent as adkRunMentorAgent,
  runEngineerAgent as adkRunEngineerAgent,
  runPersonaSimulatorAgent as adkRunPersonaSimulatorAgent,
  generateBehaviorFromDescription as adkGenerateBehaviorFromDescription,
} from "./adk/index";

// ---------- Feature flag ----------
const useAdk = process.env.GLASSBOX_USE_ADK === "true";

// ---------- Agent exports (switched by feature flag) ----------
export const runCoordinator = useAdk
  ? adkRunCoordinator
  : legacyRunCoordinator;

export const runMentorAgent = useAdk
  ? adkRunMentorAgent
  : legacyRunMentorAgent;

export const runEngineerAgent = useAdk
  ? adkRunEngineerAgent
  : legacyRunEngineerAgent;

export const runPersonaSimulatorAgent = useAdk
  ? adkRunPersonaSimulatorAgent
  : legacyRunPersonaSimulatorAgent;

export const generateBehaviorFromDescription = useAdk
  ? adkGenerateBehaviorFromDescription
  : legacyGenerateBehaviorFromDescription;

// Architect and Reasoner are always the legacy exports (called directly in some places)
export { runArchitectAgent } from "./architect";
export { runReasonerAgent } from "./reasoner";

// Architect advisor: plain-language business goal -> slider proposal (ADK
// Architect pipeline on Agent Engine, with in-process Gemini fallback).
export {
  proposeAlignmentFromGoal,
  type ArchitectProposal,
  type CatalogSummary,
} from "./architect-advisor";
export {
  clampScore,
  createPolicySpec,
  normalizeSliderConfig,
  type PolicySpec,
  type PolicyConstraint,
  type RecommendationRequest,
  type RecommendationResponse,
  type RankedRecommendationItem,
  type ReasoningTrace,
  type ReasoningTraceStep,
  type ScoreContribution,
} from "./contracts";

// ---------- Type re-exports ----------
export type {
  CoordinatorResult,
  ArchitectResult,
  RankedItem,
  CatalogScanResult,
  ReasoningLabel,
  MentorResult,
  SimulationResult,
  SimulatedInteraction,
};

// ---------- Persona builder (real tracked-event personas) ----------
export {
  buildPersonasFromEvents,
  type BuildPersonasResult,
  type ClickHouseQueryClient,
} from "./persona-builder";

// ---------- Tool exports (shared by legacy and ADK) ----------
export { generateEmbedding, generateEmbeddings } from "./embedding-generator";
export { buildSearchParams, explainSliderTranslation } from "./sql-builder";
export { validateScoringCode, type CodeValidationResult } from "./code-validator";
export {
  evaluateScenario,
  getQualityGateFailures,
  rankEvaluationCandidates,
  RECOMMENDATION_QUALITY_GATES,
  summarizeEvaluations,
  type EvaluationCandidate,
  type EvaluationScenario,
  type RankedEvaluationCandidate,
  type ScenarioEvaluationResult,
  type RecommendationEvaluationSummary,
} from "./evaluation";
export { recommendationEvaluationFixtures } from "./evaluation-fixtures";
export {
  loadEvaluationDataset,
  type EvaluationDataset,
} from "./evaluation-datasets";
export {
  createEvaluationDatasetFromFeedback,
  type FeedbackDerivedDatasetInput,
  type FeedbackDerivedDatasetOptions,
  type FeedbackEvalEvent,
  type FeedbackEvalProduct,
  type FeedbackEvalRecommendationEvent,
} from "./evaluation-from-feedback";
export {
  loadFeedbackEvalExport,
  type FeedbackEvalExport,
} from "./feedback-eval-exports";
export {
  createRecommendationEvalReport,
  renderRecommendationEvalTextReport,
  type RecommendationEvalReport,
} from "./scripts/recommendation-eval-utils";

// ---------- Config ----------
export { DEFAULT_MODEL, REASONING_MODEL, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./config";
export * from "./agent-service-client";
