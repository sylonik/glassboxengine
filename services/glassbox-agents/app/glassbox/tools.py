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
"""Deterministic tools for the GlassBox agents.

`translate_slider_config` is the EXACT production slider->retrieval translation
(ported from packages/agents/src/sql-builder.ts). The Architect agent must call
it so every proposal it makes reflects what the deterministic TS ranking core
will actually execute — the agent reasons, the glass-box math decides.
"""


def _clamp(value: float) -> float:
    return min(max(value, 0.0), 1.0)


def translate_slider_config(
    relevance: float,
    diversity: float,
    novelty: float,
    popularity: float,
) -> dict:
    """Translate intent sliders into the deterministic retrieval parameters used in production.

    Mirrors the GlassBox TypeScript ranking core (sql-builder.ts) exactly: it
    clamps each slider to [0, 1] and derives the pgvector similarity threshold,
    the candidate limit, and the four ranking weights. Call this with your
    proposed slider values BEFORE finalizing a recommendation so the proposal
    reflects what the engine will really do.

    Args:
        relevance: Proposed relevance slider value, 0.0-1.0.
        diversity: Proposed diversity slider value, 0.0-1.0.
        novelty: Proposed novelty slider value, 0.0-1.0.
        popularity: Proposed popularity slider value, 0.0-1.0.

    Returns:
        dict with `sliders` (the clamped values), `similarityThreshold`,
        `candidateLimit`, and `weights` (similarity/diversity/novelty/popularity)
        exactly as the production ranking core derives them.
    """
    sliders = {
        "relevance": _clamp(relevance),
        "diversity": _clamp(diversity),
        "novelty": _clamp(novelty),
        "popularity": _clamp(popularity),
    }
    return {
        "sliders": sliders,
        "similarityThreshold": round(0.18 + sliders["relevance"] * 0.37, 4),
        "candidateLimit": round(10 + sliders["diversity"] * 40),
        "weights": {
            "similarity": _clamp(0.45 + sliders["relevance"] * 0.55),
            "diversity": _clamp(0.15 + sliders["diversity"] * 0.35),
            "novelty": _clamp(0.1 + sliders["novelty"] * 0.3),
            "popularity": _clamp(0.08 + sliders["popularity"] * 0.22),
        },
    }
