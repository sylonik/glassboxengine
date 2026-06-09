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
"""Pydantic output schemas for the GlassBox leaf sub-agents.

Field names mirror the TypeScript contracts (contracts.ts, code-validator.ts,
persona-simulator.ts) so the TS side can consume the JSON without translation.
"""

from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Reasoner (Explainability) — faithful Glass Box reasoning labels.
# ---------------------------------------------------------------------------


class ReasoningLabel(BaseModel):
    """A faithful explanation for a single ranked item."""

    itemId: str = Field(
        description="The id of the item being explained (must match an input item)."
    )
    shortLabel: str = Field(
        description=(
            "A concise label summarizing the top 1-2 ranking signals, e.g. "
            "'Relevance + Popularity'."
        )
    )
    detailedReasoning: str = Field(
        description=(
            "1-2 sentences explaining the ranking using ONLY the listed score "
            "factors and the provided context. Never invent new factors."
        )
    )
    factors: list[str] = Field(
        default_factory=list,
        description=(
            "The names of the score factors that actually drove this ranking, "
            "drawn only from the provided score breakdown."
        ),
    )


class ReasonerOutput(BaseModel):
    """Structured output for the Reasoner agent."""

    labels: list[ReasoningLabel] = Field(
        default_factory=list,
        description="One reasoning label per ranked item, in ranked order.",
    )


# ---------------------------------------------------------------------------
# Mentor (Education) — scoring-function validation + Socratic dialogue.
# ---------------------------------------------------------------------------


class ValidationIssue(BaseModel):
    """A single issue found while reviewing a scoring function."""

    type: Literal["math", "security", "performance"] = Field(
        description=(
            "Issue category: 'math' (division by zero, NaN propagation, unbounded "
            "outputs, missing normalization), 'security' (eval(), new Function(), "
            "SQL injection, prototype pollution), or 'performance' (O(n^2) loops, "
            "unnecessary copies, missing early returns)."
        )
    )
    severity: Literal["error", "warning", "info"] = Field(
        description="How serious the issue is: 'error', 'warning', or 'info'."
    )
    message: str = Field(
        description="A clear description of the issue found in the code."
    )
    socraticQuestion: str = Field(
        description=(
            "A Socratic question that guides the user toward the fix WITHOUT "
            "giving the answer directly."
        )
    )
    line: int | None = Field(
        default=None,
        description="The 1-based line number where the issue occurs, or null if unknown.",
    )


class MentorOutput(BaseModel):
    """Structured output for the Mentor agent."""

    isValid: bool = Field(
        description="True if the scoring function has no blocking issues; false otherwise."
    )
    issues: list[ValidationIssue] = Field(
        default_factory=list,
        description="The list of math/security/performance issues found in the code.",
    )
    summary: str = Field(
        description="A one-sentence summary of the overall validation result."
    )
    dialogue: list[str] = Field(
        default_factory=list,
        description=(
            "The Socratic transcript lines. When invalid: an opening line, then for "
            "each issue an emoji-prefixed message line ('\U0001f534 ' for error, "
            "'\U0001f7e1 ' for warning, '\U0001f4a1 ' for info) followed by its "
            "Socratic question line prefixed with '   → ', then a closing line. "
            "When valid: an approval line plus a 'Summary: ...' line."
        ),
    )


# ---------------------------------------------------------------------------
# Persona Simulator (Cold Start) — synthetic interactions.
# ---------------------------------------------------------------------------


class SimulatedInteraction(BaseModel):
    """A single synthetic interaction generated for a persona."""

    productId: str = Field(
        description="The id of the product, chosen from the provided catalog."
    )
    eventType: Literal["view", "click", "cart_add", "purchase"] = Field(
        description=(
            "The interaction type: 'view', 'click', 'cart_add', or 'purchase'. "
            "Keep the funnel realistic (more views than clicks, more clicks than "
            "cart_adds, more cart_adds than purchases)."
        )
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="How likely this persona is to perform this action, from 0.0 to 1.0.",
    )
    reasoning: str = Field(
        description=(
            "Brief reasoning explaining why this persona would interact with this "
            "product, grounded in the persona's preferences and the catalog."
        )
    )


class PersonaSimOutput(BaseModel):
    """Structured output for the Persona Simulator agent."""

    interactions: list[SimulatedInteraction] = Field(
        default_factory=list,
        description="The synthetic interactions this persona would have with the catalog.",
    )
    summary: str = Field(
        description=(
            "A brief summary of the simulation, e.g. counts of views/clicks/"
            "cart_adds/purchases."
        )
    )
