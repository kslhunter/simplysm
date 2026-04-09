import { describe, it, expect, vi } from "vitest";
import { stopEngineWorker } from "../../src/utils/engine-stop";

function createMockWorker() {
  return {
    stopWatch: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("stopEngineWorker", () => {
  it("calls stopWatch and terminate in watch mode", async () => {
    const worker = createMockWorker();
    await stopEngineWorker(worker, true);

    expect(worker.stopWatch).toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("skips stopWatch in non-watch mode", async () => {
    const worker = createMockWorker();
    await stopEngineWorker(worker, false);

    expect(worker.stopWatch).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("does nothing when worker is undefined", async () => {
    await expect(stopEngineWorker(undefined, false)).resolves.toBeUndefined();
    await expect(stopEngineWorker(undefined, true)).resolves.toBeUndefined();
  });

  it("still terminates if stopWatch throws", async () => {
    const worker = createMockWorker();
    worker.stopWatch.mockRejectedValue(new Error("stopWatch failed"));

    await stopEngineWorker(worker, true);

    expect(worker.terminate).toHaveBeenCalled();
  });

  it("terminates even if stopWatch hangs (timeout)", async () => {
    vi.useFakeTimers();
    try {
      const worker = createMockWorker();
      // stopWatch never resolves
      worker.stopWatch.mockReturnValue(new Promise(() => {}));

      const stopPromise = stopEngineWorker(worker, true);

      // Advance past SHUTDOWN_TIMEOUT (3000ms)
      await vi.advanceTimersByTimeAsync(3000);

      await stopPromise;

      expect(worker.terminate).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
