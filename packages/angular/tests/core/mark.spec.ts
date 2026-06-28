import { computed, signal } from "@angular/core";
import { describe, expect, it } from "vitest";
import { mark } from "../../src/core/mark";

describe("Feature 2.1 Slice 1: mark() 함수 안전성 확보", () => {
  describe("Rule: mark()는 shallow copy로 새 참조를 생성하여 signal을 업데이트한다", () => {
    it("배열 내 객체 프로퍼티 mutation 후 mark → 새 배열 참조, 내부 객체 참조 유지, computed 재계산", () => {
      const item = { name: "before", isDeleted: false };
      const sig = signal([item]);
      const derived = computed(() => sig()[0].isDeleted);

      expect(derived()).toBe(false);

      const beforeArr = sig();
      item.isDeleted = true;
      mark(sig);

      expect(derived()).toBe(true);
      expect(sig()).not.toBe(beforeArr);
      expect(sig()[0]).toBe(item);
    });

    it("객체 signal mark → 새 객체 참조, 소비자 재평가", () => {
      const sig = signal({ key: "value" });
      const beforeRef = sig();
      let evalCount = 0;
      const derived = computed(() => {
        evalCount++;
        return sig().key;
      });

      derived();
      evalCount = 0;

      mark(sig);
      derived();

      expect(evalCount).toBe(1);
      expect(sig()).not.toBe(beforeRef);
    });

    it("중첩 객체 mutation 후 mark → computed가 변경된 값을 반영", () => {
      const sig = signal({ a: { b: "before" } });
      const derived = computed(() => sig().a.b);

      sig().a.b = "after";
      mark(sig);

      expect(derived()).toBe("after");
    });

    it("배열 push 후 mark → 새 배열 참조에 추가된 요소 포함", () => {
      const sig = signal([1, 2, 3]);
      const derived = computed(() => sig().length);

      sig().push(4);
      mark(sig);

      expect(derived()).toBe(4);
      expect(sig()).toEqual([1, 2, 3, 4]);
    });

    it("undefined 값에 mark → undefined 유지(객체로 깨지지 않음)", () => {
      const sig = signal<{ x: number } | undefined>(undefined);
      mark(sig);
      expect(sig()).toBeUndefined();
    });
  });

  describe("Rule: update 불허 context에서는 에러를 던진다", () => {
    it("computed 내부에서 mark 호출 → Error", () => {
      const sig = signal({ name: "test" });
      const derived = computed(() => {
        mark(sig);
        return sig().name;
      });

      expect(() => derived()).toThrow();
    });
  });
});
