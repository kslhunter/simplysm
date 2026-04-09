import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerWorkerEventHandlers } from "../../src/utils/worker-events";
import type { BuildResult } from "../../src/infra/ResultCollector";
import type { RebuildManager } from "../../src/utils/rebuild-manager";

function createMockWorker() {
  const handlers = new Map<string, (data: any) => void>();
  return {
    on: vi.fn((event: string, handler: (data: any) => void) => {
      handlers.set(event, handler);
    }),
    emit(event: string, data: any) {
      handlers.get(event)?.(data);
    },
  };
}

function createMockRebuildManager() {
  return {
    registerBuild: vi.fn(() => vi.fn()),
  } as unknown as RebuildManager;
}

describe("registerWorkerEventHandlers", () => {
  let results: Map<string, BuildResult>;
  let rebuildManager: RebuildManager;

  beforeEach(() => {
    vi.clearAllMocks();
    results = new Map();
    rebuildManager = createMockRebuildManager();
  });

  it("stores success result on build event with success=true", () => {
    const worker = createMockWorker();
    const workerInfo = {
      name: "core",
      config: { target: "node" },
      worker,
      isInitialBuild: true,
      buildResolver: vi.fn(),
    };

    registerWorkerEventHandlers(
      workerInfo,
      { resultKey: "core:build", listrTitle: "core", resultType: "build" },
      results,
      rebuildManager,
    );

    worker.emit("build", { success: true });

    expect(results.get("core:build")).toBeDefined();
    expect(results.get("core:build")!.status).toBe("success");
  });

  it("stores error result on build event with success=false", () => {
    const worker = createMockWorker();
    const workerInfo = {
      name: "core",
      config: { target: "node" },
      worker,
      isInitialBuild: true,
      buildResolver: vi.fn(),
    };

    registerWorkerEventHandlers(
      workerInfo,
      { resultKey: "core:build", listrTitle: "core", resultType: "build" },
      results,
      rebuildManager,
    );

    worker.emit("build", { success: false, errors: ["type error"] });

    expect(results.get("core:build")!.status).toBe("error");
    expect(results.get("core:build")!.message).toBe("type error");
  });

  it("stores error result on error event", () => {
    const worker = createMockWorker();
    const workerInfo = {
      name: "core",
      config: { target: "node" },
      worker,
      isInitialBuild: true,
      buildResolver: vi.fn(),
    };

    registerWorkerEventHandlers(
      workerInfo,
      { resultKey: "core:build", listrTitle: "core", resultType: "build" },
      results,
      rebuildManager,
    );

    worker.emit("error", { message: "fatal error" });

    expect(results.get("core:build")!.status).toBe("error");
    expect(results.get("core:build")!.message).toBe("fatal error");
  });

  it("calls buildResolver on build completion", () => {
    const worker = createMockWorker();
    const resolver = vi.fn();
    const workerInfo = {
      name: "core",
      config: { target: "node" },
      worker,
      isInitialBuild: true,
      buildResolver: resolver,
    };

    registerWorkerEventHandlers(
      workerInfo,
      { resultKey: "core:build", listrTitle: "core", resultType: "build" },
      results,
      rebuildManager,
    );

    worker.emit("build", { success: true });

    expect(resolver).toHaveBeenCalledOnce();
  });

  it("registers rebuild on buildStart for non-initial builds", () => {
    const worker = createMockWorker();
    const workerInfo = {
      name: "core",
      config: { target: "node" },
      worker,
      isInitialBuild: false,
      buildResolver: undefined,
    };

    registerWorkerEventHandlers(
      workerInfo,
      { resultKey: "core:build", listrTitle: "core", resultType: "build" },
      results,
      rebuildManager,
    );

    worker.emit("buildStart", {});

    expect(rebuildManager.registerBuild).toHaveBeenCalledWith("core:build", "core");
  });
});
