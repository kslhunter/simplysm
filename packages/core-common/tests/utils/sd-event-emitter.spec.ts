import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "@simplysm/core-common";

interface TestEvents {
  message: string;
  count: number;
  data: { id: number; name: string };
  empty: void;
}

describe("SdEventEmitter", () => {
  //#region on/emit

  describe("on() / emit()", () => {
    it("이벤트 발행 및 수신", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.emit("message", "hello");

      expect(listener).toHaveBeenCalledWith("hello");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("복수 emit 시 리스너 복수 호출", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("count", listener);
      emitter.emit("count", 1);
      emitter.emit("count", 2);
      emitter.emit("count", 3);

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, 1);
      expect(listener).toHaveBeenNthCalledWith(2, 2);
      expect(listener).toHaveBeenNthCalledWith(3, 3);
    });

    it("같은 이벤트에 복수 리스너 등록 가능", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on("message", listener1);
      emitter.on("message", listener2);
      emitter.emit("message", "test");

      expect(listener1).toHaveBeenCalledWith("test");
      expect(listener2).toHaveBeenCalledWith("test");
    });
  });

  //#endregion

  //#region off

  describe("off()", () => {
    it("리스너 제거", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.off("message", listener);
      emitter.emit("message", "test");

      expect(listener).not.toHaveBeenCalled();
    });

    it("지정된 리스너만 제거, 나머지 유지", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on("message", listener1);
      emitter.on("message", listener2);
      emitter.off("message", listener1);
      emitter.emit("message", "test");

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith("test");
    });

    it("등록되지 않은 리스너 제거 시 오류 없음", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      // 오류 없이 실행되어야 함
      expect(() => {
        emitter.off("message", listener);
      }).not.toThrow();
    });
  });

  //#endregion

  //#region listenerCount

  describe("listenerCount()", () => {
    it("리스너 수를 정확히 카운트", () => {
      const emitter = new EventEmitter<TestEvents>();

      expect(emitter.listenerCount("message")).toBe(0);

      emitter.on("message", () => {});
      expect(emitter.listenerCount("message")).toBe(1);

      emitter.on("message", () => {});
      expect(emitter.listenerCount("message")).toBe(2);
    });

    it("off 후 카운트 감소", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      expect(emitter.listenerCount("message")).toBe(1);

      emitter.off("message", listener);
      expect(emitter.listenerCount("message")).toBe(0);
    });

    it("다른 이벤트 타입은 독립적인 카운트", () => {
      const emitter = new EventEmitter<TestEvents>();

      emitter.on("message", () => {});
      emitter.on("message", () => {});
      emitter.on("count", () => {});

      expect(emitter.listenerCount("message")).toBe(2);
      expect(emitter.listenerCount("count")).toBe(1);
    });
  });

  //#endregion

  //#region Prevent duplicate registration

  describe("중복 등록 방지", () => {
    it("같은 리스너의 중복 등록은 무시됨", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.on("message", listener); // duplicate registration attempt
      emitter.on("message", listener); // duplicate registration attempt

      expect(emitter.listenerCount("message")).toBe(1);

      emitter.emit("message", "test");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("같은 리스너를 다른 이벤트에 등록 가능", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.on("count", listener as any);

      expect(emitter.listenerCount("message")).toBe(1);
      expect(emitter.listenerCount("count")).toBe(1);

      emitter.emit("message", "test");
      emitter.emit("count", 123);

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, "test");
      expect(listener).toHaveBeenNthCalledWith(2, 123);
    });

    it("중복 등록 후 한 번의 off 호출로 제거", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.on("message", listener); // duplicate registration attempt

      emitter.off("message", listener);
      expect(emitter.listenerCount("message")).toBe(0);

      emitter.emit("message", "test");
      expect(listener).not.toHaveBeenCalled();
    });
  });

  //#endregion
});
