import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: vi.fn(() => ({
      terminate: vi.fn(async () => {}),
      on: vi.fn(),
      off: vi.fn(),
    })),
  },
}));

const { WorkerManager } = await import("../../src/infra/WorkerManager");

describe("WorkerManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a worker and tracks by ID", () => {
    const manager = new WorkerManager();
    const worker = manager.create("core:build", "./fake.worker.js");

    expect(worker).toBeDefined();
    expect(manager.size).toBe(1);
    expect(manager.ids).toContain("core:build");
  });

  it("retrieves a worker by ID", () => {
    const manager = new WorkerManager();
    const created = manager.create("core:build", "./fake.worker.js");

    const found = manager.get("core:build");
    expect(found).toBe(created);
  });

  it("returns undefined for non-existent worker", () => {
    const manager = new WorkerManager();
    expect(manager.get("nonexistent")).toBeUndefined();
  });

  it("terminates a single worker and removes it", async () => {
    const manager = new WorkerManager();
    const worker = manager.create("core:build", "./fake.worker.js");

    await manager.terminate("core:build");

    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(manager.size).toBe(0);
  });

  it("terminates all workers and clears", async () => {
    const manager = new WorkerManager();
    const w1 = manager.create("core:build", "./fake.worker.js");
    const w2 = manager.create("core:dts", "./fake.worker.js");

    await manager.terminateAll();

    expect(w1.terminate).toHaveBeenCalledOnce();
    expect(w2.terminate).toHaveBeenCalledOnce();
    expect(manager.size).toBe(0);
  });
});
