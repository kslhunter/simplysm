import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

interface MockWatcher extends EventEmitter {
  close: ReturnType<typeof vi.fn>;
}

function createMockWatcher(): MockWatcher {
  const emitter = new EventEmitter() as MockWatcher;
  emitter.close = vi.fn().mockResolvedValue(undefined);
  return emitter;
}

const mockWatchers: MockWatcher[] = [];

vi.mock("chokidar", () => ({
  watch: vi.fn(() => {
    const watcher = createMockWatcher();
    mockWatchers.push(watcher);
    return watcher;
  }),
}));

describe("FsWatcher EPERM recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWatchers.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createReadyWatcher() {
    const { FsWatcher } = await import("../../src/features/fs-watcher");
    const watchPromise = FsWatcher.watch(["/test/path"]);
    mockWatchers[mockWatchers.length - 1].emit("ready");
    return watchPromise;
  }

  function emitEperm(watcher: MockWatcher) {
    const err = new Error("EPERM: operation not permitted, watch") as NodeJS.ErrnoException;
    err.code = "EPERM";
    watcher.emit("error", err);
  }

  it("EPERM 에러 후 watcher를 재생성하고 onChange가 정상 동작한다", async () => {
    const fsWatcher = await createReadyWatcher();
    expect(mockWatchers).toHaveLength(1);

    const changes: Array<{ event: string; path: string }> = [];
    fsWatcher.onChange({ delay: 0 }, (infos) => {
      changes.push(...infos.map((c) => ({ event: c.event, path: c.path })));
    });

    emitEperm(mockWatchers[0]);

    // Advance past retry delay → new watcher created
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(2);

    // Emit ready → recovery complete
    mockWatchers[1].emit("ready");
    await vi.advanceTimersByTimeAsync(0);

    // File change on new watcher should trigger onChange
    mockWatchers[1].emit("all", "add", "/test/path/file.txt");
    await vi.advanceTimersByTimeAsync(0);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ event: "add", path: expect.stringContaining("file.txt") });

    await fsWatcher.close();
  });

  it("연속 실패 시 1초 간격으로 재시도한다", async () => {
    const fsWatcher = await createReadyWatcher();

    emitEperm(mockWatchers[0]);

    // After 500ms — no new watcher yet
    await vi.advanceTimersByTimeAsync(500);
    expect(mockWatchers).toHaveLength(1);

    // After 1000ms — first retry
    await vi.advanceTimersByTimeAsync(500);
    expect(mockWatchers).toHaveLength(2);

    // Fail (EPERM before ready) → loop continues
    emitEperm(mockWatchers[1]);

    // After another 1000ms — second retry
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(3);

    // Succeed this time
    mockWatchers[2].emit("ready");
    await vi.advanceTimersByTimeAsync(0);

    await fsWatcher.close();
  });

  it("최대 3회 재시도 후 재시도를 중단한다", async () => {
    const fsWatcher = await createReadyWatcher();

    emitEperm(mockWatchers[0]);

    // Retry 1: fail
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(2);
    emitEperm(mockWatchers[1]);

    // Retry 2: fail
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(3);
    emitEperm(mockWatchers[2]);

    // Retry 3: fail
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(4);
    emitEperm(mockWatchers[3]);

    // Max exceeded — no more retries
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockWatchers).toHaveLength(4);

    await fsWatcher.close();
  });

  it("성공적 재생성 후 재시도 카운터가 초기화된다", async () => {
    const fsWatcher = await createReadyWatcher();

    // First EPERM → successful recovery
    emitEperm(mockWatchers[0]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(2);
    mockWatchers[1].emit("ready");
    await vi.advanceTimersByTimeAsync(0);

    // Second EPERM → also recovers (counter was reset)
    emitEperm(mockWatchers[1]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(3);
    mockWatchers[2].emit("ready");
    await vi.advanceTimersByTimeAsync(0);

    // Third EPERM → still works (>3 total, but counter resets each time)
    emitEperm(mockWatchers[2]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(4);
    mockWatchers[3].emit("ready");
    await vi.advanceTimersByTimeAsync(0);

    // 4th EPERM → still works
    emitEperm(mockWatchers[3]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockWatchers).toHaveLength(5);

    await fsWatcher.close();
  });

  it("EPERM이 아닌 에러는 재시도하지 않는다", async () => {
    const fsWatcher = await createReadyWatcher();

    const err = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    mockWatchers[0].emit("error", err);

    await vi.advanceTimersByTimeAsync(2000);
    expect(mockWatchers).toHaveLength(1);

    await fsWatcher.close();
  });
});
