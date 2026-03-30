import { describe, it, expect, vi } from "vitest";
import { signal } from "@angular/core";
import { setupModelHook } from "../../../../src/core/utils/setups/setupModelHook";

describe("FIX-1 Slice 1: setupModelHook Promise 결과 존중", () => {
  describe("Rule: setupModelHook은 canFn의 비동기 결과를 존중해야 한다", () => {
    it("canFn이 Promise<false>를 반환하면 orgSet이 호출되지 않고 값이 유지된다", async () => {
      const model = signal(0);
      const canFn = signal(
        (_value: number) => Promise.resolve(false),
      );
      setupModelHook(model, canFn);

      model.set(42);
      await new Promise((r) => setTimeout(r, 0));
      expect(model()).toBe(0);
    });

    it("canFn의 Promise가 reject되면 orgSet이 호출되지 않고 unhandled rejection이 발생하지 않는다", async () => {
      const model = signal(0);
      const canFn = signal(
        (_value: number) => Promise.reject(new Error("test reject")),
      );
      setupModelHook(model, canFn);

      const unhandledSpy = vi.fn();
      window.addEventListener("unhandledrejection", unhandledSpy);

      model.set(42);
      await new Promise((r) => setTimeout(r, 0));

      expect(model()).toBe(0);
      expect(unhandledSpy).not.toHaveBeenCalled();

      window.removeEventListener("unhandledrejection", unhandledSpy);
    });
  });
});

describe("Feature 1.7 Slice 1: 독립 유틸리티", () => {
  describe("Rule: setupModelHook이 모델 업데이트 전 검증을 수행한다", () => {
    it("검증 함수가 true 반환 시 즉시 업데이트", () => {
      const model = signal(0);
      const canFn = signal((_value: number) => true as boolean | Promise<boolean>);
      setupModelHook(model, canFn);

      model.set(42);
      expect(model()).toBe(42);
    });

    it("검증 함수가 false 반환 시 차단", () => {
      const model = signal(0);
      const canFn = signal((_value: number) => false as boolean | Promise<boolean>);
      setupModelHook(model, canFn);

      model.set(42);
      expect(model()).toBe(0);
    });

    it("검증 함수가 Promise 반환 시 비동기 업데이트", async () => {
      const model = signal(0);
      let resolvePromise!: () => void;
      const canFn = signal(
        (_value: number) => new Promise<boolean>((resolve) => {
          resolvePromise = () => resolve(true);
        }),
      );
      setupModelHook(model, canFn);

      model.set(42);
      expect(model()).toBe(0);

      resolvePromise();
      await new Promise((r) => setTimeout(r, 0));
      expect(model()).toBe(42);
    });
  });
});
