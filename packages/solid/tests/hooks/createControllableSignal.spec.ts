import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { createControllableSignal } from "../../src/hooks/createControllableSignal";

describe("createControllableSignal hook", () => {
  describe("Controlled mode (onChange provided)", () => {
    it("calls onChange when setValue is called with onChange provided", () => {
      const onChange = vi.fn();

      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => false,
          onChange: () => onChange,
        });

        expect(value()).toBe(false);

        setValue(true);

        expect(onChange).toHaveBeenCalledWith(true);
        dispose();
      });
    });

    it("value() returns externally provided value when onChange is provided", () => {
      const onChange = vi.fn();
      let externalValue = false;

      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => externalValue,
          onChange: () => onChange,
        });

        expect(value()).toBe(false);

        // In controlled mode, internal state does not change
        setValue(true);

        // Still false since external value didn't change
        expect(value()).toBe(false);

        // Simulate external value change
        externalValue = true;
        expect(value()).toBe(true);

        dispose();
      });
    });
  });

  describe("Uncontrolled mode (onChange not provided)", () => {
    it("updates internal state when setValue is called without onChange", () => {
      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => false,
          onChange: () => undefined,
        });

        expect(value()).toBe(false);

        setValue(true);

        expect(value()).toBe(true);
        dispose();
      });
    });

    it("value() is set to initial value when onChange is not provided", () => {
      createRoot((dispose) => {
        const [value] = createControllableSignal({
          value: () => "initial",
          onChange: () => undefined,
        });

        expect(value()).toBe("initial");
        dispose();
      });
    });
  });

  describe("Function-form setter", () => {
    it("computes new value using previous value as argument when passing function", () => {
      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => 5,
          onChange: () => undefined,
        });

        expect(value()).toBe(5);

        setValue((prev) => prev + 10);

        expect(value()).toBe(15);
        dispose();
      });
    });

    it("function-form setter works in controlled mode", () => {
      const onChange = vi.fn();

      createRoot((dispose) => {
        const [, setValue] = createControllableSignal({
          value: () => 10,
          onChange: () => onChange,
        });

        setValue((prev: number) => prev * 2);

        expect(onChange).toHaveBeenCalledWith(20);
        dispose();
      });
    });

    it("toggle pattern works correctly", () => {
      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => false,
          onChange: () => undefined,
        });

        expect(value()).toBe(false);

        setValue((v: boolean) => !v);
        expect(value()).toBe(true);

        setValue((v: boolean) => !v);
        expect(value()).toBe(false);

        dispose();
      });
    });
  });

  describe("Support various types", () => {
    it("supports number type", () => {
      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => 0,
          onChange: () => undefined,
        });

        setValue(42);
        expect(value()).toBe(42);
        dispose();
      });
    });

    it("supports string type", () => {
      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => "hello",
          onChange: () => undefined,
        });

        setValue("world");
        expect(value()).toBe("world");
        dispose();
      });
    });

    it("supports object type", () => {
      createRoot((dispose) => {
        const [value, setValue] = createControllableSignal({
          value: () => ({ count: 0 }),
          onChange: () => undefined,
        });

        setValue({ count: 10 });
        expect(value()).toEqual({ count: 10 });
        dispose();
      });
    });

    it("can store function wrapped in object", () => {
      createRoot((dispose) => {
        const fn1 = () => "first";
        const fn2 = () => "second";

        const [value, setValue] = createControllableSignal({
          value: () => ({ fn: fn1 }),
          onChange: () => undefined,
        });

        expect(value().fn()).toBe("first");

        setValue({ fn: fn2 });
        expect(value().fn()).toBe("second");

        dispose();
      });
    });
  });
});
