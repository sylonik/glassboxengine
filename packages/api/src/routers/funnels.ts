import { z } from "zod";
import { and, eq, asc } from "drizzle-orm";
import { funnels, funnelSteps } from "@glassbox/database/schema";
import { getClickHouseClient } from "@glassbox/event-pipeline";
import { resolveProject } from "../project_utils";
import { createTRPCRouter, protectedProcedure } from "./trpc";

const funnelStepInput = z.object({
  label: z.string().min(1),
  matchField: z.enum(["event_name", "page_path"]),
  matchValue: z.string().min(1),
  stepOrder: z.number().int().min(1),
});

export const funnelsRouter = createTRPCRouter({
  /** List all funnels for the active project */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const allFunnels = await ctx.db
        .select()
        .from(funnels)
        .where(
          and(
            eq(funnels.userId, ctx.user.id),
            eq(funnels.projectId, project.id)
          )
        )
        .orderBy(asc(funnels.createdAt));

      const result = await Promise.all(
        allFunnels.map(async (funnel) => {
          const steps = await ctx.db
            .select()
            .from(funnelSteps)
            .where(eq(funnelSteps.funnelId, funnel.id))
            .orderBy(asc(funnelSteps.stepOrder));
          return { ...funnel, steps };
        })
      );

      return result;
    }),

  /** Get a single funnel with its steps */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(funnels)
        .where(
          and(eq(funnels.id, input.id), eq(funnels.userId, ctx.user.id))
        )
        .limit(1);

      const funnel = result[0];
      if (!funnel) throw new Error("Funnel not found");

      const steps = await ctx.db
        .select()
        .from(funnelSteps)
        .where(eq(funnelSteps.funnelId, funnel.id))
        .orderBy(asc(funnelSteps.stepOrder));

      return { ...funnel, steps };
    }),

  /** Create a funnel with steps */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        steps: z.array(funnelStepInput).min(2).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input.projectId);
      if (!project) throw new Error("No active project");

      const created = await ctx.db
        .insert(funnels)
        .values({
          userId: ctx.user.id,
          projectId: project.id,
          name: input.name,
          description: input.description,
        })
        .returning();

      const funnel = created[0]!;

      await ctx.db.insert(funnelSteps).values(
        input.steps.map((step) => ({
          funnelId: funnel.id,
          stepOrder: step.stepOrder,
          matchField: step.matchField,
          matchValue: step.matchValue,
          label: step.label,
        }))
      );

      const steps = await ctx.db
        .select()
        .from(funnelSteps)
        .where(eq(funnelSteps.funnelId, funnel.id))
        .orderBy(asc(funnelSteps.stepOrder));

      return { ...funnel, steps };
    }),

  /** Update a funnel's name/description and replace its steps */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        steps: z.array(funnelStepInput).min(2).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(funnels)
        .where(
          and(eq(funnels.id, input.id), eq(funnels.userId, ctx.user.id))
        )
        .limit(1);

      if (!existing[0]) throw new Error("Funnel not found");

      await ctx.db
        .update(funnels)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          updatedAt: new Date(),
        })
        .where(eq(funnels.id, input.id));

      if (input.steps) {
        // Delete old steps and insert new ones
        await ctx.db
          .delete(funnelSteps)
          .where(eq(funnelSteps.funnelId, input.id));

        await ctx.db.insert(funnelSteps).values(
          input.steps.map((step) => ({
            funnelId: input.id,
            stepOrder: step.stepOrder,
            matchField: step.matchField,
            matchValue: step.matchValue,
            label: step.label,
          }))
        );
      }

      const steps = await ctx.db
        .select()
        .from(funnelSteps)
        .where(eq(funnelSteps.funnelId, input.id))
        .orderBy(asc(funnelSteps.stepOrder));

      const updated = await ctx.db
        .select()
        .from(funnels)
        .where(eq(funnels.id, input.id))
        .limit(1);

      return { ...updated[0]!, steps };
    }),

  /** Delete a funnel (steps cascade) */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(funnels)
        .where(
          and(eq(funnels.id, input.id), eq(funnels.userId, ctx.user.id))
        )
        .limit(1);

      if (!existing[0]) throw new Error("Funnel not found");

      await ctx.db.delete(funnels).where(eq(funnels.id, input.id));
      return { ok: true };
    }),

  /**
   * Analyze a funnel using ClickHouse's windowFunnel() function.
   * Returns step-by-step counts and conversion rates.
   */
  analyze: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        days: z.number().int().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      // Load funnel definition from Postgres
      const funnelResult = await ctx.db
        .select()
        .from(funnels)
        .where(
          and(eq(funnels.id, input.id), eq(funnels.userId, ctx.user.id))
        )
        .limit(1);

      const funnel = funnelResult[0];
      if (!funnel) throw new Error("Funnel not found");

      const steps = await ctx.db
        .select()
        .from(funnelSteps)
        .where(eq(funnelSteps.funnelId, funnel.id))
        .orderBy(asc(funnelSteps.stepOrder));

      if (steps.length < 2) {
        return { funnel, steps: [], totalSessions: 0 };
      }

      // Build windowFunnel conditions from step definitions
      const conditions = steps.map((step) => {
        const field = step.matchField === "page_path" ? "page_path" : "event_name";
        // Use parameterized values is not possible with windowFunnel conditions,
        // but matchField is constrained to enum and matchValue is escaped
        const escaped = step.matchValue.replace(/'/g, "\\'");
        return `${field} = '${escaped}'`;
      });

      const since = new Date(Date.now() - input.days * 86_400_000);

      const query = `
        SELECT
            level,
            count() AS sessions
        FROM (
            SELECT
                session_id,
                windowFunnel(${input.days * 86400})(
                    toDateTime(created_at),
                    ${conditions.join(",\n                    ")}
                ) AS level
            FROM glassbox.website_events
            WHERE project_id = {projectId:UUID}
              AND created_at >= {since:DateTime64(3)}
            GROUP BY session_id
        )
        GROUP BY level
        ORDER BY level
      `;

      const client = getClickHouseClient();
      const result = await client.query({
        query,
        query_params: {
          projectId: funnel.projectId,
          // ClickHouse's default DateTime64 parser rejects the ISO "T"/"Z"
          // ("only 23 of 24 bytes parsed"). Match the format the rest of the
          // codebase uses (persona-builder / website-analytics).
          since: since.toISOString().replace("T", " ").replace("Z", ""),
        },
        clickhouse_settings: { date_time_input_format: "best_effort" },
        format: "JSONEachRow",
      });

      const rows = await result.json<{ level: number; sessions: string }>();

      // Convert windowFunnel output to step-by-step counts
      // windowFunnel returns: level 0 = reached no steps, level 1 = reached step 1, etc.
      // We need cumulative counts: how many sessions reached AT LEAST step N
      const levelCounts = new Map<number, number>();
      for (const row of rows) {
        levelCounts.set(Number(row.level), Number(row.sessions));
      }

      const totalSessions = rows.reduce((sum, r) => sum + Number(r.sessions), 0);

      // Calculate cumulative: sessions reaching at least step N
      const stepResults = steps.map((step, i) => {
        const stepLevel = i + 1;
        // Sessions that reached at least this level
        let reached = 0;
        for (const [level, count] of levelCounts) {
          if (level >= stepLevel) reached += count;
        }
        return {
          ...step,
          reached,
          conversionFromPrevious:
            i === 0
              ? totalSessions > 0
                ? reached / totalSessions
                : 0
              : 0, // will be calculated below
          conversionFromFirst: totalSessions > 0 ? reached / totalSessions : 0,
        };
      });

      // Calculate step-to-step conversion
      for (let i = 1; i < stepResults.length; i++) {
        const prev = stepResults[i - 1]!.reached;
        stepResults[i]!.conversionFromPrevious =
          prev > 0 ? stepResults[i]!.reached / prev : 0;
      }

      return {
        funnel: { id: funnel.id, name: funnel.name },
        steps: stepResults,
        totalSessions,
      };
    }),
});
