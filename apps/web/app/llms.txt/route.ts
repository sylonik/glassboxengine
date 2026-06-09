import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "~/lib/seo";

export const dynamic = "force-static";

// /llms.txt — a concise, machine-readable site map for LLM/answer-engine
// crawlers (generative engine optimization). https://llmstxt.org
export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

GlassBox Engine turns black-box ranking into a glass box: align the reward
function with live intent sliders, pre-warm cold starts with synthetic personas,
and ship a faithful, queryable reasoning trace with every recommendation. Built
on PostgreSQL + pgvector, a typed tRPC SDK, and a multi-agent reasoning layer
(Google ADK + Gemini).

## Pages
- [Home](${SITE_URL}/): Product overview and the four value pillars.
- [Compare](${SITE_URL}/compare): GlassBox vs black-box recommendation engines (Amazon Personalize, Algolia Recommend, Vertex AI, Recombee).
- [Features](${SITE_URL}/features): Explainability, cold start, intent alignment, Socratic mentor.
- [Explainable recommendations](${SITE_URL}/features/explainable-recommendations): Faithful, queryable reasoning traces with per-item score breakdowns.
- [Cold-start personas](${SITE_URL}/features/cold-start-personas): Rank from day zero with synthetic personas.
- [Intent alignment](${SITE_URL}/features/intent-alignment): A reward function you shape with live sliders, compiled to a versioned PolicySpec.
- [Socratic mentor](${SITE_URL}/features/socratic-mentor): An agent that reviews scoring code like a senior engineer.
- [Use cases](${SITE_URL}/use-cases): E-commerce, marketplaces, media & streaming, B2B catalogs.
- [Pricing](${SITE_URL}/pricing): Free to start.
- [FAQ](${SITE_URL}/faq): Common questions about explainability, cold start, and self-hosting.
- [About](${SITE_URL}/about): Mission and the gaps GlassBox closes.
- [Contact](${SITE_URL}/contact): ${CONTACT_EMAIL}

## Contact
Email ${CONTACT_EMAIL}. GlassBox Engine is built by Sylonik (https://sylonik.se).
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
