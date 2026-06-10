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
"""Unit tests for the Architect pipeline, Persona pipeline, and MCP toolset builder."""

import pytest
from google.adk.agents import SequentialAgent

from app.glassbox.agents import build_architect, build_coordinator, build_persona
from app.glassbox.tools import build_glassbox_mcp_toolset, translate_slider_config


# ---------------------------------------------------------------------------
# translate_slider_config — deterministic production math
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# build_glassbox_mcp_toolset — env-gating
# ---------------------------------------------------------------------------


def test_mcp_toolset_returns_none_without_env_vars(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """No env vars set -> graceful degradation: returns None, no exception."""
    monkeypatch.delenv("GLASSBOX_MCP_URL", raising=False)
    monkeypatch.delenv("GLASSBOX_MCP_API_KEY", raising=False)

    result = build_glassbox_mcp_toolset(["get_feed"])
    assert result is None


def test_mcp_toolset_returns_none_with_only_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only URL set (no key) -> still returns None."""
    monkeypatch.setenv("GLASSBOX_MCP_URL", "https://glassboxengine.dev/api/mcp")
    monkeypatch.delenv("GLASSBOX_MCP_API_KEY", raising=False)

    result = build_glassbox_mcp_toolset(["get_feed"])
    assert result is None


def test_mcp_toolset_returns_none_with_only_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only API key set (no URL) -> still returns None."""
    monkeypatch.delenv("GLASSBOX_MCP_URL", raising=False)
    monkeypatch.setenv("GLASSBOX_MCP_API_KEY", "secret-key")

    result = build_glassbox_mcp_toolset(["get_feed"])
    assert result is None


def test_mcp_toolset_constructs_with_both_env_vars(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Both env vars set -> returns an McpToolset (not None)."""
    from google.adk.tools.mcp_tool import McpToolset

    monkeypatch.setenv("GLASSBOX_MCP_URL", "https://glassboxengine.dev/api/mcp")
    monkeypatch.setenv("GLASSBOX_MCP_API_KEY", "test-api-key")

    toolset = build_glassbox_mcp_toolset(["get_scoring_config", "get_feed"])
    assert toolset is not None
    assert isinstance(toolset, McpToolset)


def test_mcp_toolset_passes_correct_url_and_headers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The constructed toolset's session manager carries the right URL and auth header."""
    from google.adk.tools.mcp_tool.mcp_session_manager import (
        StreamableHTTPConnectionParams,
    )

    test_url = "https://glassboxengine.dev/api/mcp"
    test_key = "my-secret-bearer-token"
    monkeypatch.setenv("GLASSBOX_MCP_URL", test_url)
    monkeypatch.setenv("GLASSBOX_MCP_API_KEY", test_key)

    toolset = build_glassbox_mcp_toolset(["track_events"])
    assert toolset is not None

    # Access the internal session manager to verify connection params were set correctly.
    session_manager = toolset._mcp_session_manager
    params = session_manager._connection_params
    assert isinstance(params, StreamableHTTPConnectionParams)
    assert params.url == test_url
    assert params.headers == {"Authorization": f"Bearer {test_key}"}


# ---------------------------------------------------------------------------
# Architect pipeline — structure + MCP-gating
# ---------------------------------------------------------------------------


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


def test_architect_planner_always_has_translate_slider_config(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """translate_slider_config must be present on the planner regardless of MCP env."""
    monkeypatch.delenv("GLASSBOX_MCP_URL", raising=False)
    monkeypatch.delenv("GLASSBOX_MCP_API_KEY", raising=False)

    architect = build_architect()
    planner = architect.sub_agents[0]

    tool_names = [
        getattr(t, "__name__", None) or getattr(t, "name", None) for t in planner.tools
    ]
    assert "translate_slider_config" in tool_names


def test_architect_planner_has_mcp_toolset_when_env_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When both MCP env vars are set, the planner should have more than one tool."""
    monkeypatch.setenv("GLASSBOX_MCP_URL", "https://glassboxengine.dev/api/mcp")
    monkeypatch.setenv("GLASSBOX_MCP_API_KEY", "key")

    architect = build_architect()
    planner = architect.sub_agents[0]

    # translate_slider_config + McpToolset = at least 2 entries in tools list
    assert len(planner.tools) >= 2


# ---------------------------------------------------------------------------
# Persona pipeline — structure
# ---------------------------------------------------------------------------


def test_persona_is_a_sequential_pipeline() -> None:
    """build_persona() must return a SequentialAgent named persona_simulator_agent."""
    persona = build_persona()

    assert isinstance(persona, SequentialAgent)
    assert persona.name == "persona_simulator_agent"


def test_persona_pipeline_step_names_and_schema() -> None:
    """Researcher step has no output_schema; formatter step has PersonaSimOutput."""
    from app.glassbox.schemas import PersonaSimOutput

    persona = build_persona()
    researcher, formatter = persona.sub_agents

    assert researcher.name == "persona_researcher"
    assert formatter.name == "persona_formatter"
    assert not getattr(researcher, "output_schema", None)
    assert formatter.output_schema is not None
    assert formatter.output_schema is PersonaSimOutput


def test_persona_pipeline_output_keys() -> None:
    """Researcher writes persona_research; formatter writes simulation_result."""
    persona = build_persona()
    researcher, formatter = persona.sub_agents

    assert researcher.output_key == "persona_research"
    assert formatter.output_key == "simulation_result"


def test_persona_formatter_has_no_tools() -> None:
    """output_schema disables tools — formatter must not carry any."""
    persona = build_persona()
    formatter = persona.sub_agents[1]

    assert not formatter.tools


def test_persona_researcher_has_no_tools_without_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Without MCP env vars the researcher should have an empty tools list."""
    monkeypatch.delenv("GLASSBOX_MCP_URL", raising=False)
    monkeypatch.delenv("GLASSBOX_MCP_API_KEY", raising=False)

    persona = build_persona()
    researcher = persona.sub_agents[0]

    assert not researcher.tools


def test_persona_researcher_has_mcp_toolset_when_env_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With MCP env vars, researcher should have the MCP toolset."""
    monkeypatch.setenv("GLASSBOX_MCP_URL", "https://glassboxengine.dev/api/mcp")
    monkeypatch.setenv("GLASSBOX_MCP_API_KEY", "key")

    persona = build_persona()
    researcher = persona.sub_agents[0]

    assert len(researcher.tools) >= 1


# ---------------------------------------------------------------------------
# Coordinator routing — names contract
# ---------------------------------------------------------------------------


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
