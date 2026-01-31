import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { NumberField } from "../../../src/components/controls/number-field";

describe("NumberField", () => {
  describe("기본 렌더링", () => {
    it("숫자 값이 올바르게 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={1234} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1234");
    });

    it("undefined 값은 빈 문자열로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={undefined} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });
  });

  describe("value/onChange 동작", () => {
    it("숫자를 입력하면 number 타입으로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={undefined} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "123" } });

      expect(onChange).toHaveBeenCalledWith(123);
    });

    it("소수점 입력이 동작한다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={undefined} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "12.34" } });

      expect(onChange).toHaveBeenCalledWith(12.34);
    });

    it("빈 입력은 undefined로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={123} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("숫자가 아닌 입력은 필터링된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={undefined} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "abc" } });

      // 숫자가 아닌 경우 onChange 호출 안함
      expect(onChange).not.toHaveBeenCalled();
    });

    it("음수 입력이 동작한다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={undefined} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "-123" } });

      expect(onChange).toHaveBeenCalledWith(-123);
    });
  });

  describe("useNumberComma prop", () => {
    it("blur 상태에서 천단위 콤마가 표시된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={1234567} onChange={onChange} useNumberComma />);

      const input = screen.getByRole("textbox");
      // blur 상태에서 콤마 포맷
      expect(input).toHaveValue("1,234,567");
    });

    it("포커스 시 raw 값이 표시된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={1234567} onChange={onChange} useNumberComma />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      expect(input).toHaveValue("1234567");
    });
  });

  describe("minDigits prop", () => {
    it("최소 자릿수가 적용된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={5} onChange={onChange} minDigits={3} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("005");
    });

    it("포커스 시 raw 값이 표시된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={5} onChange={onChange} minDigits={3} />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      expect(input).toHaveValue("5");
    });
  });

  describe("inputMode", () => {
    it("decimal inputMode가 설정된다", () => {
      const onChange = vi.fn();
      render(() => <NumberField value={undefined} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("inputmode", "decimal");
    });
  });

  describe("Controlled component", () => {
    it("Controlled component로 동작한다", () => {
      function TestComponent() {
        const [value, setValue] = createSignal<number | undefined>(100);
        return (
          <>
            <NumberField value={value()} onChange={setValue} />
            <span data-testid="display">{value()?.toString() ?? "empty"}</span>
          </>
        );
      }

      render(() => <TestComponent />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "200" } });

      expect(screen.getByTestId("display")).toHaveTextContent("200");
    });
  });
});
