import { and, eq, sql } from "drizzle-orm";
import { db } from "@glassbox/database/client";
import { personas, auditLogs } from "@glassbox/database/schema";
import type { PersonaBehaviorConfig } from "@glassbox/database";
import { generateEmbedding } from "./embedding-generator";
import { genai, DEFAULT_MODEL } from "./config";

/**
 * Minimal structural type for the ClickHouse client's `query` method.
 *
 * The `@glassbox/agents` package intentionally does NOT depend on
 * `@glassbox/event-pipeline` / `@clickhouse/client`. To read real website
 * events from ClickHouse without coupling the dependency graph, the caller
 * (the API router, which already depends on the event pipeline) injects the
 * ClickHouse client. This type captures only the surface we use:
 *
 *   const result = await client.query({ query, query_params, format: "JSONEachRow" });
 *   const rows = await result.json<RowType>();
 */
export interface ClickHouseResultSet {
  /**
   * The real `@clickhouse/client` types `json<T>()` as
   * `T[] | ResponseJSON<T> | Record<string, T>` because the shape depends on
   * the requested format. We type it as `unknown` here so the concrete client
   * is structurally assignable without depending on `@clickhouse/client`, then
   * normalize via `rowsFromResult`. We only ever use the `JSONEachRow` format,
   * which returns `T[]` at runtime.
   */
  json(): Promise<unknown>;
}

export interface ClickHouseQueryClient {
  query(params: {
    query: string;
    query_params?: Record<string, unknown>;
    format?: string;
  }): Promise<ClickHouseResultSet>;
}

/** Normalize a `JSONEachRow` result to a plain array of rows. */
async function rowsFromResult<T>(result: ClickHouseResultSet): Promise<T[]> {
  const value = await result.json();
  if (Array.isArray(value)) return value as T[];
  // `JSON`/`JSONCompact` formats wrap rows under `.data`; we only use
  // `JSONEachRow` (array), but normalize defensively.
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }
  return [];
}

const ALLOWED_PATTERNS = [
  "discovery",
  "comparison",
  "deal_hunting",
  "research",
  "impulse",
  "brand_loyal",
  "seasonal",
] as const;

export interface BuildPersonasResult {
  usersAnalyzed: number;
  personasCreated: number;
  personas: Array<{
    id: string;
    name: string;
    description: string;
    userKey: string;
    eventCount: number;
    behaviorConfig: PersonaBehaviorConfig;
  }>;
}

/** Per-user aggregate row returned by the funnel query. */
interface UserAggregateRow {
  user_key: string;
  event_count: string;
  sessions: string;
  views: string;
  carts: string;
  purchases: string;
  min_price: string;
  max_price: string;
  avg_price: string;
}

/** Per-user/category row returned by the category query. */
interface CategoryRow {
  user_key: string;
  category: string;
  c: string;
}

interface AnalyzedUser {
  userKey: string;
  eventCount: number;
  sessions: number;
  views: number;
  carts: number;
  purchases: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  categories: string[];
}

/** Marker stored in personas.simulationResults to flag auto-built personas. */
interface EventsMarker {
  source: "events";
  userKey: string;
  eventCount: number;
  sessions: number;
  funnel: { views: number; carts: number; purchases: number };
  builtAt: string;
}

/**
 * Build personas from REAL tracked website events.
 *
 * Reads `glassbox.website_events` from ClickHouse for the project within a
 * lookback window, groups events by user (user_id or anonymous_id), derives a
 * deterministic behavior profile per qualifying user, optionally polishes the
 * name/description with the LLM and generates a preference embedding
 * (best-effort), then replaces any previously auto-built personas and inserts
 * new ones. Provenance is recorded in `simulationResults` so the UI can show a
 * "From real events" badge plus the underlying funnel stats.
 *
 * The ClickHouse client is injected so this package does not need to depend on
 * `@glassbox/event-pipeline` / `@clickhouse/client`.
 */
export async function buildPersonasFromEvents(params: {
  /** Owning glassbox user (ctx.user.id). */
  userId: string;
  /** Project scope. */
  projectId: string;
  /** How far back to look, in days. Default 30. */
  lookbackDays?: number;
  /** Minimum events for a user to qualify. Default 3. */
  minEvents?: number;
  /** Maximum personas to create. Default 12. */
  maxPersonas?: number;
  /** Injected ClickHouse client (from the event pipeline). */
  clickhouse: ClickHouseQueryClient;
}): Promise<BuildPersonasResult> {
  const {
    userId,
    projectId,
    lookbackDays = 30,
    minEvents = 3,
    maxPersonas = 12,
    clickhouse,
  } = params;

  const since = new Date(Date.now() - lookbackDays * 86_400_000);
  // ClickHouse's default date_time_input_format rejects ISO-8601's `T`/`Z`
  // (parses only 23 of 24 bytes) when binding a {since:DateTime64(3)} param.
  // The value is already UTC, so emit `YYYY-MM-DD HH:MM:SS.sss`.
  const sinceIso = since.toISOString().replace("T", " ").replace("Z", "");

  // 1a. Per-user funnel + price aggregates.
  const aggregateResult = await clickhouse.query({
    query: `
      SELECT
          if(user_id = '', anonymous_id, user_id)               AS user_key,
          count()                                               AS event_count,
          uniqExact(session_id)                                 AS sessions,
          countIf(event_name = 'product_view')                  AS views,
          countIf(event_name = 'add_to_cart')                   AS carts,
          countIf(event_name = 'purchase')                      AS purchases,
          minIf(JSONExtractFloat(properties, 'price'),
                JSONExtractFloat(properties, 'price') > 0)       AS min_price,
          maxIf(JSONExtractFloat(properties, 'price'),
                JSONExtractFloat(properties, 'price') > 0)       AS max_price,
          avgIf(JSONExtractFloat(properties, 'price'),
                JSONExtractFloat(properties, 'price') > 0)       AS avg_price
      FROM glassbox.website_events
      WHERE project_id = {projectId:UUID}
        AND created_at >= {since:DateTime64(3)}
      GROUP BY user_key
      HAVING event_count >= {minEvents:UInt32}
      ORDER BY event_count DESC
      LIMIT {maxPersonas:UInt32}
    `,
    query_params: {
      projectId,
      since: sinceIso,
      minEvents,
      maxPersonas,
    },
    format: "JSONEachRow",
  });
  const aggregateRows = await rowsFromResult<UserAggregateRow>(aggregateResult);

  if (aggregateRows.length === 0) {
    // Still clear stale auto-built personas so the UI reflects "no real traffic".
    await deleteAutoBuiltPersonas(userId, projectId);
    await logBuild(userId, projectId, 0, 0);
    return { usersAnalyzed: 0, personasCreated: 0, personas: [] };
  }

  const qualifyingKeys = aggregateRows.map((row) => row.user_key);

  // 1b. Top categories per qualifying user (grouped, picked top-3 in TS).
  const categoryResult = await clickhouse.query({
    query: `
      SELECT
          if(user_id = '', anonymous_id, user_id)        AS user_key,
          JSONExtractString(properties, 'category')      AS category,
          count()                                        AS c
      FROM glassbox.website_events
      WHERE project_id = {projectId:UUID}
        AND created_at >= {since:DateTime64(3)}
        AND JSONExtractString(properties, 'category') != ''
        AND if(user_id = '', anonymous_id, user_id) IN ({userKeys:Array(String)})
      GROUP BY user_key, category
      ORDER BY user_key, c DESC
    `,
    query_params: {
      projectId,
      since: sinceIso,
      userKeys: qualifyingKeys,
    },
    format: "JSONEachRow",
  });
  const categoryRows = await rowsFromResult<CategoryRow>(categoryResult);

  const categoriesByUser = new Map<string, string[]>();
  for (const row of categoryRows) {
    const list = categoriesByUser.get(row.user_key) ?? [];
    if (list.length < 3) list.push(row.category);
    categoriesByUser.set(row.user_key, list);
  }

  const analyzed: AnalyzedUser[] = aggregateRows.map((row) => ({
    userKey: row.user_key,
    eventCount: Number(row.event_count) || 0,
    sessions: Number(row.sessions) || 0,
    views: Number(row.views) || 0,
    carts: Number(row.carts) || 0,
    purchases: Number(row.purchases) || 0,
    minPrice: Number(row.min_price) || 0,
    maxPrice: Number(row.max_price) || 0,
    avgPrice: Number(row.avg_price) || 0,
    categories: categoriesByUser.get(row.user_key) ?? [],
  }));

  // 2. Derive a behavior profile + name/description per user.
  const builtAt = new Date().toISOString();
  const drafts = await Promise.all(
    analyzed.map(async (user) => {
      const behaviorConfig = deriveBehaviorConfig(user);
      let name = deriveName(user);
      let description = deriveDescription(user);

      // Best-effort LLM polish — never let failure break the build.
      try {
        const polished = await polishWithLlm(user, behaviorConfig);
        if (polished?.name) name = polished.name;
        if (polished?.description) description = polished.description;
      } catch {
        // keep deterministic values
      }

      // Best-effort embedding — column is nullable, so leave undefined on error.
      let preferenceVector: number[] | undefined;
      try {
        const preferenceText = buildPreferenceText(user, behaviorConfig, name);
        preferenceVector = await generateEmbedding(preferenceText);
      } catch {
        preferenceVector = undefined;
      }

      const marker: EventsMarker = {
        source: "events",
        userKey: user.userKey,
        eventCount: user.eventCount,
        sessions: user.sessions,
        funnel: {
          views: user.views,
          carts: user.carts,
          purchases: user.purchases,
        },
        builtAt,
      };

      return { user, behaviorConfig, name, description, preferenceVector, marker };
    })
  );

  // 3. Idempotency: remove previously auto-built personas before inserting.
  await deleteAutoBuiltPersonas(userId, projectId);

  // 4. Insert the new personas.
  const inserted = await db
    .insert(personas)
    .values(
      drafts.map((draft) => ({
        userId,
        projectId,
        name: draft.name,
        description: draft.description,
        behaviorConfig: draft.behaviorConfig,
        simulationResults: draft.marker,
        ...(draft.preferenceVector
          ? { preferenceVector: draft.preferenceVector }
          : {}),
      }))
    )
    .returning({ id: personas.id });

  const resultPersonas = drafts.map((draft, i) => ({
    id: inserted[i]?.id ?? "",
    name: draft.name,
    description: draft.description,
    userKey: draft.user.userKey,
    eventCount: draft.user.eventCount,
    behaviorConfig: draft.behaviorConfig,
  }));

  // 5. Audit log (best effort).
  await logBuild(userId, projectId, analyzed.length, resultPersonas.length);

  return {
    usersAnalyzed: analyzed.length,
    personasCreated: resultPersonas.length,
    personas: resultPersonas,
  };
}

/** Deterministically derive a PersonaBehaviorConfig from observed behavior. */
function deriveBehaviorConfig(user: AnalyzedUser): PersonaBehaviorConfig {
  const categoryPreferences = user.categories.slice(0, 3);

  const priceRange =
    user.maxPrice > 0
      ? {
          min: Math.max(0, Math.floor(user.minPrice)),
          max: Math.ceil(user.maxPrice),
        }
      : { min: 0, max: 500 };

  const engagementLevel: PersonaBehaviorConfig["engagementLevel"] =
    user.eventCount >= 20 ? "high" : user.eventCount >= 8 ? "medium" : "low";

  // Map funnel signals onto the allowed browsing-pattern vocab.
  const patterns = new Set<string>();
  if (user.purchases > 0) {
    // A completed funnel reads as research-driven intent that converted.
    patterns.add("research");
    if (user.views < 4) patterns.add("impulse");
  }
  if (user.carts > user.purchases && user.carts > 0) patterns.add("comparison");
  if (user.views >= 5 && user.carts <= 1) patterns.add("discovery");
  if (categoryPreferences.length > 1) patterns.add("comparison");
  if (user.avgPrice > 0 && user.avgPrice < 50) patterns.add("deal_hunting");
  if (categoryPreferences.length === 1) patterns.add("brand_loyal");

  // Ensure 2-4 patterns from the allowed vocab.
  let browsingPatterns = Array.from(patterns).filter((p) =>
    (ALLOWED_PATTERNS as readonly string[]).includes(p)
  );
  for (const fallback of ["discovery", "research", "comparison"]) {
    if (browsingPatterns.length >= 2) break;
    if (!browsingPatterns.includes(fallback)) browsingPatterns.push(fallback);
  }
  browsingPatterns = browsingPatterns.slice(0, 4);

  return {
    browsingPatterns,
    priceRange,
    categoryPreferences,
    engagementLevel,
  };
}

/** Budget / Mid-range / Premium tier from average spend. */
function priceTier(avgPrice: number): "Budget" | "Mid-range" | "Premium" {
  if (avgPrice <= 0) return "Mid-range";
  if (avgPrice < 50) return "Budget";
  if (avgPrice < 200) return "Mid-range";
  return "Premium";
}

/** Deterministic persona name template. */
function deriveName(user: AnalyzedUser): string {
  const topCategory = user.categories[0];
  if (!topCategory) return "Casual Shopper";
  const tier = priceTier(user.avgPrice);
  const category = topCategory.charAt(0).toUpperCase() + topCategory.slice(1);
  return `${tier} ${category} Shopper`;
}

/** Deterministic one-sentence description with real stats. */
function deriveDescription(user: AnalyzedUser): string {
  const categories = user.categories.length
    ? user.categories.join(", ")
    : "general browsing";
  const min = Math.max(0, Math.floor(user.minPrice));
  const max = user.maxPrice > 0 ? Math.ceil(user.maxPrice) : 500;
  return `Built from ${user.eventCount} tracked events across ${user.sessions} session(s) — favors ${categories}, typical spend $${min}–$${max}, ${user.purchases} purchase(s).`;
}

/** Text used to generate the preference embedding. */
function buildPreferenceText(
  user: AnalyzedUser,
  behavior: PersonaBehaviorConfig,
  name: string
): string {
  return `Real-traffic persona "${name}". Categories: ${
    behavior.categoryPreferences.join(", ") || "general"
  }. Price range: $${behavior.priceRange.min}-$${behavior.priceRange.max}. Engagement: ${
    behavior.engagementLevel
  }. Funnel: ${user.views} views, ${user.carts} carts, ${user.purchases} purchases across ${user.sessions} sessions.`;
}

/** Best-effort LLM polish of name/description. Returns null on any issue. */
async function polishWithLlm(
  user: AnalyzedUser,
  behavior: PersonaBehaviorConfig
): Promise<{ name?: string; description?: string } | null> {
  const prompt = `You are naming a shopper persona derived from REAL tracked website behavior. Produce a concise, human-friendly name and one-line description.

Observed behavior:
- Events: ${user.eventCount} across ${user.sessions} session(s)
- Funnel: ${user.views} product views, ${user.carts} cart adds, ${user.purchases} purchases
- Categories: ${behavior.categoryPreferences.join(", ") || "general"}
- Price range: $${behavior.priceRange.min}-$${behavior.priceRange.max}
- Engagement: ${behavior.engagementLevel}
- Browsing patterns: ${behavior.browsingPatterns.join(", ")}

Return ONLY valid JSON: { "name": string (<= 4 words), "description": string (one sentence) }`;

  const response = await genai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = response.text ?? "";
  if (!text.trim()) return null;
  const parsed = JSON.parse(text) as { name?: unknown; description?: unknown };
  return {
    name:
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim().split(/\s+/).slice(0, 4).join(" ")
        : undefined,
    description:
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : undefined,
  };
}

/** Delete previously auto-built personas for this (userId, projectId). */
async function deleteAutoBuiltPersonas(
  userId: string,
  projectId: string
): Promise<void> {
  await db
    .delete(personas)
    .where(
      and(
        eq(personas.userId, userId),
        eq(personas.projectId, projectId),
        sql`(simulation_results->>'source') = 'events'`
      )
    );
}

/** Best-effort audit log row summarizing the build. */
async function logBuild(
  userId: string,
  projectId: string,
  usersAnalyzed: number,
  personasCreated: number
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      projectId,
      action: "persona.build_from_events",
      agentName: "PersonaBuilder",
      reasoning: `Analyzed ${usersAnalyzed} real users from tracked events → created ${personasCreated} persona(s).`,
      metadata: { usersAnalyzed, personasCreated },
    });
  } catch {
    // best effort — never block the build on audit logging
  }
}
