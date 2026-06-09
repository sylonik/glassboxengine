import { z } from "zod";
import { and, eq, desc, gte } from "drizzle-orm";
import { feedbackEvents, products } from "@glassbox/database/schema";
import {
  enqueueFeedbackEvent,
  enqueueFeedbackEvents,
} from "@glassbox/event-pipeline";
import { resolveProject } from "../project_utils";
import {
  createTRPCRouter,
  protectedProcedure,
  rateLimitedProcedure,
  apiKeyProcedure,
} from "./trpc";

export const feedbackRouter = createTRPCRouter({
  /** Track a user interaction event (called from dashboard or SDK via API key) */
  track: rateLimitedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        endUserId: z.string().min(1),
        productId: z.string().uuid(),
        eventType: z.enum(["view", "click", "cart_add", "purchase"]),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input.projectId);
      if (!project) throw new Error("No active project");

      const result = await ctx.db
        .insert(feedbackEvents)
        .values({
          userId: ctx.user.id,
          projectId: project.id,
          productId: input.productId,
          endUserId: input.endUserId,
          eventType: input.eventType,
          metadata: input.metadata ?? {},
        })
        .returning();

      const row = result[0]!;

      // Dual-write to ClickHouse via async queue (fire-and-forget)
      void enqueueFeedbackEvent({
        id: row.id,
        userId: ctx.user.id,
        projectId: project.id,
        endUserId: input.endUserId,
        productId: input.productId,
        eventType: input.eventType,
        metadata: input.metadata ?? {},
        createdAt: (row.createdAt ?? new Date()).toISOString(),
      });

      return row;
    }),

  sdkTrack: apiKeyProcedure
    .input(
      z.object({
        endUserId: z.string().min(1),
        productId: z.string().uuid(),
        eventType: z.enum(["view", "click", "cart_add", "purchase"]),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(feedbackEvents)
        .values({
          userId: ctx.userId,
          projectId: ctx.projectId,
          productId: input.productId,
          endUserId: input.endUserId,
          eventType: input.eventType,
          metadata: input.metadata ?? {},
        })
        .returning();

      const row = result[0]!;
      void enqueueFeedbackEvent({
        id: row.id,
        userId: ctx.userId,
        projectId: ctx.projectId,
        endUserId: input.endUserId,
        productId: input.productId,
        eventType: input.eventType,
        metadata: input.metadata ?? {},
        createdAt: (row.createdAt ?? new Date()).toISOString(),
      });

      return { ok: true };
    }),

  /** Batch track multiple events at once */
  trackBatch: rateLimitedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        events: z.array(
          z.object({
            endUserId: z.string().min(1),
            productId: z.string().uuid(),
            eventType: z.enum(["view", "click", "cart_add", "purchase"]),
            metadata: z.record(z.unknown()).optional(),
          })
        ).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input.projectId);
      if (!project) throw new Error("No active project");

      const result = await ctx.db
        .insert(feedbackEvents)
        .values(
          input.events.map((event) => ({
            userId: ctx.user.id,
            projectId: project.id,
            productId: event.productId,
            endUserId: event.endUserId,
            eventType: event.eventType,
            metadata: event.metadata ?? {},
          }))
        )
        .returning();

      // Dual-write batch to ClickHouse via async queue (single Redis round-trip)
      void enqueueFeedbackEvents(
        result.map((row, i) => ({
          id: row.id,
          userId: ctx.user.id,
          projectId: project.id,
          endUserId: input.events[i]!.endUserId,
          productId: input.events[i]!.productId,
          eventType: input.events[i]!.eventType,
          metadata: input.events[i]!.metadata ?? {},
          createdAt: (row.createdAt ?? new Date()).toISOString(),
        }))
      );

      return { tracked: result.length };
    }),

  sdkTrackBatch: apiKeyProcedure
    .input(
      z.object({
        events: z
          .array(
            z.object({
              endUserId: z.string().min(1),
              productId: z.string().uuid(),
              eventType: z.enum(["view", "click", "cart_add", "purchase"]),
              metadata: z.record(z.unknown()).optional(),
            })
          )
          .min(1)
          .max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(feedbackEvents)
        .values(
          input.events.map((event) => ({
            userId: ctx.userId,
            projectId: ctx.projectId,
            productId: event.productId,
            endUserId: event.endUserId,
            eventType: event.eventType,
            metadata: event.metadata ?? {},
          }))
        )
        .returning();

      void enqueueFeedbackEvents(
        result.map((row, index) => ({
          id: row.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          endUserId: input.events[index]!.endUserId,
          productId: input.events[index]!.productId,
          eventType: input.events[index]!.eventType,
          metadata: input.events[index]!.metadata ?? {},
          createdAt: (row.createdAt ?? new Date()).toISOString(),
        }))
      );

      return { tracked: result.length };
    }),

  /** Recent feedback events with product info */
  recent: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        eventType: z.enum(["view", "click", "cart_add", "purchase"]).optional(),
        endUserId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const conditions = [
        eq(feedbackEvents.userId, ctx.user.id),
        eq(feedbackEvents.projectId, project.id),
      ];

      if (input?.eventType) {
        conditions.push(eq(feedbackEvents.eventType, input.eventType));
      }
      if (input?.endUserId) {
        conditions.push(eq(feedbackEvents.endUserId, input.endUserId));
      }

      return ctx.db
        .select({
          id: feedbackEvents.id,
          endUserId: feedbackEvents.endUserId,
          productId: feedbackEvents.productId,
          productName: products.name,
          productCategory: products.category,
          eventType: feedbackEvents.eventType,
          metadata: feedbackEvents.metadata,
          createdAt: feedbackEvents.createdAt,
        })
        .from(feedbackEvents)
        .leftJoin(products, eq(feedbackEvents.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(feedbackEvents.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
    }),

  /** Distinct end-user IDs that have feedback */
  endUsers: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const result = await ctx.db
        .selectDistinct({ endUserId: feedbackEvents.endUserId })
        .from(feedbackEvents)
        .where(
          and(
            eq(feedbackEvents.userId, ctx.user.id),
            eq(feedbackEvents.projectId, project.id)
          )
        )
        .orderBy(feedbackEvents.endUserId)
        .limit(100);

      return result.map((row) => row.endUserId);
    }),

  /** Distinct event types present */
  eventTypes: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const result = await ctx.db
        .selectDistinct({ eventType: feedbackEvents.eventType })
        .from(feedbackEvents)
        .where(
          and(
            eq(feedbackEvents.userId, ctx.user.id),
            eq(feedbackEvents.projectId, project.id)
          )
        );

      return result.map((row) => row.eventType);
    }),
});
