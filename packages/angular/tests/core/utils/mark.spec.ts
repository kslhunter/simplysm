import { computed, signal } from "@angular/core";
import { describe, expect, it } from "vitest";
import { mark } from "../../../src/core/utils/mark";

describe("Feature 1.1 Slice 1: mark signal utility", () => {
  describe("Rule: mark 호출 시 signal consumer에게 변경 알림을 보낸다", () => {
    it("객체 프로퍼티 mutation 후 mark → computed 재계산", () => {
      const sig = signal({ name: "before" });
      const derived = computed(() => sig().name);

      expect(derived()).toBe("before");

      sig().name = "after";
      mark(sig);

      expect(derived()).toBe("after");
    });

    it("중첩 객체 mutation 후 최상위 signal에 mark → computed 재계산", () => {
      const sig = signal({ a: { b: "before" } });
      const derived = computed(() => sig().a.b);

      expect(derived()).toBe("before");

      sig().a.b = "after";
      mark(sig);

      expect(derived()).toBe("after");
    });

    it("배열 push 후 mark → computed 재계산", () => {
      const sig = signal([1, 2, 3]);
      const derived = computed(() => sig().length);

      expect(derived()).toBe(3);

      sig().push(4);
      mark(sig);

      expect(derived()).toBe(4);
    });
  });

  describe("추가 케이스", () => {
    it("mutation 없이 mark만 호출해도 consumer가 재평가된다", () => {
      const sig = signal({ name: "same" });
      let evalCount = 0;
      const derived = computed(() => {
        evalCount++;
        return sig().name;
      });

      derived(); // 초기 평가
      evalCount = 0;

      mark(sig);
      derived(); // mark 후 재평가

      expect(evalCount).toBe(1);
    });
  });

  describe("Rule: clone 옵션 사용 시 새 참조를 생성하여 signal을 업데이트한다", () => {
    it("배열 clone → 새 배열 참조 생성", () => {
      const sig = signal([1, 2, 3]);
      const before = sig();

      sig().push(4);
      mark(sig, true);

      expect(sig()).not.toBe(before);
      expect(sig()).toEqual([1, 2, 3, 4]);
    });

    it("객체 clone → 새 객체 참조 생성", () => {
      const sig = signal({ name: "before" });
      const before = sig();

      sig().name = "after";
      mark(sig, true);

      expect(sig()).not.toBe(before);
      expect(sig().name).toBe("after");
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
