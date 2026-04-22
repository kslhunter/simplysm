import { describe, it, expect, vi } from "vitest";
import { ErrorHandler, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { setupModelHook } from "../../src/core/setupModelHook";

describe("FIX-1 Slice 1: setupModelHook Promise 결과 존중", () => {
  describe("Rule: setupModelHook은 canFn의 비동기 결과를 존중해야 한다", () => {
    it("canFn이 Promise<false>를 반환하면 orgSet이 호출되지 않고 값이 유지된다", async () => {
      const model = signal(0);
      const canFn = signal(
        (_value: number) => Promise.resolve(false),
      );
      TestBed.runInInjectionContext(() => {
        setupModelHook(model, canFn);
      });

      model.set(42);
      await new Promise((r) => setTimeout(r, 0));
      expect(model()).toBe(0);
    });

    it("canFn의 Promise가 reject되면 orgSet이 호출되지 않고 ErrorHandler.handleError가 호출된다", async () => {
      const mockErrorHandler = { handleError: vi.fn() };
      TestBed.configureTestingModule({
        providers: [{ provide: ErrorHandler, useValue: mockErrorHandler }],
      });

      const model = signal(0);
      const canFn = signal(
        (_value: number) => Promise.reject(new Error("test reject")),
      );
      TestBed.runInInjectionContext(() => {
        setupModelHook(model, canFn);
      });

      model.set(42);
      await new Promise((r) => setTimeout(r, 0));

      expect(model()).toBe(0);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "test reject" }),
      );
    });
  });
});

describe("Feature 1.3: model.update도 canFn 검증을 거친다", () => {
  it("update 호출 시 canFn이 false를 반환하면 값이 변경되지 않는다", () => {
    const model = signal(0);
    const canFn = signal((_value: number) => false);
    TestBed.runInInjectionContext(() => {
      setupModelHook(model, canFn);
    });

    model.update((v) => v + 1);
    expect(model()).toBe(0);
  });

  it("update 호출 시 canFn이 true를 반환하면 값이 정상 변경된다", () => {
    const model = signal(0);
    const canFn = signal((_value: number) => true);
    TestBed.runInInjectionContext(() => {
      setupModelHook(model, canFn);
    });

    model.update((v) => v + 1);
    expect(model()).toBe(1);
  });

  it("update 호출 시 canFn이 Promise<true>를 반환하면 resolve 후 값이 변경된다", async () => {
    const model = signal(0);
    const canFn = signal(
      (_value: number) => Promise.resolve(true),
    );
    TestBed.runInInjectionContext(() => {
      setupModelHook(model, canFn);
    });

    model.update((v) => v + 1);
    expect(model()).toBe(0);

    await new Promise((r) => setTimeout(r, 0));
    expect(model()).toBe(1);
  });

  it("update 호출 시 canFn이 Promise<false>를 반환하면 값이 변경되지 않는다", async () => {
    const model = signal(0);
    const canFn = signal(
      (_value: number) => Promise.resolve(false),
    );
    TestBed.runInInjectionContext(() => {
      setupModelHook(model, canFn);
    });

    model.update((v) => v + 1);
    await new Promise((r) => setTimeout(r, 0));
    expect(model()).toBe(0);
  });
});

describe("Feature 1.2: model.update async canFn stale value 방지 (LOGIC-005)", () => {
  it("async canFn resolve 후 fresh value로 set — 대기 중 model이 변경되면 fn(model())을 재계산한다", async () => {
    const model = signal(0);
    let resolveCanFn!: (val: boolean) => void;
    const canFn = signal((value: number) => {
      if (value >= 10) {
        return new Promise<boolean>((resolve) => {
          resolveCanFn = resolve;
        });
      }
      return true;
    });
    TestBed.runInInjectionContext(() => {
      setupModelHook(model, canFn);
    });

    // model.update(v => v + 10) → fn(0) = 10 → canFn(10) returns Promise
    model.update((v) => v + 10);
    expect(model()).toBe(0);

    // model.set(5) → canFn(5) returns true → immediately sets to 5
    model.set(5);
    expect(model()).toBe(5);

    // Resolve the async canFn from update
    resolveCanFn(true);
    await new Promise((r) => setTimeout(r, 0));

    // canFn이 검증한 값(10)이 설정됨 — 검증 후 재계산하지 않음
    expect(model()).toBe(10);
  });

  it("model.update에서 async canFn이 reject되면 ErrorHandler.handleError가 호출된다", async () => {
    const mockErrorHandler = { handleError: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useValue: mockErrorHandler }],
    });

    const model = signal(0);
    const canFn = signal(
      (_value: number) => Promise.reject(new Error("update reject")),
    );
    TestBed.runInInjectionContext(() => {
      setupModelHook(model, canFn);
    });

    model.update((v) => v + 1);
    await new Promise((r) => setTimeout(r, 0));

    expect(model()).toBe(0);
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "update reject" }),
    );
  });

  it("동기 canFn은 기존과 동일하게 model.set에 위임하여 즉시 set한다", () => {
    const model = signal(0);
    const canFn = signal((_value: number) => true);
    TestBed.runInInjectionContext(() => {
      setupModelHook(model, canFn);
    });

    model.update((v) => v + 1);
    expect(model()).toBe(1);
  });
});

describe("Feature 1.7 Slice 1: 독립 유틸리티", () => {
  describe("Rule: setupModelHook이 모델 업데이트 전 검증을 수행한다", () => {
    it("검증 함수가 true 반환 시 즉시 업데이트", () => {
      const model = signal(0);
      const canFn = signal((_value: number) => true);
      TestBed.runInInjectionContext(() => {
        setupModelHook(model, canFn);
      });

      model.set(42);
      expect(model()).toBe(42);
    });

    it("검증 함수가 false 반환 시 차단", () => {
      const model = signal(0);
      const canFn = signal((_value: number) => false);
      TestBed.runInInjectionContext(() => {
        setupModelHook(model, canFn);
      });

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
      TestBed.runInInjectionContext(() => {
        setupModelHook(model, canFn);
      });

      model.set(42);
      expect(model()).toBe(0);

      resolvePromise();
      await new Promise((r) => setTimeout(r, 0));
      expect(model()).toBe(42);
    });
  });
});
