import "server-only";

import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { appRouter } from "@glassbox/api";
import { createTRPCContext } from "./init";
import { makeQueryClient } from "./query_client";

export const getQueryClient = cache(makeQueryClient);

export const createCaller = cache(async () =>
  appRouter.createCaller(await createTRPCContext())
);

export const serverTrpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: createTRPCContext,
  queryClient: getQueryClient,
});

export function HydrateClient({ children }: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {children}
    </HydrationBoundary>
  );
}
