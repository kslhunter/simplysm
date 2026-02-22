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

describe("ComboboxItem 컴포넌트", () => {
  it("아이템이 렌더링된다", () => {
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext()}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option")).not.toBeNull();
    expect(getByRole("option").textContent).toContain("사과");
  });

  it("클릭 시 selectValue가 호출된다", () => {
    const selectValue = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ selectValue })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(selectValue).toHaveBeenCalledWith("apple");
  });

  it("선택된 상태일 때 aria-selected가 true", () => {
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ isSelected: () => true })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option").getAttribute("aria-selected")).toBe("true");
  });

  it("disabled일 때 클릭이 동작하지 않는다", () => {
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

  it("클릭 시 closeDropdown이 호출된다", () => {
    const closeDropdown = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ closeDropdown })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(closeDropdown).toHaveBeenCalled();
  });

  it("data-combobox-item 속성이 설정된다", () => {
    render(() => (
      <ComboboxContext.Provider value={createMockContext()}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
  });
});
