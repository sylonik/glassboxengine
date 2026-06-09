import { and, desc, eq } from "drizzle-orm";
import { projects, userProjectPreferences } from "@glassbox/database/schema";
import type { Context } from "./routers/trpc";

type AuthenticatedContext = Context & {
  user: NonNullable<Context["user"]>;
};

export async function getOwnedProject(
  ctx: AuthenticatedContext,
  projectId: string
) {
  const result = await ctx.db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, ctx.user.id)))
    .limit(1);

  return result[0] ?? null;
}

export async function getFirstProject(ctx: AuthenticatedContext) {
  const result = await ctx.db
    .select()
    .from(projects)
    .where(eq(projects.userId, ctx.user.id))
    .orderBy(desc(projects.updatedAt))
    .limit(1);

  return result[0] ?? null;
}

export async function setActiveProjectPreference(
  ctx: AuthenticatedContext,
  projectId: string
) {
  await ctx.db
    .insert(userProjectPreferences)
    .values({
      userId: ctx.user.id,
      activeProjectId: projectId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProjectPreferences.userId,
      set: {
        activeProjectId: projectId,
        updatedAt: new Date(),
      },
    });
}

export async function getActiveProject(ctx: AuthenticatedContext) {
  const preference = await ctx.db
    .select()
    .from(userProjectPreferences)
    .where(eq(userProjectPreferences.userId, ctx.user.id))
    .limit(1);

  if (preference[0]?.activeProjectId) {
    const preferred = await getOwnedProject(ctx, preference[0].activeProjectId);
    if (preferred) return preferred;
  }

  const firstProject = await getFirstProject(ctx);
  if (firstProject) {
    await setActiveProjectPreference(ctx, firstProject.id);
  }

  return firstProject;
}

export async function ensureProject(
  ctx: AuthenticatedContext,
  projectId?: string,
  fallbackName = "Default Project"
) {
  if (projectId) {
    const existing = await getOwnedProject(ctx, projectId);
    if (!existing) {
      throw new Error("Project not found");
    }
    return existing;
  }

  const existing = await getActiveProject(ctx);
  if (existing) return existing;

  const created = await ctx.db
    .insert(projects)
    .values({
      userId: ctx.user.id,
      name: fallbackName,
      description: "Your first GlassBox project.",
    })
    .returning();

  if (created[0]) {
    await setActiveProjectPreference(ctx, created[0].id);
  }

  return created[0]!;
}

export async function resolveProject(
  ctx: AuthenticatedContext,
  projectId?: string
) {
  if (projectId) {
    const existing = await getOwnedProject(ctx, projectId);
    if (!existing) {
      throw new Error("Project not found");
    }
    return existing;
  }

  return getActiveProject(ctx);
}
