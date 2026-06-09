import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database client to avoid DATABASE_URL requirement
vi.mock("@glassbox/database/client", () => ({
  db: {},
}));

// Mock agents to avoid GOOGLE_API_KEY requirement
vi.mock("@glassbox/agents", () => ({
  runCoordinatorAgent: vi.fn(),
  runEngineerAgent: vi.fn(),
  runReasonerAgent: vi.fn(),
  runMentorAgent: vi.fn(),
  runPersonaSimulatorAgent: vi.fn(),
  validateScoringCode: vi.fn(),
  buildSearchParams: vi.fn(),
  explainSliderTranslation: vi.fn(),
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
  DEFAULT_MODEL: "test",
  REASONING_MODEL: "test",
  EMBEDDING_MODEL: "test",
  EMBEDDING_DIMENSIONS: 768,
}));

// Mock event-pipeline to avoid REDIS_URL requirement
vi.mock("@glassbox/event-pipeline", () => ({
  enqueueFeedbackEvent: vi.fn(),
  enqueueFeedbackEvents: vi.fn(),
  enqueueRecommendationEvent: vi.fn(),
}));

import { appRouter } from "../../root";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

function createMockCaller(user: { id: string; email: string; name: string } | null = null) {
  return appRouter.createCaller({
    db: mockDb as any,
    user,
  });
}

describe("projects router", () => {
  const testUser = { id: "user-1", email: "test@example.com", name: "Test User" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list requires authentication", async () => {
    const caller = createMockCaller(null);
    await expect(caller.projects.list()).rejects.toThrow("logged in");
  });

  it("list returns user projects", async () => {
    const fakeProjects = [
      { id: "proj-1", name: "My Project", userId: "user-1" },
    ];

    const chain: any = {};
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockResolvedValue(fakeProjects);
    mockDb.select.mockReturnValue(chain);

    const caller = createMockCaller(testUser);
    const result = await caller.projects.list();
    expect(result).toEqual(fakeProjects);
    expect(mockDb.select).toHaveBeenCalled();
  });

  it("create inserts and sets active preference", async () => {
    const newProject = { id: "proj-new", name: "New Project", userId: "user-1" };

    const insertChain: any = {};
    insertChain.values = vi.fn().mockReturnValue(insertChain);
    insertChain.returning = vi.fn().mockResolvedValue([newProject]);

    const upsertChain: any = {};
    upsertChain.values = vi.fn().mockReturnValue(upsertChain);
    upsertChain.onConflictDoUpdate = vi.fn().mockResolvedValue([]);

    mockDb.insert
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(upsertChain);

    const caller = createMockCaller(testUser);
    const result = await caller.projects.create({ name: "New Project" });
    expect(result).toEqual(newProject);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("setActive requires a valid UUID", async () => {
    const caller = createMockCaller(testUser);
    await expect(
      caller.projects.setActive({ projectId: "not-a-uuid" })
    ).rejects.toThrow();
  });

  it("getActive requires authentication", async () => {
    const caller = createMockCaller(null);
    await expect(caller.projects.getActive()).rejects.toThrow("logged in");
  });
});
