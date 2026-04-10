import { describe, it, expect } from "vitest";
import { DebounceQueue } from "../src/features/debounce-queue";
import { SerialQueue } from "../src/features/serial-queue";

describe("Symbol.dispose 제거 후 상속 체인 동작", () => {
  it("DebounceQueue.dispose()는 상위 EventEmitter 리스너도 정리한다", () => {
    const queue = new DebounceQueue(100);
    queue.on("error", () => {});
    expect(queue.listenerCount("error")).toBe(1);
    queue.dispose();
    expect(queue.listenerCount("error")).toBe(0);
  });

  it("SerialQueue.dispose()는 상위 EventEmitter 리스너도 정리한다", () => {
    const queue = new SerialQueue();
    queue.on("error", () => {});
    expect(queue.listenerCount("error")).toBe(1);
    queue.dispose();
    expect(queue.listenerCount("error")).toBe(0);
  });
});
