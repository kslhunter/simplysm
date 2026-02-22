import type { JSX } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { SelectItem } from "../../../../src/components/form-control/select/SelectItem";
import {
  SelectContext,
  type SelectContextValue,
} from "../../../../src/components/form-control/select/SelectContext";

// 테스트용 Provider
function TestProvider(props: { children: JSX.Element; value: SelectContextValue }) {
  return <SelectContext.Provider value={props.value}>{props.children}</SelectContext.Provider>;
}

describe("SelectItem 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 렌더링된다", () => {
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

    it("data-select-item 속성이 설정된다", () => {
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

  describe("선택 동작", () => {
    it("클릭 시 toggleValue가 호출된다", () => {
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

    it("단일 선택 모드에서 클릭 시 closeDropdown이 호출된다", () => {
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

    it("다중 선택 모드에서 클릭 시 closeDropdown이 호출되지 않는다", () => {
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

  describe("선택 상태", () => {
    it("선택된 아이템에 aria-selected=true가 설정된다", () => {
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

  describe("disabled 상태", () => {
    it("disabled일 때 클릭해도 toggleValue가 호출되지 않는다", () => {
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
