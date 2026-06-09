import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "./trpc";
import {
  apiKeys,
  auditLogs,
  feedbackEvents,
  intentProfiles,
  personas,
  products,
  projects,
  scoringFunctions,
} from "@glassbox/database/schema";
import {
  createDemoEmbedding,
  demoAuditLogs,
  demoProducts,
  demoScoringCode,
} from "../demo_data";
import {
  ensureProject,
  getActiveProject,
  getOwnedProject,
  setActiveProjectPreference,
} from "../project_utils";

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.updatedAt));
  }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    return getActiveProject(ctx);
  }),

  setActive: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx, input.projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      await setActiveProjectPreference(ctx, project.id);
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Project name is required"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(projects)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
        })
        .returning();

      if (result[0]) {
        await setActiveProjectPreference(ctx, result[0].id);
      }

      return result[0];
    }),

  delete: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx, input.projectId);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Never let a user delete their only workspace — the dashboard assumes one.
      const owned = await ctx.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, ctx.user.id))
        .orderBy(desc(projects.updatedAt));
      if (owned.length <= 1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "You can't delete your only project. Create another first.",
        });
      }

      // All child rows cascade on the projects FK; user_project_preferences
      // .active_project_id is ON DELETE SET NULL.
      await ctx.db
        .delete(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );

      // Repoint the active project to the next most-recent remaining one.
      const nextActive = owned.find((p) => p.id !== input.projectId);
      if (nextActive) {
        await setActiveProjectPreference(ctx, nextActive.id);
      }

      return { deleted: true, activeProjectId: nextActive?.id ?? null };
    }),

  getSetupState: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = input?.projectId
        ? await getOwnedProject(ctx, input.projectId)
        : await getActiveProject(ctx);

      if (!project) {
        return {
          project: null,
          complete: false,
          currentStep: "project",
          counts: {
            products: 0,
            embeddedProducts: 0,
            profiles: 0,
            committedScorers: 0,
            personas: 0,
            auditLogs: 0,
            activeApiKeys: 0,
            feedbackEvents: 0,
          },
          steps: {
            project: false,
            catalog: false,
            embeddings: false,
            scorer: false,
            alignment: false,
            personas: false,
            deploy: false,
            feedback: false,
            analytics: false,
          },
        };
      }

      const [
        productCount,
        embeddedCount,
        profileCount,
        committedScorerCount,
        personaCount,
        auditLogCount,
        activeApiKeyCount,
        feedbackEventCount,
      ] = await Promise.all([
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(
            and(
              eq(products.userId, ctx.user.id),
              eq(products.projectId, project.id)
            )
          ),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(
            and(
              eq(products.userId, ctx.user.id),
              eq(products.projectId, project.id),
              sql`${products.embedding} IS NOT NULL`
            )
          ),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(intentProfiles)
          .where(
            and(
              eq(intentProfiles.userId, ctx.user.id),
              eq(intentProfiles.projectId, project.id)
            )
          ),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(scoringFunctions)
          .where(
            and(
              eq(scoringFunctions.userId, ctx.user.id),
              eq(scoringFunctions.projectId, project.id),
              eq(scoringFunctions.isCommitted, true)
            )
          ),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(personas)
          .where(
            and(
              eq(personas.userId, ctx.user.id),
              eq(personas.projectId, project.id)
            )
          ),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.userId, ctx.user.id),
              eq(auditLogs.projectId, project.id)
            )
          ),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(apiKeys)
          .where(
            and(
              eq(apiKeys.userId, ctx.user.id),
              eq(apiKeys.projectId, project.id),
              isNull(apiKeys.revokedAt)
            )
          ),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(feedbackEvents)
          .where(
            and(
              eq(feedbackEvents.userId, ctx.user.id),
              eq(feedbackEvents.projectId, project.id)
            )
          ),
      ]);

      const counts = {
        products: Number(productCount[0]?.count ?? 0),
        embeddedProducts: Number(embeddedCount[0]?.count ?? 0),
        profiles: Number(profileCount[0]?.count ?? 0),
        committedScorers: Number(committedScorerCount[0]?.count ?? 0),
        personas: Number(personaCount[0]?.count ?? 0),
        auditLogs: Number(auditLogCount[0]?.count ?? 0),
        activeApiKeys: Number(activeApiKeyCount[0]?.count ?? 0),
        feedbackEvents: Number(feedbackEventCount[0]?.count ?? 0),
      };

      const steps = {
        project: true,
        catalog: counts.products > 0,
        embeddings:
          counts.products > 0 && counts.embeddedProducts === counts.products,
        scorer: counts.committedScorers > 0,
        alignment: counts.profiles > 0 && counts.auditLogs > 0,
        personas: counts.personas > 0,
        deploy: counts.activeApiKeys > 0,
        feedback: counts.feedbackEvents > 0,
        analytics: counts.feedbackEvents > 0 || counts.auditLogs > 0,
      };

      const currentStep =
        (Object.entries(steps).find(([, complete]) => !complete)?.[0] as
          | keyof typeof steps
          | undefined) ?? "complete";

      return {
        project,
        complete: Object.values(steps).every(Boolean),
        currentStep,
        counts,
        steps,
      };
    }),

  seedDemo: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        projectName: z.string().trim().min(1).default("Demo Commerce Project"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = input.projectId
        ? await ensureProject(ctx, input.projectId)
        : (
            await ctx.db
              .insert(projects)
              .values({
                userId: ctx.user.id,
                name: input.projectName,
                description:
                  "Demo data for testing catalog, alignment, scoring, and glass box audit workflows.",
                metadata: { demo: true },
              })
              .returning()
          )[0]!;

      await setActiveProjectPreference(ctx, project.id);

      const existingProducts = await ctx.db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.userId, ctx.user.id),
            eq(products.projectId, project.id)
          )
        )
        .limit(1);

      if (existingProducts.length > 0) {
        return {
          project,
          seeded: false,
          products: 0,
          message: "Project already has catalog data.",
        };
      }

      const seededProducts = await ctx.db
        .insert(products)
        .values(
          demoProducts.map((product) => ({
            ...product,
            externalId: `${project.id}-${product.externalId}`,
            userId: ctx.user.id,
            projectId: project.id,
            embedding: createDemoEmbedding(
              `${product.name}. ${product.description ?? ""}. ${product.category ?? ""}`
            ),
          }))
        )
        .returning();

      await ctx.db.insert(intentProfiles).values({
        userId: ctx.user.id,
        projectId: project.id,
        name: "Balanced Demo Profile",
        sliders: {
          relevance: 0.7,
          diversity: 0.45,
          novelty: 0.35,
          popularity: 0.55,
        },
        isActive: true,
      });

      await ctx.db.insert(scoringFunctions).values({
        userId: ctx.user.id,
        projectId: project.id,
        name: "Demo Commerce Scorer",
        description:
          "Starter scorer that blends semantic relevance with merchandising signals.",
        code: demoScoringCode,
        isCommitted: true,
        version: 1,
        mentorFeedback: {
          approved: true,
          issues: [],
          reviewedAt: new Date().toISOString(),
        },
      });

      await ctx.db.insert(personas).values([
        {
          userId: ctx.user.id,
          projectId: project.id,
          name: "Pragmatic Tech Buyer",
          description:
            "Compares quality, durability, and proof points before purchasing higher-ticket items.",
          behaviorConfig: {
            browsingPatterns: ["comparison", "reviews", "specification_depth"],
            priceRange: { min: 80, max: 700 },
            categoryPreferences: ["Electronics", "Software", "Furniture"],
            engagementLevel: "high",
          },
          simulationResults: {
            preferredItems: ["Wireless Noise-Cancelling Headphones", "AI Code Assistant Subscription"],
          },
        },
        {
          userId: ctx.user.id,
          projectId: project.id,
          name: "Lifestyle Explorer",
          description:
            "Responds to novelty, home improvement, food discovery, and visually distinct products.",
          behaviorConfig: {
            browsingPatterns: ["discovery", "save_for_later", "category_browsing"],
            priceRange: { min: 20, max: 180 },
            categoryPreferences: ["Food & Beverage", "Home & Garden", "Kitchen"],
            engagementLevel: "medium",
          },
          simulationResults: {
            preferredItems: ["Smart Indoor Garden Kit", "Artisan Sourdough Starter Kit"],
          },
        },
      ]);

      const traceId = `demo-${project.id}`;
      await ctx.db.insert(auditLogs).values(
        demoAuditLogs.map((log) => ({
          ...log,
          userId: ctx.user.id,
          projectId: project.id,
          traceId,
        }))
      );

      await ctx.db
        .update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, project.id));

      return {
        project,
        seeded: true,
        products: seededProducts.length,
        message: "Demo project is ready.",
      };
    }),
});
