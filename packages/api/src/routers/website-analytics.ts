import { z } from "zod";
import { getClickHouseClient } from "@glassbox/event-pipeline";
import { resolveProject } from "../project_utils";
import { createTRPCRouter, protectedProcedure } from "./trpc";

export const websiteAnalyticsRouter = createTRPCRouter({
  /** High-level KPIs: total events, unique sessions, unique users */
  overview: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          days: z.number().int().min(1).max(365).default(30),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) {
        return { totalEvents: 0, uniqueSessions: 0, uniqueUsers: 0 };
      }

      const since = new Date(Date.now() - (input?.days ?? 30) * 86_400_000);
      const client = getClickHouseClient();

      const result = await client.query({
        query: `
          SELECT
              sum(event_count)     AS total_events,
              uniqExact(event_name) AS distinct_events
          FROM glassbox.daily_website_summary
          WHERE project_id = {projectId:UUID}
            AND event_date >= {since:Date}
        `,
        query_params: {
          projectId: project.id,
          since: since.toISOString().slice(0, 10),
        },
        format: "JSONEachRow",
      });
      const summaryRows = await result.json<{
        total_events: string;
        distinct_events: string;
      }>();

      // Get unique sessions and users from raw table for accuracy
      const rawResult = await client.query({
        query: `
          SELECT
              uniqExact(session_id)                              AS unique_sessions,
              uniqExact(if(user_id = '', anonymous_id, user_id)) AS unique_users
          FROM glassbox.website_events
          WHERE project_id = {projectId:UUID}
            AND created_at >= {since:DateTime64(3)}
        `,
        query_params: {
          projectId: project.id,
          since: since.toISOString(),
        },
        format: "JSONEachRow",
      });
      const rawRows = await rawResult.json<{
        unique_sessions: string;
        unique_users: string;
      }>();

      return {
        totalEvents: Number(summaryRows[0]?.total_events ?? 0),
        uniqueSessions: Number(rawRows[0]?.unique_sessions ?? 0),
        uniqueUsers: Number(rawRows[0]?.unique_users ?? 0),
      };
    }),

  /** Daily event counts grouped by event_name */
  timeline: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          days: z.number().int().min(1).max(365).default(30),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const since = new Date(Date.now() - (input?.days ?? 30) * 86_400_000);
      const client = getClickHouseClient();

      const result = await client.query({
        query: `
          SELECT
              event_date,
              sum(event_count) AS total
          FROM glassbox.daily_website_summary
          WHERE project_id = {projectId:UUID}
            AND event_date >= {since:Date}
          GROUP BY event_date
          ORDER BY event_date
        `,
        query_params: {
          projectId: project.id,
          since: since.toISOString().slice(0, 10),
        },
        format: "JSONEachRow",
      });

      const rows = await result.json<{
        event_date: string;
        total: string;
      }>();

      return rows.map((row) => ({
        day: row.event_date,
        total: Number(row.total),
      }));
    }),

  /** Top event names by count */
  topEvents: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          days: z.number().int().min(1).max(365).default(30),
          limit: z.number().int().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const since = new Date(Date.now() - (input?.days ?? 30) * 86_400_000);
      const client = getClickHouseClient();

      const result = await client.query({
        query: `
          SELECT
              event_name,
              sum(event_count) AS count
          FROM glassbox.daily_website_summary
          WHERE project_id = {projectId:UUID}
            AND event_date >= {since:Date}
          GROUP BY event_name
          ORDER BY count DESC
          LIMIT {limit:UInt32}
        `,
        query_params: {
          projectId: project.id,
          since: since.toISOString().slice(0, 10),
          limit: input?.limit ?? 10,
        },
        format: "JSONEachRow",
      });

      const rows = await result.json<{
        event_name: string;
        count: string;
      }>();

      return rows.map((row) => ({
        eventName: row.event_name,
        count: Number(row.count),
      }));
    }),

  /** Top page paths by page_view count */
  topPages: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          days: z.number().int().min(1).max(365).default(30),
          limit: z.number().int().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      const since = new Date(Date.now() - (input?.days ?? 30) * 86_400_000);
      const client = getClickHouseClient();

      const result = await client.query({
        query: `
          SELECT
              page_path,
              count() AS views,
              uniqExact(session_id) AS sessions
          FROM glassbox.website_events
          WHERE project_id = {projectId:UUID}
            AND event_name = 'page_view'
            AND created_at >= {since:DateTime64(3)}
            AND page_path != ''
          GROUP BY page_path
          ORDER BY views DESC
          LIMIT {limit:UInt32}
        `,
        query_params: {
          projectId: project.id,
          since: since.toISOString(),
          limit: input?.limit ?? 10,
        },
        format: "JSONEachRow",
      });

      const rows = await result.json<{
        page_path: string;
        views: string;
        sessions: string;
      }>();

      return rows.map((row) => ({
        pagePath: row.page_path,
        views: Number(row.views),
        sessions: Number(row.sessions),
      }));
    }),

  /** Event breakdown by a chosen dimension */
  eventBreakdown: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        days: z.number().int().min(1).max(365).default(30),
        dimension: z.enum([
          "device_type",
          "browser",
          "os",
          "utm_source",
          "utm_medium",
          "utm_campaign",
        ]),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input.projectId);
      if (!project) return [];

      const since = new Date(Date.now() - input.days * 86_400_000);
      const client = getClickHouseClient();

      // dimension is from a strict enum so safe to interpolate
      const result = await client.query({
        query: `
          SELECT
              ${input.dimension} AS dimension_value,
              count() AS count
          FROM glassbox.website_events
          WHERE project_id = {projectId:UUID}
            AND created_at >= {since:DateTime64(3)}
            AND ${input.dimension} != ''
          GROUP BY dimension_value
          ORDER BY count DESC
          LIMIT {limit:UInt32}
        `,
        query_params: {
          projectId: project.id,
          since: since.toISOString(),
          limit: input.limit,
        },
        format: "JSONEachRow",
      });

      const rows = await result.json<{
        dimension_value: string;
        count: string;
      }>();

      return rows.map((row) => ({
        value: row.dimension_value,
        count: Number(row.count),
      }));
    }),
});
