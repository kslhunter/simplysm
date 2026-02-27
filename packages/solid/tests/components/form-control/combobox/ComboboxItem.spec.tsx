import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import {
  ComboboxContext,
  type ComboboxContextValue,
} from "../../../../src/components/form-control/combobox/ComboboxContext";
import { ComboboxItem } from "../../../../src/components/form-control/combobox/ComboboxItem";

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
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option")).not.toBeNull();
    expect(getByRole("option").textContent).toContain("사과");
  });

  it("calls selectValue on click", () => {
    const selectValue = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ selectValue })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(selectValue).toHaveBeenCalledWith("apple");
  });

  it("sets aria-selected=true when selected", () => {
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ isSelected: () => true })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option").getAttribute("aria-selected")).toBe("true");
  });

  it("does not respond to click when disabled", () => {
    const selectValue = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ selectValue })}>
        <ComboboxItem value="apple" disabled>
          사과
        </ComboboxItem>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(selectValue).not.toHaveBeenCalled();
  });

  it("calls closeDropdown on click", () => {
    const closeDropdown = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ closeDropdown })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(closeDropdown).toHaveBeenCalled();
  });

  it("sets data-combobox-item attribute", () => {
    render(() => (
      <ComboboxContext.Provider value={createMockContext()}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
  });
});
