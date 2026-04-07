import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useDataSheetFilterManager } from "../../../src/features/data-view/useDataSheetFilterManager";

function createManager(initialFilter: Record<string, any> = { name: "test" }) {
  const bindFilter = signal(initialFilter);
  const busyCount = signal(0);
  const canUse = signal(true);
  const page = signal(0);
  const checkIgnoreChanges = signal(true);

  const mgr = TestBed.runInInjectionContext(() =>
    useDataSheetFilterManager({
      bindFilter: () => bindFilter(),
      busyCount,
      canUse: () => canUse(),
      page,
      checkIgnoreChanges: () => checkIgnoreChanges(),
    }),
  );

  return { mgr, bindFilter, busyCount, page };
}

describe("useDataSheetFilterManager", () => {
  describe("filter/lastFilter 초기화", () => {
    it("bindFilter 변경 시 filter가 새 값으로 초기화된다", () => {
      const { mgr, bindFilter } = createManager({ name: "init" });
      TestBed.flushEffects();

      expect(mgr.filter()).toEqual({ name: "init" });

      bindFilter.set({ name: "updated" });
      TestBed.flushEffects();

      expect(mgr.filter()).toEqual({ name: "updated" });
    });

    it("bindFilter 변경 시 lastFilter가 deep clone으로 초기화된다", () => {
      const original = { name: "test", nested: { value: 1 } };
      const { mgr } = createManager(original);
      TestBed.flushEffects();

      const lastFilter = mgr.lastFilter();
      expect(lastFilter).toEqual(original);
      expect(lastFilter).not.toBe(original);
    });
  });

  describe("filter 로컬 수정", () => {
    it("filter.set()으로 로컬 수정 가능하다", () => {
      const { mgr } = createManager({ name: "init" });
      TestBed.flushEffects();

      mgr.filter.set({ name: "local" });
      expect(mgr.filter()).toEqual({ name: "local" });
    });

    it("filter 로컬 수정 시 lastFilter는 변경되지 않는다", () => {
      const { mgr } = createManager({ name: "init" });
      TestBed.flushEffects();

      mgr.filter.set({ name: "local" });
      expect(mgr.lastFilter()).toEqual({ name: "init" });
    });
  });

  describe("doFilterSubmit", () => {
    it("submit 시 lastFilter가 filter의 clone으로 갱신된다", () => {
      const { mgr } = createManager({ name: "init" });
      TestBed.flushEffects();

      mgr.filter.set({ name: "changed" });
      mgr.doFilterSubmit();

      expect(mgr.lastFilter()).toEqual({ name: "changed" });
      expect(mgr.lastFilter()).not.toBe(mgr.filter());
    });

    it("submit 시 page가 0으로 리셋된다", () => {
      const { mgr, page } = createManager();
      TestBed.flushEffects();

      page.set(5);
      mgr.doFilterSubmit();
      expect(page()).toBe(0);
    });

    it("busyCount > 0이면 submit이 무시된다", () => {
      const { mgr, busyCount, page } = createManager();
      TestBed.flushEffects();

      busyCount.set(1);
      page.set(3);
      mgr.filter.set({ name: "changed" });
      mgr.doFilterSubmit();

      expect(page()).toBe(3);
    });
  });
});
