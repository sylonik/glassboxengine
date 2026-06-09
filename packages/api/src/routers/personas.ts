import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { personas, syntheticInteractions, products } from "@glassbox/database/schema";
import type { PersonaBehaviorConfig } from "@glassbox/database";
import {
  runPersonaSimulatorAgent,
  generateBehaviorFromDescription,
} from "@glassbox/agents";
import { ensureProject, resolveProject } from "../project_utils";
import { createTRPCRouter, protectedProcedure } from "./trpc";

export const personasRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      return ctx.db
        .select()
        .from(personas)
        .where(
          and(
            eq(personas.userId, ctx.user.id),
            eq(personas.projectId, project.id)
          )
        )
        .orderBy(desc(personas.updatedAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);

      // If description is provided, use AI to generate a realistic behaviorConfig
      const defaultConfig: PersonaBehaviorConfig = {
        browsingPatterns: ["discovery", "comparison"],
        priceRange: { min: 0, max: 500 },
        categoryPreferences: [],
        engagementLevel: "medium",
      };

      const behaviorConfig: PersonaBehaviorConfig = input.description?.trim()
        ? await generateBehaviorFromDescription(input.description.trim())
        : defaultConfig;

      const result = await ctx.db
        .insert(personas)
        .values({
          userId: ctx.user.id,
          projectId: project.id,
          name: input.name,
          description: input.description,
          behaviorConfig,
        })
        .returning();

      return result[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        behaviorConfig: z
          .object({
            browsingPatterns: z.array(z.string()),
            priceRange: z.object({ min: z.number(), max: z.number() }),
            categoryPreferences: z.array(z.string()),
            engagementLevel: z.enum(["low", "medium", "high"]),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(personas)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.behaviorConfig !== undefined && {
            behaviorConfig: input.behaviorConfig,
          }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(personas.id, input.id), eq(personas.userId, ctx.user.id))
        )
        .returning();

      return result[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Synthetic interactions cascade-delete via FK
      await ctx.db
        .delete(personas)
        .where(
          and(eq(personas.id, input.id), eq(personas.userId, ctx.user.id))
        );

      return { deleted: true };
    }),

  simulate: protectedProcedure
    .input(
      z.object({
        personaId: z.string().uuid(),
        projectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);

      // Clear previous simulation data for this persona
      await ctx.db
        .delete(syntheticInteractions)
        .where(eq(syntheticInteractions.personaId, input.personaId));

      const result = await runPersonaSimulatorAgent(
        input.personaId,
        ctx.user.id,
        project.id
      );

      return {
        interactionCount: result.interactions.length,
        summary: result.summary,
        interactions: result.interactions,
      };
    }),

  getSimulationResults: protectedProcedure
    .input(z.object({ personaId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const interactions = await ctx.db
        .select({
          id: syntheticInteractions.id,
          productId: syntheticInteractions.productId,
          productName: products.name,
          productCategory: products.category,
          interactionType: syntheticInteractions.interactionType,
          confidence: syntheticInteractions.confidence,
          reasoning: syntheticInteractions.reasoning,
          createdAt: syntheticInteractions.createdAt,
        })
        .from(syntheticInteractions)
        .leftJoin(products, eq(syntheticInteractions.productId, products.id))
        .where(
          and(
            eq(syntheticInteractions.personaId, input.personaId),
            eq(syntheticInteractions.userId, ctx.user.id)
          )
        )
        .orderBy(desc(syntheticInteractions.createdAt));

      return interactions;
    }),

  generateBehaviorConfig: protectedProcedure
    .input(z.object({ description: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return generateBehaviorFromDescription(input.description);
    }),
});
