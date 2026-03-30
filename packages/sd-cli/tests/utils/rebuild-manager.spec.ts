import { describe, it, expect, vi } from "vitest";
import { RebuildManager } from "../../src/utils/rebuild-manager";

function createManager() {
  const logger = { start: vi.fn(), success: vi.fn(), error: vi.fn() };
  const manager = new RebuildManager(logger as any);
  return { manager, logger };
}

describe("RebuildManager", () => {
  it("batches concurrent builds into single batchComplete event", async () => {
    const { manager } = createManager();
    const batchComplete = vi.fn();
    manager.on("batchComplete", batchComplete);

    const resolverA = manager.registerBuild("a", "Build A");
    const resolverB = manager.registerBuild("b", "Build B");

    // Resolve both builds
    resolverA();
    resolverB();

    // Wait for batch to process (microtask)
    await new Promise((r) => setTimeout(r, 50));

    expect(batchComplete).toHaveBeenCalledOnce();
  });

  it("runs new batch when builds registered during processing", async () => {
    const { manager } = createManager();
    const batchComplete = vi.fn();
    manager.on("batchComplete", batchComplete);

    const resolverA = manager.registerBuild("a", "Build A");
    resolverA();

    // Wait for first batch to start, then register new build
    await new Promise((r) => setTimeout(r, 10));
    const resolverB = manager.registerBuild("b", "Build B");
    resolverB();

    await new Promise((r) => setTimeout(r, 100));

    expect(batchComplete).toHaveBeenCalledTimes(2);
  });
});
