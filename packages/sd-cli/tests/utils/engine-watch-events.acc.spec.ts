import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { ResultCollector } from "../../src/runtime/ResultCollector";
import type { NormalizedBuildInfo } from "../../src/runtime/engine-watch-events";

// --- Test helpers ---

/**
 * 실제 EventEmitter 기반 mock worker.
 * setupWatchEvents가 on()으로 등록한 핸들러가 emit()시 실제로 호출된다.
 */
class MockWorker extends EventEmitter {}

function createMockRebuildManager() {
  const mockResolver = vi.fn();
  return {
    manager: { registerBuild: vi.fn(() => mockResolver) },
    resolver: mockResolver,
  };
}

// --- Dynamic import ---

const { setupWatchEvents } = await import("../../src/runtime/engine-watch-events");

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setupWatchEvents (Acceptance)", () => {
  it("buildStart 이벤트 발생 시 RebuildManager에 빌드를 등록한다", () => {
    const worker = new MockWorker();
    const { manager } = createMockRebuildManager();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      rebuildManager: manager as any,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    worker.emit("buildStart", {});

    expect(manager.registerBuild).toHaveBeenCalledWith("test-pkg:build", "test-pkg (node)");
  });

  it("build 이벤트 발생 시 ResultCollector에 성공 결과를 보고하고 resolver를 호출한다", () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();
    const { manager, resolver } = createMockRebuildManager();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      rebuildManager: manager as any,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    // buildStart → build 시퀀스
    worker.emit("buildStart", {});
    worker.emit("build", { success: true });

    const result = resultCollector.get("test-pkg:build");
    expect(result).toMatchObject({
      name: "test-pkg",
      target: "node",
      type: "build",
      status: "success",
    });
    expect(resolver).toHaveBeenCalled();
  });

  it("build 실패 시 에러 메시지가 포함된다", () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    worker.emit("build", { success: false, errors: ["type error", "syntax error"] });

    const result = resultCollector.get("test-pkg:build");
    expect(result).toMatchObject({
      status: "error",
      message: "type error\nsyntax error",
    });
  });

  it("error 이벤트 발생 시 ResultCollector에 에러를 보고하고 resolver를 호출한다", () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();
    const { manager, resolver } = createMockRebuildManager();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      rebuildManager: manager as any,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    worker.emit("buildStart", {});
    worker.emit("error", { message: "Worker crashed" });

    const result = resultCollector.get("test-pkg:build");
    expect(result).toMatchObject({
      status: "error",
      type: "build",
      message: "Worker crashed",
    });
    expect(resolver).toHaveBeenCalled();
  });

  it("RebuildManager 없이도 buildStart/build가 에러 없이 동작한다", () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    // rebuildManager가 없으므로 buildStart는 무시, build는 ResultCollector에만 보고
    expect(() => {
      worker.emit("buildStart", {});
      worker.emit("build", { success: true });
    }).not.toThrow();

    expect(resultCollector.get("test-pkg:build")).toBeDefined();
  });

  it("ResultCollector 없이도 build/error가 에러 없이 동작한다", () => {
    const worker = new MockWorker();
    const { manager, resolver } = createMockRebuildManager();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      rebuildManager: manager as any,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    expect(() => {
      worker.emit("buildStart", {});
      worker.emit("build", { success: true });
    }).not.toThrow();

    expect(resolver).toHaveBeenCalled();
  });

  it("waitForInitialBuild()가 첫 번째 build 이벤트에서 resolve된다", async () => {
    const worker = new MockWorker();

    const { waitForInitialBuild } = setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    const promise = waitForInitialBuild();

    // build 이벤트 발행
    worker.emit("build", { success: true });

    await expect(promise).resolves.toBeUndefined();
  });

  it("waitForInitialBuild()가 첫 번째 error 이벤트에서도 resolve된다", async () => {
    const worker = new MockWorker();

    const { waitForInitialBuild } = setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    const promise = waitForInitialBuild();

    // error 이벤트 발행
    worker.emit("error", { message: "Fatal error" });

    // reject하지 않고 resolve
    await expect(promise).resolves.toBeUndefined();
  });

  it("build 성공 + warnings 시 ResultCollector에 warnings가 저장된다", () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    worker.emit("build", { success: true, warnings: ["warn1"] });

    const result = resultCollector.get("test-pkg:build");
    expect(result).toMatchObject({
      status: "success",
      warnings: "warn1",
    });
  });

  it("build 성공 + warnings 없음 시 ResultCollector에 warnings가 undefined이다", () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    worker.emit("build", { success: true });

    const result = resultCollector.get("test-pkg:build");
    expect(result?.status).toBe("success");
    expect(result?.warnings).toBeUndefined();
  });

  it("build 실패 + warnings 시 에러와 경고 모두 저장된다", () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();

    setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    worker.emit("build", { success: false, errors: ["err1"], warnings: ["warn1"] });

    const result = resultCollector.get("test-pkg:build");
    expect(result).toMatchObject({
      status: "error",
      message: "err1",
      warnings: "warn1",
    });
  });

  it("두 번째 build 이벤트에서는 waitForInitialBuild가 다시 resolve되지 않는다", async () => {
    const worker = new MockWorker();
    const resultCollector = new ResultCollector();

    const { waitForInitialBuild } = setupWatchEvents(worker, {
      name: "test-pkg",
      target: "node",
      resultCollector,
      normalizeBuild: (d) => d as NormalizedBuildInfo,
    });

    const promise = waitForInitialBuild();

    worker.emit("build", { success: true });
    await promise;

    // 두 번째 build — ResultCollector에는 보고되지만 Promise는 이미 settled
    worker.emit("build", { success: false, errors: ["second error"] });

    const result = resultCollector.get("test-pkg:build");
    expect(result?.status).toBe("error"); // 두 번째 결과로 갱신됨
  });
});
