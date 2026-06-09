import {
  BaseAgent,
  createEvent,
  createEventActions,
  type InvocationContext,
  type Event,
} from "@google/adk";
import type { SliderConfig } from "@glassbox/database";
import { createPolicySpec } from "../../contracts";
import { runArchitectAgent, type ArchitectResult } from "../../architect";

/**
 * Architect Agent (BaseAgent): Translates slider positions into pgvector
 * search queries and returns a ranked feed with Glass Box explanations.
 *
 * Deterministic pipeline — no LLM reasoning, only embedding generation.
 * Reads slider config and query text from session state.
 * Writes ArchitectResult to temp:architect_result for the Reasoner to consume.
 */
export class ArchitectAgent extends BaseAgent {
  constructor() {
    super({
      name: "architect",
      description:
        "Translates slider positions into pgvector search queries and returns a ranked feed",
    });
  }

  protected async *runAsyncImpl(
    context: InvocationContext
  ): AsyncGenerator<Event, void, void> {
    const sliders = context.session.state[
      "temp:slider_config"
    ] as SliderConfig;
    const queryText =
      (context.session.state["temp:query_text"] as string) ??
      "general product recommendations";
    const userId = context.session.state["temp:user_id"] as string;
    const projectId = context.session.state["temp:project_id"] as
      | string
      | undefined;
    const precomputedEmbedding = context.session.state[
      "temp:precomputed_embedding"
    ] as number[] | undefined;

    const architectResult: ArchitectResult = await runArchitectAgent(
      queryText,
      sliders,
      userId,
      projectId,
      precomputedEmbedding,
      {
        policy: createPolicySpec({
          sliders,
          author: userId,
        }),
      }
    );

    // Write to session state for the Reasoner to consume
    context.session.state["temp:architect_result"] = architectResult;

    yield createEvent({
      author: this.name,
      content: {
        role: "model",
        parts: [
          {
            text: JSON.stringify({
              resultCount: architectResult.rankedFeed.length,
              explanation: architectResult.searchExplanation,
            }),
          },
        ],
      },
      actions: createEventActions({
        stateDelta: { "temp:architect_result": architectResult },
      }),
    });
  }

  protected async *runLiveImpl(
    _context: InvocationContext
  ): AsyncGenerator<Event, void, void> {
    throw new Error("ArchitectAgent does not support live mode");
  }
}

export const architectAgent = new ArchitectAgent();
