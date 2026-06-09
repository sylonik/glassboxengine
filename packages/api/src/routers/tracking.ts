import { z } from "zod";
import { enqueueWebsiteEvent, enqueueWebsiteEvents } from "@glassbox/event-pipeline";
import { createTRPCRouter, apiKeyProcedure } from "./trpc";

const websiteEventInput = z.object({
  sessionId: z.string().min(1),
  anonymousId: z.string().min(1),
  userId: z.string().optional().default(""),
  eventName: z.string().min(1).max(100),
  pageUrl: z.string().optional().default(""),
  pagePath: z.string().optional().default(""),
  pageTitle: z.string().optional().default(""),
  referrer: z.string().optional().default(""),
  utmSource: z.string().optional().default(""),
  utmMedium: z.string().optional().default(""),
  utmCampaign: z.string().optional().default(""),
  deviceType: z.string().optional().default(""),
  browser: z.string().optional().default(""),
  os: z.string().optional().default(""),
  screenWidth: z.number().int().min(0).optional().default(0),
  screenHeight: z.number().int().min(0).optional().default(0),
  properties: z.record(z.unknown()).optional().default({}),
  durationMs: z.number().int().min(0).optional().default(0),
  timestamp: z.string().datetime().optional(),
});

export const trackingRouter = createTRPCRouter({
  /** Ingest a single website event (SDK → server) */
  ingest: apiKeyProcedure
    .input(websiteEventInput)
    .mutation(async ({ ctx, input }) => {
      void enqueueWebsiteEvent({
        id: crypto.randomUUID(),
        projectId: ctx.projectId,
        sessionId: input.sessionId,
        anonymousId: input.anonymousId,
        userId: input.userId,
        eventName: input.eventName,
        pageUrl: input.pageUrl,
        pagePath: input.pagePath,
        pageTitle: input.pageTitle,
        referrer: input.referrer,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        deviceType: input.deviceType,
        browser: input.browser,
        os: input.os,
        screenWidth: input.screenWidth,
        screenHeight: input.screenHeight,
        country: "",
        properties: input.properties,
        durationMs: input.durationMs,
        createdAt: input.timestamp ?? new Date().toISOString(),
      });

      return { ok: true };
    }),

  /** Batch ingest website events (SDK → server) */
  ingestBatch: apiKeyProcedure
    .input(
      z.object({
        events: z.array(websiteEventInput).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payloads = input.events.map((event) => ({
        id: crypto.randomUUID(),
        projectId: ctx.projectId,
        sessionId: event.sessionId,
        anonymousId: event.anonymousId,
        userId: event.userId,
        eventName: event.eventName,
        pageUrl: event.pageUrl,
        pagePath: event.pagePath,
        pageTitle: event.pageTitle,
        referrer: event.referrer,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        deviceType: event.deviceType,
        browser: event.browser,
        os: event.os,
        screenWidth: event.screenWidth,
        screenHeight: event.screenHeight,
        country: "",
        properties: event.properties,
        durationMs: event.durationMs,
        createdAt: event.timestamp ?? new Date().toISOString(),
      }));

      void enqueueWebsiteEvents(payloads);
      return { tracked: payloads.length };
    }),
});
