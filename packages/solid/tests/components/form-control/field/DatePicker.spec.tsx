import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import { DatePicker } from "../../../../src/components/form-control/field/DatePicker";

describe("DatePicker 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("unit=year일 때 input type=number가 렌더링된다", () => {
      const { container } = render(() => <DatePicker unit="year" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("number");
    });

    it("unit=month일 때 input unit=month가 렌더링된다", () => {
      const { container } = render(() => <DatePicker unit="month" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("month");
    });

    it("unit=date일 때 input unit=date가 렌더링된다", () => {
      const { container } = render(() => <DatePicker unit="date" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("date");
    });

    it("기본 unit은 date이다", () => {
      const { container } = render(() => <DatePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("date");
    });
  });

  describe("값 변환", () => {
    it("DateOnly 값이 year 타입에서 yyyy 형식으로 표시된다", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <DatePicker unit="year" value={dateOnly} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025");
    });

    it("DateOnly 값이 month 타입에서 yyyy-MM 형식으로 표시된다", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <DatePicker unit="month" value={dateOnly} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03");
    });

    it("DateOnly 값이 date 타입에서 yyyy-MM-dd 형식으로 표시된다", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <DatePicker unit="date" value={dateOnly} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15");
    });

    it("year 타입 입력 시 DateOnly로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <DatePicker unit="year" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateOnly;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it("month 타입 입력 시 DateOnly로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <DatePicker unit="month" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateOnly;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(1);
    });

    it("date 타입 입력 시 DateOnly로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <DatePicker unit="date" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03-15" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateOnly;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
    });

    it("빈 값 입력 시 undefined가 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <DatePicker unit="date" value={dateOnly} onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("min/max 속성", () => {
    it("min 속성이 date 타입에서 문자열로 변환된다", () => {
      const minDate = new DateOnly(2025, 1, 1);
      const { container } = render(() => <DatePicker unit="date" min={minDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01");
    });

    it("max 속성이 date 타입에서 문자열로 변환된다", () => {
      const maxDate = new DateOnly(2025, 12, 31);
      const { container } = render(() => <DatePicker unit="date" max={maxDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31");
    });

    it("min 속성이 month 타입에서 yyyy-MM 형식으로 변환된다", () => {
      const minDate = new DateOnly(2025, 1, 15);
      const { container } = render(() => <DatePicker unit="month" min={minDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01");
    });

    it("max 속성이 month 타입에서 yyyy-MM 형식으로 변환된다", () => {
      const maxDate = new DateOnly(2025, 12, 15);
      const { container } = render(() => <DatePicker unit="month" max={maxDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12");
    });

    it("min 속성이 year 타입에서 숫자로 변환된다", () => {
      const minDate = new DateOnly(2020, 1, 1);
      const { container } = render(() => <DatePicker unit="year" min={minDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2020");
    });

    it("max 속성이 year 타입에서 숫자로 변환된다", () => {
      const maxDate = new DateOnly(2030, 12, 31);
      const { container } = render(() => <DatePicker unit="year" max={maxDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2030");
    });
  });

  describe("controlled 패턴", () => {
    it("외부 상태 변경 시 input 값이 업데이트된다", () => {
      const [value, setValue] = createSignal<DateOnly | undefined>(new DateOnly(2025, 1, 1));
      const { container } = render(() => <DatePicker unit="date" value={value()} onValueChange={setValue} />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01");

      setValue(new DateOnly(2025, 12, 31));
      expect(input.value).toBe("2025-12-31");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => <DatePicker unit="date" value={new DateOnly(2025, 1, 1)} />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01");

      fireEvent.change(input, { target: { value: "2025-06-15" } });
      expect(input.value).toBe("2025-06-15");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <DatePicker disabled value={new DateOnly(2025, 3, 15)} />);
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-date-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <DatePicker unit="date" disabled value={new DateOnly(2025, 3, 15)} />);
      expect(getByText("2025-03-15")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <DatePicker disabled value={new DateOnly(2025, 3, 15)} />);
      const div = container.querySelector("div.sd-date-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <DatePicker readonly value={new DateOnly(2025, 3, 15)} />);
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-date-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <DatePicker unit="date" readonly value={new DateOnly(2025, 3, 15)} />);
      expect(getByText("2025-03-15")).toBeTruthy();
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <DatePicker size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <DatePicker size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 inset 배경색이 적용된다", () => {
      const { container } = render(() => <DatePicker inset />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("border-none")).toBe(true);
      expect(outer.classList.contains("bg-primary-50")).toBe(true);
    });

    it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
      const { container } = render(() => <DatePicker inset readonly value={new DateOnly(2025, 3, 15)} />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("2025-03-15");

      expect(outer.querySelector("input")).toBeFalsy();
    });

    it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
      const { container } = render(() => <DatePicker inset value={new DateOnly(2025, 3, 15)} />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe("2025-03-15");
    });

    it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
      const { container } = render(() => <DatePicker inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("다크 모드 스타일", () => {
    it("다크 모드 border 스타일이 적용된다", () => {
      const { container } = render(() => <DatePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
    });

    it("다크 모드 background 스타일이 적용된다", () => {
      const { container } = render(() => <DatePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-base-900")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <DatePicker class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });
});
