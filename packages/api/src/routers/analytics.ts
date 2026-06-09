import { z } from "zod";
import { and, eq, sql, desc, gte } from "drizzle-orm";
import {
  recommendationEvents,
  feedbackEvents,
  products,
} from "@glassbox/database/schema";
import { resolveProject } from "../project_utils";
import { createTRPCRouter, protectedProcedure } from "./trpc";

export const analyticsRouter = createTRPCRouter({
  /** High-level KPIs: total recs, total feedback, CTR, conversion rate */
  overview: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        /** Number of days to look back (default 30) */
        days: z.number().int().min(1).max(365).default(30),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) {
        return {
          totalRecommendations: 0,
          totalFeedback: 0,
          uniqueEndUsers: 0,
          avgConfidence: 0,
          avgLatency: 0,
          ctr: 0,
          conversionRate: 0,
        };
      }

      const since = new Date(
        Date.now() - (input?.days ?? 30) * 86_400_000
      );

      const [recStats, feedbackStats, clickCount, purchaseCount] =
        await Promise.all([
          ctx.db
            .select({
              total: sql<number>`count(*)`,
              uniqueUsers: sql<number>`count(distinct ${recommendationEvents.endUserId})`,
              avgConfidence: sql<number>`avg(${recommendationEvents.avgConfidence})`,
              avgLatency: sql<number>`avg(${recommendationEvents.latencyMs})`,
            })
            .from(recommendationEvents)
            .where(
              and(
                eq(recommendationEvents.userId, ctx.user.id),
                eq(recommendationEvents.projectId, project.id),
                gte(recommendationEvents.createdAt, since)
              )
            ),
          ctx.db
            .select({ total: sql<number>`count(*)` })
            .from(feedbackEvents)
            .where(
              and(
                eq(feedbackEvents.userId, ctx.user.id),
                eq(feedbackEvents.projectId, project.id),
                gte(feedbackEvents.createdAt, since)
              )
            ),
          ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(feedbackEvents)
            .where(
              and(
                eq(feedbackEvents.userId, ctx.user.id),
                eq(feedbackEvents.projectId, project.id),
                eq(feedbackEvents.eventType, "click"),
                gte(feedbackEvents.createdAt, since)
              )
            ),
          ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(feedbackEvents)
            .where(
              and(
                eq(feedbackEvents.userId, ctx.user.id),
                eq(feedbackEvents.projectId, project.id),
                eq(feedbackEvents.eventType, "purchase"),
                gte(feedbackEvents.createdAt, since)
              )
            ),
        ]);

      const totalRecs = Number(recStats[0]?.total ?? 0);
      const totalFeedback = Number(feedbackStats[0]?.total ?? 0);
      const clicks = Number(clickCount[0]?.count ?? 0);
      const purchases = Number(purchaseCount[0]?.count ?? 0);

      return {
        totalRecommendations: totalRecs,
        totalFeedback,
        uniqueEndUsers: Number(recStats[0]?.uniqueUsers ?? 0),
        avgConfidence: Number(
          (recStats[0]?.avgConfidence ?? 0).toFixed(3)
        ),
        avgLatency: Math.round(Number(recStats[0]?.avgLatency ?? 0)),
        ctr: totalRecs > 0 ? Number((clicks / totalRecs).toFixed(4)) : 0,
        conversionRate:
          totalRecs > 0
            ? Number((purchases / totalRecs).toFixed(4))
            : 0,
      };
    }),

  /** Daily aggregation of recommendations and feedback over time */
  timeline: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        days: z.number().int().min(1).max(365).default(30),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const since = new Date(
        Date.now() - (input?.days ?? 30) * 86_400_000
      );

      const [recTimeline, feedbackTimeline] = await Promise.all([
        ctx.db
          .select({
            day: sql<string>`date_trunc('day', ${recommendationEvents.createdAt})::date::text`,
            count: sql<number>`count(*)`,
            avgConfidence: sql<number>`avg(${recommendationEvents.avgConfidence})`,
          })
          .from(recommendationEvents)
          .where(
            and(
              eq(recommendationEvents.userId, ctx.user.id),
              eq(recommendationEvents.projectId, project.id),
              gte(recommendationEvents.createdAt, since)
            )
          )
          .groupBy(
            sql`date_trunc('day', ${recommendationEvents.createdAt})::date`
          )
          .orderBy(
            sql`date_trunc('day', ${recommendationEvents.createdAt})::date`
          ),
        ctx.db
          .select({
            day: sql<string>`date_trunc('day', ${feedbackEvents.createdAt})::date::text`,
            views: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'view')`,
            clicks: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'click')`,
            cartAdds: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'cart_add')`,
            purchases: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'purchase')`,
          })
          .from(feedbackEvents)
          .where(
            and(
              eq(feedbackEvents.userId, ctx.user.id),
              eq(feedbackEvents.projectId, project.id),
              gte(feedbackEvents.createdAt, since)
            )
          )
          .groupBy(
            sql`date_trunc('day', ${feedbackEvents.createdAt})::date`
          )
          .orderBy(
            sql`date_trunc('day', ${feedbackEvents.createdAt})::date`
          ),
      ]);

      // Merge both timelines by day
      const dayMap = new Map<
        string,
        {
          day: string;
          recommendations: number;
          avgConfidence: number;
          views: number;
          clicks: number;
          cartAdds: number;
          purchases: number;
        }
      >();

      for (const row of recTimeline) {
        dayMap.set(row.day, {
          day: row.day,
          recommendations: Number(row.count),
          avgConfidence: Number(row.avgConfidence ?? 0),
          views: 0,
          clicks: 0,
          cartAdds: 0,
          purchases: 0,
        });
      }
      for (const row of feedbackTimeline) {
        const existing = dayMap.get(row.day);
        if (existing) {
          existing.views = Number(row.views);
          existing.clicks = Number(row.clicks);
          existing.cartAdds = Number(row.cartAdds);
          existing.purchases = Number(row.purchases);
        } else {
          dayMap.set(row.day, {
            day: row.day,
            recommendations: 0,
            avgConfidence: 0,
            views: Number(row.views),
            clicks: Number(row.clicks),
            cartAdds: Number(row.cartAdds),
            purchases: Number(row.purchases),
          });
        }
      }

      return [...dayMap.values()].sort((a, b) =>
        a.day.localeCompare(b.day)
      );
    }),

  /** Top products by feedback engagement */
  topProducts: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        days: z.number().int().min(1).max(365).default(30),
        limit: z.number().int().min(1).max(50).default(10),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const since = new Date(
        Date.now() - (input?.days ?? 30) * 86_400_000
      );

      return ctx.db
        .select({
          productId: feedbackEvents.productId,
          productName: products.name,
          productCategory: products.category,
          views: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'view')`,
          clicks: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'click')`,
          cartAdds: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'cart_add')`,
          purchases: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'purchase')`,
          total: sql<number>`count(*)`,
        })
        .from(feedbackEvents)
        .leftJoin(products, eq(feedbackEvents.productId, products.id))
        .where(
          and(
            eq(feedbackEvents.userId, ctx.user.id),
            eq(feedbackEvents.projectId, project.id),
            gte(feedbackEvents.createdAt, since)
          )
        )
        .groupBy(feedbackEvents.productId, products.name, products.category)
        .orderBy(desc(sql`count(*)`))
        .limit(input?.limit ?? 10);
    }),

  /** Funnel breakdown: view → click → cart_add → purchase */
  funnel: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        days: z.number().int().min(1).max(365).default(30),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) {
        return { views: 0, clicks: 0, cartAdds: 0, purchases: 0 };
      }

      const since = new Date(
        Date.now() - (input?.days ?? 30) * 86_400_000
      );

      const result = await ctx.db
        .select({
          views: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'view')`,
          clicks: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'click')`,
          cartAdds: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'cart_add')`,
          purchases: sql<number>`count(*) filter (where ${feedbackEvents.eventType} = 'purchase')`,
        })
        .from(feedbackEvents)
        .where(
          and(
            eq(feedbackEvents.userId, ctx.user.id),
            eq(feedbackEvents.projectId, project.id),
            gte(feedbackEvents.createdAt, since)
          )
        );

      return {
        views: Number(result[0]?.views ?? 0),
        clicks: Number(result[0]?.clicks ?? 0),
        cartAdds: Number(result[0]?.cartAdds ?? 0),
        purchases: Number(result[0]?.purchases ?? 0),
      };
    }),
});
