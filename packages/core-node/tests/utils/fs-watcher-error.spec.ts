import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

const closeFn = vi.fn().mockResolvedValue(undefined);

vi.mock("chokidar", () => {
  const mockEmitter = new EventEmitter();
  Object.assign(mockEmitter, { close: closeFn });

  return {
    watch: vi.fn().mockReturnValue(mockEmitter),
    __mockEmitter: mockEmitter,
  };
});

describe("FsWatcher.watch() error handling", () => {
  it("rejects and closes watcher when error occurs during initialization", async () => {
    const chokidar = await import("chokidar");
    const mockEmitter = (chokidar as unknown as { __mockEmitter: EventEmitter }).__mockEmitter;
    const { FsWatcher } = await import("../../src/features/fs-watcher");

    closeFn.mockClear();

    const watchPromise = FsWatcher.watch(["/nonexistent"]);
    mockEmitter.emit("error", new Error("test error"));

    await expect(watchPromise).rejects.toThrow("test error");
    expect(closeFn).toHaveBeenCalled();
  });
});
