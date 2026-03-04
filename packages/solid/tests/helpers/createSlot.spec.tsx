import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { createSlot } from "../../src/helpers/createSlot";

interface TestSlotProps {
  label: string;
  value: number;
}

describe("createSlot", () => {
  it("returns a [SlotComponent, useSlot] tuple", () => {
    const [SlotComponent, useSlot] = createSlot<TestSlotProps>();
    expect(typeof SlotComponent).toBe("function");
    expect(typeof useSlot).toBe("function");
  });

  it("useSlot returns [accessor, Provider] tuple", () => {
    createRoot((dispose) => {
      const [, useSlot] = createSlot<TestSlotProps>();
      const [item, Provider] = useSlot();
      expect(typeof item).toBe("function");
      expect(typeof Provider).toBe("function");
      dispose();
    });
  });

  it("accessor returns undefined initially", () => {
    createRoot((dispose) => {
      const [, useSlot] = createSlot<TestSlotProps>();
      const [item] = useSlot();
      expect(item()).toBeUndefined();
      dispose();
    });
  });

  it("registering a SlotComponent via Provider sets item in accessor", () => {
    createRoot((dispose) => {
      const [SlotComponent, useSlot] = createSlot<TestSlotProps>();
      const [item, Provider] = useSlot();

      Provider({
        get children() {
          SlotComponent({ label: "alpha", value: 1 });
          return undefined;
        },
      });

      expect(item()).toBeDefined();
      expect(item()!.label).toBe("alpha");
      expect(item()!.value).toBe(1);
      dispose();
    });
  });

  it("cleanup removes the registered item from accessor", () => {
    createRoot((dispose) => {
      const [SlotComponent, useSlot] = createSlot<TestSlotProps>();
      const [item, Provider] = useSlot();

      // Mount an inner root that registers a slot item
      const innerDispose = createRoot((disposeInner) => {
        Provider({
          get children() {
            SlotComponent({ label: "temp", value: 99 });
            return undefined;
          },
        });
        return disposeInner;
      });

      expect(item()).toBeDefined();

      // Dispose the inner root — triggers onCleanup in SlotComponent
      innerDispose();

      expect(item()).toBeUndefined();
      dispose();
    });
  });

  it("throws 'Slot already occupied' when a second SlotComponent is registered", () => {
    createRoot((dispose) => {
      const [SlotComponent, useSlot] = createSlot<TestSlotProps>();
      const [, Provider] = useSlot();

      expect(() => {
        Provider({
          get children() {
            SlotComponent({ label: "first", value: 1 });
            SlotComponent({ label: "second", value: 2 });
            return undefined;
          },
        });
      }).toThrow("Slot already occupied");

      dispose();
    });
  });
});
