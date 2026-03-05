import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { createControllableStore } from "../../src/hooks/createControllableStore";
import { DateTime } from "@simplysm/core-common";

describe("createControllableStore", () => {
  it("calls onChange when store value changes", () => {
    const onChange = vi.fn();

    createRoot((dispose) => {
      const [store, setStore] = createControllableStore<{ name: string }>({
        value: () => ({ name: "a" }),
        onChange: () => onChange,
      });

      expect(store.name).toBe("a");

      setStore("name", "b");

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "b" }));
      dispose();
    });
  });

  it("does not call onChange when value is unchanged", () => {
    const onChange = vi.fn();

    createRoot((dispose) => {
      const [, setStore] = createControllableStore<{ name: string }>({
        value: () => ({ name: "a" }),
        onChange: () => onChange,
      });

      setStore("name", "a");

      expect(onChange).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("correctly detects changes in DateTime values", () => {
    const onChange = vi.fn();

    createRoot((dispose) => {
      const dt1 = new DateTime(2025, 1, 1, 0, 0, 0);
      const dt2 = new DateTime(2025, 6, 15, 12, 30, 0);

      const [, setStore] = createControllableStore<{ date: DateTime }>({
        value: () => ({ date: dt1 }),
        onChange: () => onChange,
      });

      // Change to different DateTime — should trigger onChange
      setStore("date", dt2);
      expect(onChange).toHaveBeenCalledTimes(1);

      onChange.mockClear();

      // Set same tick DateTime — should NOT trigger onChange
      setStore("date", new DateTime(dt2.tick));
      expect(onChange).not.toHaveBeenCalled();

      dispose();
    });
  });
});
