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
    it("이벤트를 발생시키고 수신한다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.emit("message", "hello");

      expect(listener).toHaveBeenCalledWith("hello");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("여러 번 emit하면 리스너가 여러 번 호출된다", () => {
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

    it("객체 데이터를 전달한다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("data", listener);
      emitter.emit("data", { id: 1, name: "test" });

      expect(listener).toHaveBeenCalledWith({ id: 1, name: "test" });
    });

    it("void 이벤트를 처리한다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("empty", listener);
      emitter.emit("empty");

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("같은 이벤트에 여러 리스너를 등록할 수 있다", () => {
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
    it("리스너를 해제한다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.off("message", listener);
      emitter.emit("message", "test");

      expect(listener).not.toHaveBeenCalled();
    });

    it("해제된 리스너만 제거되고 다른 리스너는 유지된다", () => {
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

    it("등록되지 않은 리스너를 해제해도 에러가 발생하지 않는다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      // 에러 없이 실행되어야 함
      expect(() => {
        emitter.off("message", listener);
      }).not.toThrow();
    });
  });

  //#endregion

  //#region listenerCount

  describe("listenerCount()", () => {
    it("리스너 수를 정확히 카운트한다", () => {
      const emitter = new EventEmitter<TestEvents>();

      expect(emitter.listenerCount("message")).toBe(0);

      emitter.on("message", () => {});
      expect(emitter.listenerCount("message")).toBe(1);

      emitter.on("message", () => {});
      expect(emitter.listenerCount("message")).toBe(2);
    });

    it("off 후 카운트가 감소한다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      expect(emitter.listenerCount("message")).toBe(1);

      emitter.off("message", listener);
      expect(emitter.listenerCount("message")).toBe(0);
    });

    it("등록되지 않은 이벤트 타입의 카운트는 0이다", () => {
      const emitter = new EventEmitter<TestEvents>();

      expect(emitter.listenerCount("message")).toBe(0);
      expect(emitter.listenerCount("count")).toBe(0);
    });

    it("다른 이벤트 타입의 카운트는 독립적이다", () => {
      const emitter = new EventEmitter<TestEvents>();

      emitter.on("message", () => {});
      emitter.on("message", () => {});
      emitter.on("count", () => {});

      expect(emitter.listenerCount("message")).toBe(2);
      expect(emitter.listenerCount("count")).toBe(1);
    });
  });

  //#endregion

  //#region 중복 등록 방지

  describe("중복 등록 방지", () => {
    it("동일한 리스너를 중복 등록하면 무시된다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.on("message", listener); // 중복 등록 시도
      emitter.on("message", listener); // 중복 등록 시도

      expect(emitter.listenerCount("message")).toBe(1);

      emitter.emit("message", "test");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("동일한 리스너를 서로 다른 이벤트에 등록할 수 있다", () => {
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

    it("중복 등록 후 off 한 번 호출로 제거된다", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.on("message", listener); // 중복 등록 시도

      emitter.off("message", listener);
      expect(emitter.listenerCount("message")).toBe(0);

      emitter.emit("message", "test");
      expect(listener).not.toHaveBeenCalled();
    });
  });

  //#endregion
});
