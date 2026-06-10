# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Builders for the GlassBox multi-agent system.

A Coordinator root agent (no output_schema) routes by a JSON `task` field to three
leaf sub-agents, each carrying a Pydantic output_schema for structured JSON output.
Note: output_schema disables tools AND delegation, so only the leaves carry it; the
Coordinator must not.

Agent topology (as of MCP integration):
  glassbox_coordinator           — root router, no output_schema
    reasoner_agent               — output_schema=ReasonerOutput, no tools
    mentor_agent                 — output_schema=MentorOutput, no tools
    tutor_agent                  — output_schema=MentorChatOutput, no tools
    persona_simulator_agent      — SequentialAgent (mirrors architect pattern)
      persona_researcher         — MCP tools: get_catalog, get_feed, track_events
      persona_formatter          — output_schema=PersonaSimOutput, no tools
    architect_pipeline           — SequentialAgent
      architect_planner          — local tool: translate_slider_config
                                   + MCP tools: get_scoring_config, get_feed
      architect_formatter        — output_schema=ArchitectOutput, no tools
"""

import os

from google.adk.agents import Agent, SequentialAgent
from google.adk.models import Gemini
from google.genai import types

from app.glassbox.prompts import (
    ARCHITECT_FORMATTER_INSTRUCTION,
    ARCHITECT_PLANNER_INSTRUCTION,
    COORDINATOR_INSTRUCTION,
    MENTOR_CHAT_INSTRUCTION,
    MENTOR_INSTRUCTION,
    PERSONA_FORMATTER_INSTRUCTION,
    PERSONA_RESEARCHER_INSTRUCTION,
    REASONER_INSTRUCTION,
)
from app.glassbox.schemas import (
    ArchitectOutput,
    MentorChatOutput,
    MentorOutput,
    PersonaSimOutput,
    ReasonerOutput,
)
from app.glassbox.tools import build_glassbox_mcp_toolset, translate_slider_config

# gemini-2.5-flash is available on Vertex AI in us-east1 (the Agent Engine
# region). The AI-Studio alias "gemini-flash-latest" is NOT a Vertex publisher
# model there and 404s. Override via env if deploying to a different region.
MODEL_NAME = os.environ.get("GLASSBOX_AGENT_MODEL", "gemini-2.5-flash")


def _build_model() -> Gemini:
    """Shared Gemini model with retry options."""
    return Gemini(
        model=MODEL_NAME,
        retry_options=types.HttpRetryOptions(attempts=3),
    )


def build_reasoner() -> Agent:
    """Reasoner agent (Explainability): faithful Glass Box reasoning labels."""
    return Agent(
        name="reasoner_agent",
        model=_build_model(),
        description=(
            "Generates faithful, human-readable Glass Box labels explaining why each "
            "ranked item was recommended, grounded only in the provided score breakdown."
        ),
        instruction=REASONER_INSTRUCTION,
        output_schema=ReasonerOutput,
        output_key="reasoning_labels",
    )


def build_mentor() -> Agent:
    """Mentor agent (Education): validates scoring code via Socratic questioning."""
    return Agent(
        name="mentor_agent",
        model=_build_model(),
        description=(
            "Reviews scoring-function code for mathematical, security, and performance "
            "issues using Socratic questioning, and produces a guided dialogue."
        ),
        instruction=MENTOR_INSTRUCTION,
        output_schema=MentorOutput,
        output_key="mentor_result",
    )


def build_tutor() -> Agent:
    """Tutor agent (Education): one Socratic dialogue turn after a blocked commit.

    Named distinctly from the reviewer (`mentor_agent`) so the Coordinator never
    confuses the `mentor` (fresh review) and `tutor` (dialogue) tasks.
    """
    return Agent(
        name="tutor_agent",
        model=_build_model(),
        description=(
            "Answers a follow-up message in an ongoing dialogue about a blocked "
            "scoring-function commit: evaluates the engineer's reply, deepens "
            "understanding, never writes the fix. Does not review fresh code."
        ),
        instruction=MENTOR_CHAT_INSTRUCTION,
        output_schema=MentorChatOutput,
        output_key="tutor_result",
    )


def build_persona() -> SequentialAgent:
    """Persona simulator pipeline (Cold Start): synthetic interactions for a persona.

    Mirrors the Architect pattern: output_schema disables tools, so we split into
    a tool-using researcher step and a schema-enforced formatter step.

    The SequentialAgent is named `persona_simulator_agent` so the Coordinator's
    routing rule ("simulate" -> persona_simulator_agent) requires no change.
    The final output_key `simulation_result` and PersonaSimOutput schema are
    preserved on the formatter step, which is what the runtime contract and callers
    consume.
    """
    # Step 1: ground in the real catalog + optionally write synthetic events.
    # MCP toolset is optional — returns None if env vars are not set, and the
    # agent falls back to the catalog supplied in the prompt payload.
    persona_mcp = build_glassbox_mcp_toolset(
        ["get_catalog", "get_feed", "track_events"]
    )
    researcher_tools = [persona_mcp] if persona_mcp is not None else []

    researcher = Agent(
        name="persona_researcher",
        model=_build_model(),
        description=(
            "Grounds the persona simulation in the real product catalog via MCP, "
            "plans synthetic interactions, and writes them back to the platform "
            "via track_events. Falls back to catalog-from-payload when MCP is unavailable."
        ),
        instruction=PERSONA_RESEARCHER_INSTRUCTION,
        tools=researcher_tools,
        output_key="persona_research",
    )

    # Step 2: format the researcher's findings into the structured output schema.
    formatter = Agent(
        name="persona_formatter",
        model=_build_model(),
        description=(
            "Formats the persona researcher's analysis into the structured "
            "PersonaSimOutput JSON."
        ),
        instruction=PERSONA_FORMATTER_INSTRUCTION,
        output_schema=PersonaSimOutput,
        output_key="simulation_result",
    )

    return SequentialAgent(
        name="persona_simulator_agent",
        description=(
            "Generates synthetic user interactions for cold-start simulation and "
            "persona testing against a product catalog, grounded in live platform data."
        ),
        sub_agents=[researcher, formatter],
    )


def build_architect() -> SequentialAgent:
    """Architect pipeline (Logic Drift): business goal -> slider proposal.

    A two-step SequentialAgent: the planner reasons about the goal and grounds
    its proposal by calling the deterministic translate_slider_config tool (the
    exact production slider->retrieval math) plus optionally the live MCP tools
    get_scoring_config and get_feed to anchor the proposal in real platform state;
    the formatter then emits the structured ArchitectOutput. The split exists
    because output_schema disables tools, so a single agent cannot both call the
    tool and guarantee JSON.
    """
    # The MCP toolset is optional — returns None if env vars are not set.
    architect_mcp = build_glassbox_mcp_toolset(["get_scoring_config", "get_feed"])
    planner_tools: list = [translate_slider_config]
    if architect_mcp is not None:
        planner_tools.append(architect_mcp)

    planner = Agent(
        name="architect_planner",
        model=_build_model(),
        description=(
            "Reasons about a plain-language business goal and proposes intent-slider "
            "values, grounded by the deterministic translate_slider_config tool and "
            "optionally the live platform scoring config."
        ),
        instruction=ARCHITECT_PLANNER_INSTRUCTION,
        tools=planner_tools,
        output_key="architect_plan",
    )
    formatter = Agent(
        name="architect_formatter",
        model=_build_model(),
        description=(
            "Formats the architect planner's analysis into the structured "
            "ArchitectOutput JSON."
        ),
        instruction=ARCHITECT_FORMATTER_INSTRUCTION,
        output_schema=ArchitectOutput,
        output_key="architect_proposal",
    )
    return SequentialAgent(
        name="architect_pipeline",
        description=(
            "Converts a plain-language business goal into a transparent intent-slider "
            "proposal with the exact retrieval parameters the production engine derives."
        ),
        sub_agents=[planner, formatter],
    )


def build_coordinator() -> Agent:
    """Coordinator root agent: routes by the JSON `task` field to the leaf agents.

    Must NOT have an output_schema, since that would disable delegation.
    """
    reasoner = build_reasoner()
    mentor = build_mentor()
    tutor = build_tutor()
    persona_simulator = build_persona()
    architect = build_architect()

    return Agent(
        name="glassbox_coordinator",
        model=_build_model(),
        description=(
            "Routes GlassBox reasoning tasks to the Reasoner (explainability), Mentor "
            "(education: review fresh code), Tutor (education: dialogue follow-up), "
            "Persona Simulator (cold start), or Architect (goal alignment) based on a "
            "JSON `task` field."
        ),
        instruction=COORDINATOR_INSTRUCTION,
        sub_agents=[reasoner, mentor, tutor, persona_simulator, architect],
    )
