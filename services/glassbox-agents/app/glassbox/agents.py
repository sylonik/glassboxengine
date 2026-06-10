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
    PERSONA_INSTRUCTION,
    REASONER_INSTRUCTION,
)
from app.glassbox.schemas import (
    ArchitectOutput,
    MentorChatOutput,
    MentorOutput,
    PersonaSimOutput,
    ReasonerOutput,
)
from app.glassbox.tools import translate_slider_config

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


def build_mentor_chat() -> Agent:
    """Mentor chat agent (Education): one Socratic dialogue turn after a block."""
    return Agent(
        name="mentor_chat_agent",
        model=_build_model(),
        description=(
            "Continues the Socratic dialogue about a blocked scoring-function commit: "
            "evaluates the engineer's reply, deepens understanding, never writes the fix."
        ),
        instruction=MENTOR_CHAT_INSTRUCTION,
        output_schema=MentorChatOutput,
        output_key="mentor_chat_result",
    )


def build_persona() -> Agent:
    """Persona simulator agent (Cold Start): synthetic interactions for a persona."""
    return Agent(
        name="persona_simulator_agent",
        model=_build_model(),
        description=(
            "Generates synthetic user interactions for cold-start simulation and "
            "persona testing against a product catalog."
        ),
        instruction=PERSONA_INSTRUCTION,
        output_schema=PersonaSimOutput,
        output_key="simulation_result",
    )


def build_architect() -> SequentialAgent:
    """Architect pipeline (Logic Drift): business goal -> slider proposal.

    A two-step SequentialAgent: the planner reasons about the goal and grounds
    its proposal by calling the deterministic translate_slider_config tool (the
    exact production slider->retrieval math); the formatter then emits the
    structured ArchitectOutput. The split exists because output_schema disables
    tools, so a single agent cannot both call the tool and guarantee JSON.
    """
    planner = Agent(
        name="architect_planner",
        model=_build_model(),
        description=(
            "Reasons about a plain-language business goal and proposes intent-slider "
            "values, grounded by the deterministic translate_slider_config tool."
        ),
        instruction=ARCHITECT_PLANNER_INSTRUCTION,
        tools=[translate_slider_config],
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
    mentor_chat = build_mentor_chat()
    persona_simulator = build_persona()
    architect = build_architect()

    return Agent(
        name="glassbox_coordinator",
        model=_build_model(),
        description=(
            "Routes GlassBox reasoning tasks to the Reasoner (explainability), Mentor "
            "(education, review + dialogue turns), Persona Simulator (cold start), or "
            "Architect (goal alignment) based on a JSON `task` field."
        ),
        instruction=COORDINATOR_INSTRUCTION,
        sub_agents=[reasoner, mentor, mentor_chat, persona_simulator, architect],
    )
