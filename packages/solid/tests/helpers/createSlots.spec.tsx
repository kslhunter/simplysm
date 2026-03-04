import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { createSlots } from "../../src/helpers/createSlots";

interface TestSlotProps {
  label: string;
  value: number;
}

describe("createSlots", () => {
  it("returns a [SlotComponent, useSlots] tuple", () => {
    const [SlotComponent, useSlots] = createSlots<TestSlotProps>();
    expect(typeof SlotComponent).toBe("function");
    expect(typeof useSlots).toBe("function");
  });

  it("useSlots returns [accessor, Provider] tuple", () => {
    createRoot((dispose) => {
      const [, useSlots] = createSlots<TestSlotProps>();
      const [items, Provider] = useSlots();
      expect(typeof items).toBe("function");
      expect(typeof Provider).toBe("function");
      dispose();
    });
  });

  it("accessor returns empty array initially", () => {
    createRoot((dispose) => {
      const [, useSlots] = createSlots<TestSlotProps>();
      const [items] = useSlots();
      expect(items()).toEqual([]);
      dispose();
    });
  });

  it("registering a SlotComponent via Provider adds item to accessor", () => {
    createRoot((dispose) => {
      const [SlotComponent, useSlots] = createSlots<TestSlotProps>();
      const [items, Provider] = useSlots();

      Provider({
        get children() {
          SlotComponent({ label: "alpha", value: 1 });
          return undefined;
        },
      });

      expect(items()).toHaveLength(1);
      expect(items()[0].label).toBe("alpha");
      expect(items()[0].value).toBe(1);
      dispose();
    });
  });

  it("registering multiple SlotComponents adds all items to accessor", () => {
    createRoot((dispose) => {
      const [SlotComponent, useSlots] = createSlots<TestSlotProps>();
      const [items, Provider] = useSlots();

      Provider({
        get children() {
          SlotComponent({ label: "first", value: 10 });
          SlotComponent({ label: "second", value: 20 });
          return undefined;
        },
      });

      expect(items()).toHaveLength(2);
      expect(items()[0].label).toBe("first");
      expect(items()[1].label).toBe("second");
      dispose();
    });
  });

  it("cleanup removes the registered item from accessor", () => {
    createRoot((dispose) => {
      const [SlotComponent, useSlots] = createSlots<TestSlotProps>();
      const [items, Provider] = useSlots();

      // Mount an inner root that registers a slot item
      const innerDispose = createRoot((disposeInner) => {
        Provider({
          get children() {
            SlotComponent({ label: "temp", value: 42 });
            return undefined;
          },
        });
        return disposeInner;
      });

      expect(items()).toHaveLength(1);

      // Dispose the inner root — triggers onCleanup in SlotComponent
      innerDispose();

      expect(items()).toEqual([]);
      dispose();
    });
  });
});
