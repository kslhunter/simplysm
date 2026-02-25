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
    it("Emits and receives event", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.emit("message", "hello");

      expect(listener).toHaveBeenCalledWith("hello");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("Listener called multiple times on multiple emit", () => {
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

    it("Passes object data", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("data", listener);
      emitter.emit("data", { id: 1, name: "test" });

      expect(listener).toHaveBeenCalledWith({ id: 1, name: "test" });
    });

    it("Handles void event", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("empty", listener);
      emitter.emit("empty");

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("Can register multiple listeners for same event", () => {
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
    it("Removes listener", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.off("message", listener);
      emitter.emit("message", "test");

      expect(listener).not.toHaveBeenCalled();
    });

    it("Removes only specified listener, others remain", () => {
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

    it("No error removing unregistered listener", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      // Should run without error
      expect(() => {
        emitter.off("message", listener);
      }).not.toThrow();
    });
  });

  //#endregion

  //#region listenerCount

  describe("listenerCount()", () => {
    it("Accurately counts listeners", () => {
      const emitter = new EventEmitter<TestEvents>();

      expect(emitter.listenerCount("message")).toBe(0);

      emitter.on("message", () => {});
      expect(emitter.listenerCount("message")).toBe(1);

      emitter.on("message", () => {});
      expect(emitter.listenerCount("message")).toBe(2);
    });

    it("Count decreases after off", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      expect(emitter.listenerCount("message")).toBe(1);

      emitter.off("message", listener);
      expect(emitter.listenerCount("message")).toBe(0);
    });

    it("Unregistered event type has 0 count", () => {
      const emitter = new EventEmitter<TestEvents>();

      expect(emitter.listenerCount("message")).toBe(0);
      expect(emitter.listenerCount("count")).toBe(0);
    });

    it("Different event types have independent counts", () => {
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

  describe("Prevent duplicate registration", () => {
    it("Duplicate registration of same listener is ignored", () => {
      const emitter = new EventEmitter<TestEvents>();
      const listener = vi.fn();

      emitter.on("message", listener);
      emitter.on("message", listener); // duplicate registration attempt
      emitter.on("message", listener); // duplicate registration attempt

      expect(emitter.listenerCount("message")).toBe(1);

      emitter.emit("message", "test");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("Can register same listener to different events", () => {
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

    it("Single off call removes after duplicate registration", () => {
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
