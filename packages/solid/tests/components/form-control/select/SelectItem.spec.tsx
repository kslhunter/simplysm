import type { JSX } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { SelectItem } from "../../../../src/components/form-control/select/SelectItem";
import {
  SelectContext,
  type SelectContextValue,
} from "../../../../src/components/form-control/select/SelectContext";

// Test provider
function TestProvider(props: { children: JSX.Element; value: SelectContextValue }) {
  return <SelectContext.Provider value={props.value}>{props.children}</SelectContext.Provider>;
}

describe("SelectItem component", () => {
  describe("basic rendering", () => {
    it("renders children", () => {
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown: vi.fn(),
        setHeader: vi.fn(),
        setAction: vi.fn(),
        setItemTemplate: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      expect(getByText("사과")).not.toBeNull();
    });

    it("sets data-select-item attribute", () => {
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown: vi.fn(),
        setHeader: vi.fn(),
        setAction: vi.fn(),
        setItemTemplate: vi.fn(),
      };

      render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      expect(document.querySelector("[data-select-item]")).not.toBeNull();
    });
  });

  describe("selection behavior", () => {
    it("calls toggleValue on click", () => {
      const toggleValue = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue,
        closeDropdown: vi.fn(),
        setHeader: vi.fn(),
        setAction: vi.fn(),
        setItemTemplate: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
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
        setHeader: vi.fn(),
        setAction: vi.fn(),
        setItemTemplate: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
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
        setHeader: vi.fn(),
        setAction: vi.fn(),
        setItemTemplate: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
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
        isSelected: (v) => v === "apple",
        toggleValue: vi.fn(),
        closeDropdown: vi.fn(),
        setHeader: vi.fn(),
        setAction: vi.fn(),
        setItemTemplate: vi.fn(),
      };

      render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
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
        setHeader: vi.fn(),
        setAction: vi.fn(),
        setItemTemplate: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple" disabled>
            사과
          </SelectItem>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(toggleValue).not.toHaveBeenCalled();
    });
  });
});
