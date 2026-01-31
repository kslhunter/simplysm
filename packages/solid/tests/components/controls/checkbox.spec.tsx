import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { Checkbox } from "../../../src/components/controls/checkbox";

describe("Checkbox", () => {
  describe("클릭 동작", () => {
    it("클릭하면 onChange가 반대 값으로 호출된다", () => {
      const handleChange = vi.fn();

      render(() => <Checkbox onChange={handleChange}>동의</Checkbox>);

      fireEvent.click(screen.getByRole("checkbox"));

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("checked=true일 때 클릭하면 onChange(false)가 호출된다", () => {
      const handleChange = vi.fn();

      render(() => (
        <Checkbox checked onChange={handleChange}>
          동의
        </Checkbox>
      ));

      fireEvent.click(screen.getByRole("checkbox"));

      expect(handleChange).toHaveBeenCalledWith(false);
    });

  });

  describe("렌더링", () => {
    it("children이 올바르게 렌더링된다", () => {
      render(() => <Checkbox>테스트 체크박스</Checkbox>);

      expect(screen.getByText("테스트 체크박스")).toBeInTheDocument();
    });

    it("disabled 속성이 적용된다", () => {
      render(() => <Checkbox disabled>비활성화</Checkbox>);

      expect(screen.getByRole("checkbox")).toBeDisabled();
    });

    it("checked 상태가 올바르게 반영된다", () => {
      render(() => <Checkbox checked>체크됨</Checkbox>);

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("indeterminate 상태일 때 data-indeterminate 속성이 설정된다", () => {
      const { container } = render(() => <Checkbox indeterminate>부분 선택</Checkbox>);

      const indicatorIcon = container.querySelector("[data-indeterminate]");
      expect(indicatorIcon).toBeInTheDocument();
      expect(indicatorIcon?.getAttribute("data-indeterminate")).toBe("true");
    });

    it("indeterminate 상태가 checked보다 우선한다", () => {
      const { container } = render(() => (
        <Checkbox checked indeterminate>
          부분 선택
        </Checkbox>
      ));

      const indicatorIcon = container.querySelector("[data-indeterminate]");
      expect(indicatorIcon?.getAttribute("data-indeterminate")).toBe("true");
      // checked이지만 indeterminate가 true이면 data-checked는 false
      expect(indicatorIcon?.getAttribute("data-checked")).toBe("false");
    });

    it("size prop이 에러 없이 렌더링된다", () => {
      render(() => <Checkbox size="sm">작은 체크박스</Checkbox>);
      expect(screen.getByText("작은 체크박스")).toBeInTheDocument();

      render(() => <Checkbox size="lg">큰 체크박스</Checkbox>);
      expect(screen.getByText("큰 체크박스")).toBeInTheDocument();
    });

    it("inline prop이 에러 없이 렌더링된다", () => {
      render(() => <Checkbox inline>인라인 체크박스</Checkbox>);
      expect(screen.getByText("인라인 체크박스")).toBeInTheDocument();
    });

    it("inset prop이 에러 없이 렌더링된다", () => {
      render(() => <Checkbox inset>인셋 체크박스</Checkbox>);
      expect(screen.getByText("인셋 체크박스")).toBeInTheDocument();
    });
  });

});
