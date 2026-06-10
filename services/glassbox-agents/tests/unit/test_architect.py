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
"""Unit tests for the Architect pipeline and its deterministic tool."""

from google.adk.agents import SequentialAgent

from app.glassbox.agents import build_architect, build_coordinator
from app.glassbox.tools import translate_slider_config


def test_translate_slider_config_mirrors_production_math() -> None:
    """The tool must match packages/agents/src/sql-builder.ts exactly."""
    result = translate_slider_config(
        relevance=0.8, diversity=0.5, novelty=0.2, popularity=0.6
    )

    assert result["similarityThreshold"] == round(0.18 + 0.8 * 0.37, 4)
    assert result["candidateLimit"] == round(10 + 0.5 * 40)
    assert result["weights"]["similarity"] == 0.45 + 0.8 * 0.55
    assert result["weights"]["diversity"] == 0.15 + 0.5 * 0.35
    assert result["weights"]["novelty"] == 0.1 + 0.2 * 0.3
    assert result["weights"]["popularity"] == 0.08 + 0.6 * 0.22


def test_translate_slider_config_clamps_out_of_range_inputs() -> None:
    result = translate_slider_config(
        relevance=1.7, diversity=-0.3, novelty=0.5, popularity=2.0
    )

    assert result["sliders"] == {
        "relevance": 1.0,
        "diversity": 0.0,
        "novelty": 0.5,
        "popularity": 1.0,
    }
    assert all(0.0 <= w <= 1.0 for w in result["weights"].values())


def test_architect_is_a_sequential_pipeline_with_grounding_tool() -> None:
    architect = build_architect()

    assert isinstance(architect, SequentialAgent)
    planner, formatter = architect.sub_agents
    assert planner.name == "architect_planner"
    assert formatter.name == "architect_formatter"
    # The planner carries the deterministic grounding tool; the formatter
    # carries the output schema (output_schema disables tools, hence the split).
    assert planner.tools and not getattr(planner, "output_schema", None)
    assert formatter.output_schema is not None and not formatter.tools


def test_coordinator_routes_to_all_specialists() -> None:
    coordinator = build_coordinator()

    names = {agent.name for agent in coordinator.sub_agents}
    assert names == {
        "reasoner_agent",
        "mentor_agent",
        "tutor_agent",
        "persona_simulator_agent",
        "architect_pipeline",
    }
