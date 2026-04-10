import { describe, it, expect } from "vitest";
import { EventEmitter } from "../src/features/event-emitter";
import { DebounceQueue } from "../src/features/debounce-queue";
import { SerialQueue } from "../src/features/serial-queue";
import { LazyGcMap } from "../src/types/lazy-gc-map";
import { ZipArchive } from "../src/utils/zip";

describe("Symbol.dispose/asyncDispose 제거", () => {
  it("EventEmitter에 Symbol.dispose가 없고 dispose()는 동작한다", () => {
    const emitter = new EventEmitter();
    expect(Symbol.dispose in emitter).toBe(false);

    emitter.on("test", () => {});
    expect(emitter.listenerCount("test")).toBe(1);
    emitter.dispose();
    expect(emitter.listenerCount("test")).toBe(0);
  });

  it("DebounceQueue에 Symbol.dispose가 없고 dispose()는 동작한다", () => {
    const queue = new DebounceQueue(100);
    expect(Symbol.dispose in queue).toBe(false);
    queue.dispose();
  });

  it("SerialQueue에 Symbol.dispose가 없고 dispose()는 동작한다", () => {
    const queue = new SerialQueue();
    expect(Symbol.dispose in queue).toBe(false);
    queue.dispose();
  });

  it("LazyGcMap에 Symbol.dispose가 없고 dispose()는 동작한다", () => {
    const map = new LazyGcMap<string, number>({ expireTime: 60000 });
    expect(Symbol.dispose in map).toBe(false);

    map.set("key", 1);
    expect(map.size).toBe(1);
    map.dispose();
    expect(map.size).toBe(0);
  });

  it("ZipArchive에 Symbol.asyncDispose가 없고 close()는 동작한다", async () => {
    const archive = new ZipArchive();
    expect(Symbol.asyncDispose in archive).toBe(false);
    await archive.close();
  });
});
