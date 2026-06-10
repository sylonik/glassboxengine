# ruff: noqa
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

from google.adk.apps import App

from app.glassbox.agents import build_coordinator

# GlassBox multi-agent system: a Coordinator root agent (no output_schema) routes
# by a JSON `task` field to four specialized sub-agents:
#   task "reason"    -> reasoner_agent           (Explainability)
#   task "mentor"    -> mentor_agent             (Education: review fresh code)
#   task "tutor"     -> tutor_agent              (Education: dialogue follow-up)
#   task "simulate"  -> persona_simulator_agent  (Cold Start)
#   task "architect" -> architect_pipeline       (Logic Drift / goal alignment)
# Leaves carry a Pydantic output_schema for structured JSON output. The architect
# is a SequentialAgent: a tool-using planner (translate_slider_config — the exact
# production slider math) followed by a schema-enforced formatter.
root_agent = build_coordinator()

app = App(
    root_agent=root_agent,
    name="app",
)
