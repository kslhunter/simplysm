import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { withBusy } from "../../src/core/withBusy";

describe("withBusy", () => {
  it("정상 완료 시 busyCount가 0 → 1 → 0으로 복귀한다", async () => {
    const busyCount = signal(0);
    let observedDuringFn: number | undefined;

    await withBusy(busyCount, () => {
      observedDuringFn = busyCount();
      return Promise.resolve();
    });

    expect(observedDuringFn).toBe(1);
    expect(busyCount()).toBe(0);
  });

  it("fn이 Error를 throw해도 busyCount가 복귀한다", async () => {
    const busyCount = signal(0);

    await expect(
      withBusy(busyCount, () => Promise.reject(new Error("test error"))),
    ).rejects.toThrow("test error");

    expect(busyCount()).toBe(0);
  });

  it("fn이 non-Error 값을 throw해도 busyCount가 복귀한다", async () => {
    const busyCount = signal(0);

    await expect(
      withBusy(busyCount, () => Promise.reject("string error")),
    ).rejects.toBe("string error");

    expect(busyCount()).toBe(0);
  });

  it("동시 실행 시 각 busyCount 증감이 독립적으로 보장된다", async () => {
    const busyCount = signal(0);
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;

    const first = withBusy(
      busyCount,
      () => new Promise<void>((r) => (resolveFirst = r)),
    );
    expect(busyCount()).toBe(1);

    const second = withBusy(
      busyCount,
      () => new Promise<void>((r) => (resolveSecond = r)),
    );
    expect(busyCount()).toBe(2);

    resolveFirst();
    await first;
    expect(busyCount()).toBe(1);

    resolveSecond();
    await second;
    expect(busyCount()).toBe(0);
  });
});
