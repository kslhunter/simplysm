import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RebuildManager } from "../../src/runtime/rebuild-manager";

function createManager() {
  const logger = { start: vi.fn(), success: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const manager = new RebuildManager(logger as any);
  return { manager, logger };
}

describe("RebuildManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches concurrent builds into single batchComplete event", async () => {
    const { manager } = createManager();
    const batchComplete = vi.fn();
    manager.on("batchComplete", batchComplete);

    const resolverA = manager.registerBuild("a", "Build A");
    const resolverB = manager.registerBuild("b", "Build B");

    // Resolve both builds
    resolverA();
    resolverB();

    // 100ms 디바운스 타이머 소진 + Promise 해소
    await vi.advanceTimersByTimeAsync(100);

    expect(batchComplete).toHaveBeenCalledOnce();
  });

  it("runs new batch when builds registered during processing", async () => {
    const { manager } = createManager();
    const batchComplete = vi.fn();
    manager.on("batchComplete", batchComplete);

    const resolverA = manager.registerBuild("a", "Build A");
    resolverA();

    // 첫 번째 배치 타이머 소진 → _runBatch 시작
    await vi.advanceTimersByTimeAsync(100);

    expect(batchComplete).toHaveBeenCalledTimes(1);

    // 첫 번째 배치 완료 후 새 빌드 등록
    const resolverB = manager.registerBuild("b", "Build B");
    resolverB();

    // 두 번째 배치 타이머 소진
    await vi.advanceTimersByTimeAsync(100);

    expect(batchComplete).toHaveBeenCalledTimes(2);
  });
});
