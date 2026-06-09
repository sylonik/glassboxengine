FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/agents/package.json ./packages/agents/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/event-pipeline/package.json ./packages/event-pipeline/package.json
COPY packages/telemetry/package.json ./packages/telemetry/package.json
COPY packages/sdk/package.json ./packages/sdk/package.json
COPY packages/config/package.json ./packages/config/package.json
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# apps/web/.env is a symlink to the repo-root .env, which .dockerignore strips,
# leaving a dangling symlink that `next build` stats (ENOENT). Replace it with a
# real file carrying BUILD-TIME placeholder env. Several modules (DB client, auth)
# validate env at IMPORT time, which `next build` triggers while collecting
# API-route metadata — and Next's page-data workers read env from .env FILES via
# @next/env, not inherited process env, so the values must live in this file. No
# real connections are made at build; real values are injected by Cloud Run at
# runtime. Override NEXT_PUBLIC_* via build args for production client bundles.
# NEXT_PUBLIC_SITE_URL is the canonical public origin baked into SEO output
# (canonical tags, Open Graph, sitemap, JSON-LD) — it must be the real domain,
# NOT the localhost app-url placeholder. lib/seo.ts reads it first.
ARG NEXT_PUBLIC_SITE_URL=https://glassboxengine.dev
RUN rm -f apps/web/.env && printf '%s\n' \
    'DATABASE_URL=postgresql://build:build@localhost:5432/build' \
    'BETTER_AUTH_SECRET=build-time-placeholder-secret-min-32-characters' \
    'BETTER_AUTH_URL=http://localhost:3000' \
    'NEXT_PUBLIC_APP_URL=http://localhost:3000' \
    "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}" \
    'CLICKHOUSE_URL=http://localhost:8123' \
    'CLICKHOUSE_DATABASE=glassbox' \
    'REDIS_URL=redis://localhost:6379' \
    'GOOGLE_API_KEY=build-placeholder' > apps/web/.env
# Build ONLY the web app and its workspace dependency graph. `pnpm build`
# (turbo build) would also build packages/tracker + apps/example-site, whose
# devDeps (e.g. tsup) are intentionally not installed in the deps stage above,
# so a full build fails inside the image.
RUN pnpm exec turbo build --filter=web
# This app ships no static public assets; ensure the dir exists so the runner
# stage's `COPY apps/web/public` succeeds (and still works if assets get added).
RUN mkdir -p apps/web/public

# --- Runner ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
