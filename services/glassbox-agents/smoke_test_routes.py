"""Smoke-test the deployed GlassBox Agent Engine for the new routes.

Verifies task="architect" (Logic Drift) and task="mentor_chat" (Education)
return schema-valid JSON, plus a baseline task="mentor". Run with ADC:
    python smoke_test_routes.py
"""

import json

import vertexai
from vertexai import agent_engines

RESOURCE = "projects/573736938351/locations/us-east1/reasoningEngines/617732020763623424"
USER = "smoke-test"

vertexai.init(project="glassbox-engine", location="us-east1")
engine = agent_engines.get(RESOURCE)


def run(task_payload: dict) -> str:
    session = engine.create_session(user_id=USER)
    final = ""
    for event in engine.stream_query(
        message=json.dumps(task_payload),
        user_id=USER,
        session_id=session["id"],
    ):
        for part in event.get("content", {}).get("parts", []):
            if part.get("text"):
                final = part["text"]
    return final


CASES = {
    "architect": {
        "task": "architect",
        "goal": "Push our new arrivals this month but keep the feed relevant.",
        "currentSliders": {
            "relevance": 0.7,
            "diversity": 0.4,
            "novelty": 0.3,
            "popularity": 0.6,
        },
        "catalogSummary": {
            "productCount": 24,
            "categories": [
                {"name": "Electronics", "count": 4},
                {"name": "Home", "count": 4},
            ],
        },
    },
    "mentor_chat": {
        "task": "mentor_chat",
        "code": "function score(ctx){ return ctx.similarity / ctx.maxViews; }",
        "transcript": [
            "I reviewed this scorer and found issues we should fix before committing:",
            "\U0001f534 Division by ctx.maxViews can divide by zero.",
            "   → What happens to the score when the catalog is empty?",
        ],
        "message": "maxViews can be 0 on an empty catalog, so it divides by zero and returns NaN.",
    },
    "mentor": {
        "task": "mentor",
        "code": "function score(ctx){ return Math.min(ctx.similarity, 1); }",
    },
}

EXPECTED_KEYS = {
    "architect": {"profileName", "sliders", "rationale"},
    "mentor_chat": {"reply", "readyToCommit"},
    "mentor": {"isValid", "issues", "dialogue"},
}

for name, payload in CASES.items():
    print(f"\n=== {name} ===")
    try:
        text = run(payload)
        # Tolerate prose/fences around the JSON.
        start, end = text.find("{"), text.rfind("}")
        parsed = json.loads(text[start : end + 1]) if start != -1 else {}
        keys = EXPECTED_KEYS[name]
        ok = keys.issubset(parsed.keys())
        print(f"  {'PASS' if ok else 'FAIL'} — keys present: {sorted(parsed.keys())[:6]}")
        if name == "architect" and ok:
            print(f"  proposed sliders: {parsed.get('sliders')}")
        if name == "mentor_chat" and ok:
            print(f"  readyToCommit: {parsed.get('readyToCommit')}")
    except Exception as exc:  # noqa: BLE001
        print(f"  ERROR: {type(exc).__name__}: {exc}")
