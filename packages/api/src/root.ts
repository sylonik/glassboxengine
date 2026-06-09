import { createTRPCRouter } from "./routers/trpc";
import { catalogRouter } from "./routers/catalog";
import { alignmentRouter } from "./routers/alignment";
import { scoringRouter } from "./routers/scoring";
import { glassBoxRouter } from "./routers/glass_box";
import { projectsRouter } from "./routers/projects";
import { personasRouter } from "./routers/personas";
import { deployRouter } from "./routers/deploy";
import { analyticsRouter } from "./routers/analytics";
import { feedbackRouter } from "./routers/feedback";
import { trackingRouter } from "./routers/tracking";
import { funnelsRouter } from "./routers/funnels";
import { websiteAnalyticsRouter } from "./routers/website-analytics";

export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  catalog: catalogRouter,
  alignment: alignmentRouter,
  scoring: scoringRouter,
  personas: personasRouter,
  glassBox: glassBoxRouter,
  deploy: deployRouter,
  analytics: analyticsRouter,
  feedback: feedbackRouter,
  tracking: trackingRouter,
  funnels: funnelsRouter,
  websiteAnalytics: websiteAnalyticsRouter,
});

export type AppRouter = typeof appRouter;
