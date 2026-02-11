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

  it("Worker를 생성하고 ID로 조회할 수 있다", () => {
    const manager = new WorkerManager();

    const worker = manager.create("test-worker", "/path/to/worker.ts");

    expect(worker).toBeDefined();
    expect(manager.get("test-worker")).toBe(worker);
  });

  it("존재하지 않는 Worker 조회 시 undefined 반환", () => {
    const manager = new WorkerManager();

    expect(manager.get("nonexistent")).toBeUndefined();
  });

  it("모든 Worker를 종료할 수 있다", async () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("worker1", "/path/to/worker.ts");
    const worker2 = manager.create("worker2", "/path/to/worker.ts");

    await manager.terminateAll();

    expect(worker1.terminate).toHaveBeenCalled();
    expect(worker2.terminate).toHaveBeenCalled();
    expect(manager.size).toBe(0);
  });

  it("특정 Worker만 종료할 수 있다", async () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("worker1", "/path/to/worker.ts");
    const worker2 = manager.create("worker2", "/path/to/worker.ts");

    await manager.terminate("worker1");

    expect(worker1.terminate).toHaveBeenCalled();
    expect(worker2.terminate).not.toHaveBeenCalled();
    expect(manager.get("worker1")).toBeUndefined();
    expect(manager.get("worker2")).toBe(worker2);
  });

  it("존재하지 않는 Worker 종료 시 에러 없이 처리된다", async () => {
    const manager = new WorkerManager();

    await expect(manager.terminate("nonexistent")).resolves.toBeUndefined();
  });

  it("관리 중인 Worker 수를 조회할 수 있다", () => {
    const manager = new WorkerManager();

    expect(manager.size).toBe(0);

    manager.create("worker1", "/path/to/worker.ts");
    expect(manager.size).toBe(1);

    manager.create("worker2", "/path/to/worker.ts");
    expect(manager.size).toBe(2);
  });

  it("모든 Worker ID 목록을 조회할 수 있다", () => {
    const manager = new WorkerManager();
    manager.create("worker1", "/path/to/worker.ts");
    manager.create("worker2", "/path/to/worker.ts");

    const ids = manager.ids;

    expect(ids).toEqual(["worker1", "worker2"]);
  });

  it("같은 ID로 Worker를 생성하면 기존 Worker를 덮어쓴다", () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("same-id", "/path/to/worker1.ts");
    const worker2 = manager.create("same-id", "/path/to/worker2.ts");

    expect(manager.get("same-id")).toBe(worker2);
    expect(manager.get("same-id")).not.toBe(worker1);
    expect(manager.size).toBe(1);
  });
});
