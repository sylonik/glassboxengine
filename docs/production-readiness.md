# Production Readiness

This checklist captures what is already verified in-repo, what command to run for recommendation quality, and what still requires real project data.

## 1. Core repo health

Run these from the repository root:

```bash
pnpm test
pnpm build
pnpm e2e
```

What this proves:

- unit and integration coverage is green
- production builds compile successfully
- the web onboarding and dashboard flow still works end to end

## 2. Recommendation quality with built-in fixtures

Run:

```bash
pnpm -F @glassbox/agents eval:report --json-out ../../artifacts/recommendation-eval-fixtures.json
```

Success criteria:

- report exits successfully
- `Release gates: PASS`
- artifact is written to `artifacts/recommendation-eval-fixtures.json`

## 3. Recommendation quality with portable feedback export

If you already have a JSON export:

```bash
pnpm -F @glassbox/agents eval:run-feedback-export --input <feedback-export.json> --out-dir ../../artifacts/recommendation-eval-real
```

Artifacts produced:

- `recommendation-eval.dataset.json`
- `recommendation-eval.report.json`
- `recommendation-eval.report.txt`
- `recommendation-eval.summary.json`

Success criteria:

- command exits successfully
- `releaseGatesPassed` is `true` in `recommendation-eval.summary.json`

## 4. Export from live database first

If you need to generate the portable export from a live project:

```bash
DATABASE_URL=postgresql://... pnpm -F @glassbox/agents eval:export-feedback --project-id <project-uuid> --days 90 --out ../../artifacts/recommendation-feedback-export.json
pnpm -F @glassbox/agents eval:run-feedback-export --input ../../artifacts/recommendation-feedback-export.json --out-dir ../../artifacts/recommendation-eval-real
```

What this proves:

- recommendation quality is being measured from actual project interaction history
- the same report can be handed to another operator without direct DB access

## 5. Final external proof still required

The codebase is ready for the final validation step, but this cannot be proven from repo checks alone:

- run the export or DB-backed evaluation against a real project
- inspect the resulting `recommendation-eval.summary.json`
- confirm the output meets your business threshold for relevance, diversity, and confidence

Until that real-data evaluation is executed, the system is technically production-ready but not fully quality-proven on live behavior.
