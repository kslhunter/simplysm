import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkerManager } from "../../src/infra/WorkerManager";

// Worker 모킹
vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe("WorkerManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Worker and retrieves it by ID", () => {
    const manager = new WorkerManager();

    const worker = manager.create("test-worker", "/path/to/worker.ts");

    expect(worker).toBeDefined();
    expect(manager.get("test-worker")).toBe(worker);
  });

  it("returns undefined when retrieving a non-existent Worker", () => {
    const manager = new WorkerManager();

    expect(manager.get("nonexistent")).toBeUndefined();
  });

  it("terminates all Workers", async () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("worker1", "/path/to/worker.ts");
    const worker2 = manager.create("worker2", "/path/to/worker.ts");

    await manager.terminateAll();

    expect(worker1.terminate).toHaveBeenCalled();
    expect(worker2.terminate).toHaveBeenCalled();
    expect(manager.size).toBe(0);
  });

  it("terminates a specific Worker only", async () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("worker1", "/path/to/worker.ts");
    const worker2 = manager.create("worker2", "/path/to/worker.ts");

    await manager.terminate("worker1");

    expect(worker1.terminate).toHaveBeenCalled();
    expect(worker2.terminate).not.toHaveBeenCalled();
    expect(manager.get("worker1")).toBeUndefined();
    expect(manager.get("worker2")).toBe(worker2);
  });

  it("handles terminating a non-existent Worker without error", async () => {
    const manager = new WorkerManager();

    await expect(manager.terminate("nonexistent")).resolves.toBeUndefined();
  });

  it("retrieves the count of managed Workers", () => {
    const manager = new WorkerManager();

    expect(manager.size).toBe(0);

    manager.create("worker1", "/path/to/worker.ts");
    expect(manager.size).toBe(1);

    manager.create("worker2", "/path/to/worker.ts");
    expect(manager.size).toBe(2);
  });

  it("retrieves list of all Worker IDs", () => {
    const manager = new WorkerManager();
    manager.create("worker1", "/path/to/worker.ts");
    manager.create("worker2", "/path/to/worker.ts");

    const ids = manager.ids;

    expect(ids).toEqual(["worker1", "worker2"]);
  });

  it("overwrites existing Worker when creating with the same ID", () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("same-id", "/path/to/worker1.ts");
    const worker2 = manager.create("same-id", "/path/to/worker2.ts");

    expect(manager.get("same-id")).toBe(worker2);
    expect(manager.get("same-id")).not.toBe(worker1);
    expect(manager.size).toBe(1);
  });
});
