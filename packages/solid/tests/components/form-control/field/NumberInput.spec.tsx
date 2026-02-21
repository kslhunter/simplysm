import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { NumberInput } from "../../../../src/components/form-control/field/NumberInput";

describe("NumberInput", () => {
  describe("기본 렌더링", () => {
    it("input 요소를 렌더링한다", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("inputmode가 numeric으로 설정된다", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("inputmode", "numeric");
    });

    it("input type이 text로 설정된다", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "text");
    });

    it("autocomplete 기본값은 one-time-code이다", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("autocomplete", "one-time-code");
    });
  });

  describe("값 변환", () => {
    it("숫자 값을 문자열로 표시한다", () => {
      render(() => <NumberInput value={12345} />);

      const input = screen.getByRole("textbox");
      // comma가 기본적으로 true이므로 콤마가 포함됨
      expect(input).toHaveValue("12,345");
    });

    it("소수점이 포함된 숫자를 올바르게 표시한다", () => {
      render(() => <NumberInput value={1234.56} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234.56");
    });

    it("입력 중에 올바르게 동작한다", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "123" } });

      expect(handleChange).toHaveBeenCalledWith(123);
    });

    it("소수점 입력 중인 상태를 유지한다", () => {
      const [value, setValue] = createSignal<number | undefined>(undefined);
      render(() => <NumberInput value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");

      // "123."을 입력할 때 소수점만 입력된 상태 유지
      fireEvent.input(input, { target: { value: "123." } });

      // 값은 123으로 변환되지만 표시는 "123."을 유지해야 함
      expect(input).toHaveValue("123.");
    });

    it("유효하지 않은 입력은 무시한다", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput value={100} onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      // 숫자가 아닌 문자 입력 시도
      fireEvent.input(input, { target: { value: "abc" } });

      // 유효하지 않은 입력이므로 콜백이 호출되지 않거나 값이 유지됨
      expect(handleChange).not.toHaveBeenCalled();
    });

    it("빈 입력은 undefined로 변환한다", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput value={100} onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });

    it("음수를 올바르게 처리한다", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "-123" } });

      expect(handleChange).toHaveBeenCalledWith(-123);
    });
  });

  describe("표시 형식", () => {
    it("comma가 true일 때 천단위 콤마를 표시한다", () => {
      render(() => <NumberInput value={1234567} comma={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234,567");
    });

    it("comma가 false일 때 콤마 없이 표시한다", () => {
      render(() => <NumberInput value={1234567} comma={false} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1234567");
    });

    it("comma 기본값은 true이다", () => {
      render(() => <NumberInput value={1234567} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234,567");
    });

    it("minDigits로 최소 소수점 자릿수를 지정할 수 있다", () => {
      render(() => <NumberInput value={100} minDigits={2} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100.00");
    });

    it("minDigits보다 긴 소수점은 그대로 표시한다", () => {
      render(() => <NumberInput value={100.12345} minDigits={2} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100.12345");
    });
  });

  describe("disabled/readonly 상태", () => {
    it("disabled 상태에서는 div로 렌더링한다", () => {
      render(() => <NumberInput value={1234} disabled />);

      // disabled 상태에서는 input이 아닌 div로 렌더링
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      // div에 값이 표시됨
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("readonly 상태에서는 div로 렌더링한다", () => {
      render(() => <NumberInput value={5678} readonly />);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("5,678")).toBeInTheDocument();
    });

    it("disabled 상태에서 스타일이 적용된다", () => {
      const { container } = render(() => <NumberInput value={100} disabled />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("bg-base-100");
    });
  });

  describe("우측 정렬", () => {
    it("input이 우측 정렬된다", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("text-right");
    });
  });

  describe("스타일 옵션", () => {
    it("size='sm'일 때 작은 패딩이 적용된다", () => {
      const { container } = render(() => <NumberInput size="sm" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("px-1.5");
    });

    it("size='lg'일 때 큰 패딩이 적용된다", () => {
      const { container } = render(() => <NumberInput size="lg" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("px-3");
    });

    it("inset 스타일이 적용된다", () => {
      const { container } = render(() => <NumberInput inset />);

      // inset일 때 outer div가 relative이고, 내부 content div에 border-none이 적용됨
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);
      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv.className).toContain("border-none");
    });
  });

  describe("inset dual-element", () => {
    it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
      const { container } = render(() => <NumberInput inset readonly value={1234} />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("1,234");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
      const { container } = render(() => <NumberInput inset value={1234} />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
    });

    it("inset + readonly에서 우측 정렬이 적용된다", () => {
      const { container } = render(() => <NumberInput inset readonly value={100} />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv.classList.contains("justify-end")).toBe(true);
    });

    it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
      const { container } = render(() => <NumberInput inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("controlled/uncontrolled 패턴", () => {
    it("controlled 모드에서 외부 값 변경이 반영된다", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <NumberInput value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(200);
      expect(input).toHaveValue("200");
    });

    it("uncontrolled 모드에서 내부 상태가 관리된다", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "500" } });

      expect(input).toHaveValue("500");
    });
  });

  describe("placeholder", () => {
    it("placeholder를 표시한다", () => {
      render(() => <NumberInput placeholder="숫자를 입력하세요" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "숫자를 입력하세요");
    });
  });

  describe("validation", () => {
    it("required일 때 값이 없으면 에러 메시지가 설정된다", () => {
      const { container } = render(() => <NumberInput required value={undefined} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
    });

    it("required일 때 값이 있으면 유효하다", () => {
      const { container } = render(() => <NumberInput required value={42} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("min 위반 시 에러 메시지가 설정된다", () => {
      const { container } = render(() => <NumberInput min={10} value={5} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("최솟값은 10입니다");
    });

    it("max 위반 시 에러 메시지가 설정된다", () => {
      const { container } = render(() => <NumberInput max={100} value={150} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("최댓값은 100입니다");
    });

    it("validate 함수가 에러를 반환하면 해당 메시지가 설정된다", () => {
      const { container } = render(() => (
        <NumberInput
          validate={(v) => (v !== undefined && v % 2 === 0 ? undefined : "짝수만 입력하세요")}
          value={3}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("짝수만 입력하세요");
    });
  });
});
