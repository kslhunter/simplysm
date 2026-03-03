import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Combobox } from "../../../../src/components/form-control/combobox/Combobox";
import { createContext, type JSX } from "solid-js";

// Create a context to test ComboboxItem in isolation
export interface ComboboxContextValue {
  isSelected: () => boolean;
  selectValue: (value: unknown) => void;
  closeDropdown: () => void;
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

const ComboboxContext = createContext<ComboboxContextValue>();

const createMockContext = (
  overrides: Partial<ComboboxContextValue> = {},
): ComboboxContextValue => ({
  isSelected: () => false,
  selectValue: vi.fn(),
  closeDropdown: vi.fn(),
  setItemTemplate: vi.fn(),
  ...overrides,
});

describe("ComboboxItem component", () => {
  it("renders the item", () => {
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext()}>
        <Combobox.Item value="apple">사과</Combobox.Item>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option")).not.toBeNull();
    expect(getByRole("option").textContent).toContain("사과");
  });

  it("calls selectValue on click", () => {
    const selectValue = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ selectValue })}>
        <Combobox.Item value="apple">사과</Combobox.Item>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(selectValue).toHaveBeenCalledWith("apple");
  });

  it("sets aria-selected=true when selected", () => {
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ isSelected: () => true })}>
        <Combobox.Item value="apple">사과</Combobox.Item>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option").getAttribute("aria-selected")).toBe("true");
  });

  it("does not respond to click when disabled", () => {
    const selectValue = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ selectValue })}>
        <Combobox.Item value="apple" disabled>
          사과
        </Combobox.Item>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(selectValue).not.toHaveBeenCalled();
  });

  it("calls closeDropdown on click", () => {
    const closeDropdown = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ closeDropdown })}>
        <Combobox.Item value="apple">사과</Combobox.Item>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(closeDropdown).toHaveBeenCalled();
  });

  it("sets data-combobox-item attribute", () => {
    render(() => (
      <ComboboxContext.Provider value={createMockContext()}>
        <Combobox.Item value="apple">사과</Combobox.Item>
      </ComboboxContext.Provider>
    ));

    expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
  });
});
