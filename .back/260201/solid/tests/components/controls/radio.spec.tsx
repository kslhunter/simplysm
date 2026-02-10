import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { Radio } from "../../../src/components/controls/choice/radio";

describe("Radio", () => {
  describe("클릭 동작", () => {
    it("클릭하면 onChange(true)가 호출된다", () => {
      const handleChange = vi.fn();

      render(() => <Radio onChange={handleChange}>옵션 A</Radio>);

      fireEvent.click(screen.getByRole("radio"));

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("이미 checked 상태에서 클릭하면 onChange가 호출되지 않는다", () => {
      // native radio 동작: 이미 선택된 radio를 클릭해도 change 이벤트 미발생
      const handleChange = vi.fn();

      render(() => (
        <Radio checked onChange={handleChange}>
          옵션 A
        </Radio>
      ));

      fireEvent.click(screen.getByRole("radio"));

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("렌더링", () => {
    it("children이 올바르게 렌더링된다", () => {
      render(() => <Radio>테스트 라디오</Radio>);

      expect(screen.getByText("테스트 라디오")).toBeInTheDocument();
    });

    it("disabled 속성이 적용된다", () => {
      render(() => <Radio disabled>비활성화</Radio>);

      expect(screen.getByRole("radio")).toBeDisabled();
    });

    it("checked 상태가 올바르게 반영된다", () => {
      render(() => <Radio checked>선택됨</Radio>);

      expect(screen.getByRole("radio")).toBeChecked();
    });
  });
});
