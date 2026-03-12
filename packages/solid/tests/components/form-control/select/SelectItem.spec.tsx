import type { JSX } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import {
  Select,
  SelectContext,
  type SelectContextValue,
} from "../../../../src/components/form-control/select/Select";

// Test provider
function TestProvider(props: { children: JSX.Element; value: SelectContextValue }) {

  return <SelectContext.Provider value={props.value}>{props.children}</SelectContext.Provider>;
}

describe("SelectItem component", () => {
  describe("selection behavior", () => {
    it("calls toggleValue on click", () => {
      const toggleValue = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue,
        closeDropdown: vi.fn(),
        setItemTemplate: vi.fn(),
        size: () => "md" as const,
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <Select.Item value="apple">사과</Select.Item>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(toggleValue).toHaveBeenCalledWith("apple");
    });

    it("calls closeDropdown on click in single selection mode", () => {
      const closeDropdown = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown,
        setItemTemplate: vi.fn(),
        size: () => "md" as const,
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <Select.Item value="apple">사과</Select.Item>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(closeDropdown).toHaveBeenCalled();
    });

    it("does not call closeDropdown on click in multiple selection mode", () => {
      const closeDropdown = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => true,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown,
        setItemTemplate: vi.fn(),
        size: () => "md" as const,
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <Select.Item value="apple">사과</Select.Item>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(closeDropdown).not.toHaveBeenCalled();
    });
  });

  describe("selected state", () => {
    it("sets aria-selected=true on selected item", () => {
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: (v: unknown) => v === "apple",
        toggleValue: vi.fn(),
        closeDropdown: vi.fn(),
        setItemTemplate: vi.fn(),
        size: () => "md" as const,
      };

      render(() => (
        <TestProvider value={mockContext}>
          <Select.Item value="apple">사과</Select.Item>
        </TestProvider>
      ));

      const item = document.querySelector("[data-select-item]");
      expect(item?.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("disabled state", () => {
    it("does not call toggleValue on click when disabled", () => {
      const toggleValue = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue,
        closeDropdown: vi.fn(),
        setItemTemplate: vi.fn(),
        size: () => "md" as const,
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <Select.Item value="apple" disabled>
            사과
          </Select.Item>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(toggleValue).not.toHaveBeenCalled();
    });
  });
});
