import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { ResultCollector } from "../../src/runtime/ResultCollector";

// --- Test helpers ---

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

describe("setupWatchEvents", () => {
  describe("normalizeBuild 콜백", () => {
    it("build 이벤트 데이터를 normalizeBuild로 변환하여 처리한다", () => {
      const worker = new MockWorker();
      const resultCollector = new ResultCollector();

      // BaseEngine 스타일: 중첩 구조에서 build 필드 추출
      setupWatchEvents(worker, {
        name: "test-pkg",
        target: "node",
        resultCollector,
        normalizeBuild: (d) => (d as { build: { success: boolean } }).build,
      });

      worker.emit("build", { build: { success: true }, lint: { success: true } });

      const result = resultCollector.get("test-pkg:build");
      expect(result?.status).toBe("success");
    });

    it("EsbuildClientEngine 스타일: 평탄 구조를 그대로 사용한다", () => {
      const worker = new MockWorker();
      const resultCollector = new ResultCollector();

      setupWatchEvents(worker, {
        name: "client-app",
        target: "client",
        resultCollector,
        normalizeBuild: (d) => d as { success: boolean },
      });

      worker.emit("build", { success: false, errors: ["esbuild error"] });

      const result = resultCollector.get("client-app:build");
      expect(result?.status).toBe("error");
      expect(result?.message).toBe("esbuild error");
    });
  });

  describe("resolver 생명주기", () => {
    it("build 후 resolver가 초기화되어 중복 호출되지 않는다", () => {
      const worker = new MockWorker();
      const { manager, resolver } = createMockRebuildManager();

      setupWatchEvents(worker, {
        name: "test-pkg",
        target: "node",
        rebuildManager: manager as any,
        normalizeBuild: (d) => d as any,
      });

      worker.emit("buildStart", {});
      worker.emit("build", { success: true });
      // resolver 한번만 호출됨
      expect(resolver).toHaveBeenCalledOnce();

      // buildStart 없이 build만 다시 발생 — resolver 없으므로 추가 호출 없음
      worker.emit("build", { success: true });
      expect(resolver).toHaveBeenCalledOnce();
    });

    it("error 후 resolver가 초기화되어 중복 호출되지 않는다", () => {
      const worker = new MockWorker();
      const { manager, resolver } = createMockRebuildManager();

      setupWatchEvents(worker, {
        name: "test-pkg",
        target: "node",
        rebuildManager: manager as any,
        normalizeBuild: (d) => d as any,
      });

      worker.emit("buildStart", {});
      worker.emit("error", { message: "crash" });
      expect(resolver).toHaveBeenCalledOnce();

      worker.emit("error", { message: "crash again" });
      expect(resolver).toHaveBeenCalledOnce();
    });
  });

  describe("resolveInitialBuild", () => {
    it("수동으로 초기 빌드를 resolve할 수 있다", async () => {
      const worker = new MockWorker();

      const { waitForInitialBuild, resolveInitialBuild } = setupWatchEvents(worker, {
        name: "test-pkg",
        target: "node",
        normalizeBuild: (d) => d as any,
      });

      const promise = waitForInitialBuild();
      resolveInitialBuild();

      await expect(promise).resolves.toBeUndefined();
    });

    it("이미 resolve된 후 다시 호출해도 안전하다", async () => {
      const worker = new MockWorker();

      const { waitForInitialBuild, resolveInitialBuild } = setupWatchEvents(worker, {
        name: "test-pkg",
        target: "node",
        normalizeBuild: (d) => d as any,
      });

      const promise = waitForInitialBuild();
      worker.emit("build", { success: true });
      await promise;

      // 이미 resolve된 후 수동 호출 — 에러 없음
      expect(() => resolveInitialBuild()).not.toThrow();
    });
  });

  //#region Feature 1.1 Slice 1: engine-watch-events warnings 전달

  describe("warnings 전달", () => {
    it("build 이벤트의 warnings를 ResultCollector에 저장한다", () => {
      const worker = new MockWorker();
      const resultCollector = new ResultCollector();

      setupWatchEvents(worker, {
        name: "client-app",
        target: "client",
        resultCollector,
        normalizeBuild: (d) => d as { success: boolean; warnings?: string[] },
      });

      worker.emit("build", { success: true, warnings: ["warn1"] });

      const result = resultCollector.get("client-app:build");
      expect(result?.status).toBe("success");
      expect(result?.warnings).toBe("warn1");
    });

    it("build 이벤트에 warnings가 없으면 undefined이다", () => {
      const worker = new MockWorker();
      const resultCollector = new ResultCollector();

      setupWatchEvents(worker, {
        name: "client-app",
        target: "client",
        resultCollector,
        normalizeBuild: (d) => d as { success: boolean },
      });

      worker.emit("build", { success: true });

      const result = resultCollector.get("client-app:build");
      expect(result?.warnings).toBeUndefined();
    });

    it("여러 warnings를 줄바꿈으로 결합하여 저장한다", () => {
      const worker = new MockWorker();
      const resultCollector = new ResultCollector();

      setupWatchEvents(worker, {
        name: "client-app",
        target: "client",
        resultCollector,
        normalizeBuild: (d) => d as { success: boolean; warnings?: string[] },
      });

      worker.emit("build", { success: true, warnings: ["warn1", "warn2"] });

      const result = resultCollector.get("client-app:build");
      expect(result?.warnings).toBe("warn1\nwarn2");
    });
  });

  //#endregion
});
