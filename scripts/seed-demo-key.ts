/**
 * Mint a Glassbox owner + project + API key for the demo storefront.
 *
 * Idempotent on the user and project (matched by email / name); always issues a
 * fresh API key and prints the RAW key once (it is only ever shown here — the DB
 * stores a SHA-256 hash, mirroring packages/api/src/routers/deploy.ts).
 *
 * Usage:
 *   DATABASE_URL=postgresql://glassbox:glassbox@localhost:5435/glassbox \
 *     pnpm -F @glassbox/event-pipeline exec tsx ../../scripts/seed-demo-key.ts
 *
 * Optional env: DEMO_OWNER_EMAIL, DEMO_OWNER_NAME, DEMO_PROJECT_NAME, DEMO_KEY_NAME.
 */
import { randomBytes, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@glassbox/database/client";
import { user, projects, apiKeys } from "@glassbox/database/schema";

const OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL ?? "demo-owner@glassbox.local";
const OWNER_NAME = process.env.DEMO_OWNER_NAME ?? "Demo Owner";
const PROJECT_NAME = process.env.DEMO_PROJECT_NAME ?? "Demo Store";
const KEY_NAME = process.env.DEMO_KEY_NAME ?? "demo-store";

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `gb_live_${randomBytes(24).toString("base64url")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16);
  return { raw, hash, prefix };
}

async function main(): Promise<void> {
  // 1. Ensure owner user
  let owner = (
    await db.select().from(user).where(eq(user.email, OWNER_EMAIL)).limit(1)
  )[0];
  if (!owner) {
    const id = `demo_${randomBytes(10).toString("hex")}`;
    [owner] = await db
      .insert(user)
      .values({ id, name: OWNER_NAME, email: OWNER_EMAIL, emailVerified: true })
      .returning();
  }

  // 2. Ensure project owned by that user
  let project = (
    await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, owner.id), eq(projects.name, PROJECT_NAME)))
      .limit(1)
  )[0];
  if (!project) {
    [project] = await db
      .insert(projects)
      .values({
        userId: owner.id,
        name: PROJECT_NAME,
        description: "Glassbox demo storefront — events ingested via the tracker SDK.",
      })
      .returning();
  }

  // 3. Always mint a fresh API key
  const { raw, hash, prefix } = generateApiKey();
  const [key] = await db
    .insert(apiKeys)
    .values({
      userId: owner.id,
      projectId: project.id,
      name: KEY_NAME,
      keyHash: hash,
      keyPrefix: prefix,
    })
    .returning();

  // Machine-readable on the last line for scripting (grep DEMO_KEY=)
  console.log(
    JSON.stringify(
      {
        userId: owner.id,
        email: owner.email,
        projectId: project.id,
        projectName: project.name,
        keyId: key.id,
        apiKey: raw,
      },
      null,
      2
    )
  );
  console.log(`DEMO_KEY=${raw}`);
  console.log(`DEMO_PROJECT_ID=${project.id}`);
  console.log(`DEMO_USER_ID=${owner.id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
