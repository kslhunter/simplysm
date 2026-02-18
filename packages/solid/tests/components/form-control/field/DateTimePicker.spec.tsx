import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { DateTime } from "@simplysm/core-common";
import { DateTimePicker } from "../../../../src/components/form-control/field/DateTimePicker";

describe("DateTimePicker 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("unit=minute일 때 input type=datetime-local이 렌더링된다", () => {
      const { container } = render(() => <DateTimePicker unit="minute" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("datetime-local");
    });

    it("unit=second일 때 input type=datetime-local이 렌더링된다", () => {
      const { container } = render(() => <DateTimePicker unit="second" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("datetime-local");
    });

    it("기본 unit은 minute이다", () => {
      const { container } = render(() => <DateTimePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("datetime-local");
    });

    it("unit=second일 때 step=1이 설정된다", () => {
      const { container } = render(() => <DateTimePicker unit="second" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("1");
    });

    it("unit=minute일 때 step이 설정되지 않는다", () => {
      const { container } = render(() => <DateTimePicker unit="minute" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("");
    });
  });

  describe("값 변환", () => {
    it("DateTime 값이 minute 단위에서 yyyy-MM-ddTHH:mm 형식으로 표시된다", () => {
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => <DateTimePicker unit="minute" value={dateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15T10:30");
    });

    it("DateTime 값이 second 단위에서 yyyy-MM-ddTHH:mm:ss 형식으로 표시된다", () => {
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => <DateTimePicker unit="second" value={dateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15T10:30:45");
    });

    it("minute 단위 입력 시 DateTime으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <DateTimePicker unit="minute" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03-15T10:30" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateTime;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(0);
    });

    it("second 단위 입력 시 DateTime으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <DateTimePicker unit="second" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03-15T10:30:45" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateTime;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(45);
    });

    it("빈 값 입력 시 undefined가 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => (
        <DateTimePicker unit="minute" value={dateTime} onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("min/max 속성", () => {
    it("min 속성이 minute 단위에서 문자열로 변환된다", () => {
      const minDateTime = new DateTime(2025, 1, 1, 0, 0, 0);
      const { container } = render(() => <DateTimePicker unit="minute" min={minDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01T00:00");
    });

    it("max 속성이 minute 단위에서 문자열로 변환된다", () => {
      const maxDateTime = new DateTime(2025, 12, 31, 23, 59, 0);
      const { container } = render(() => <DateTimePicker unit="minute" max={maxDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31T23:59");
    });

    it("min 속성이 second 단위에서 초 단위까지 포함된다", () => {
      const minDateTime = new DateTime(2025, 1, 1, 0, 0, 30);
      const { container } = render(() => <DateTimePicker unit="second" min={minDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01T00:00:30");
    });

    it("max 속성이 second 단위에서 초 단위까지 포함된다", () => {
      const maxDateTime = new DateTime(2025, 12, 31, 23, 59, 59);
      const { container } = render(() => <DateTimePicker unit="second" max={maxDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31T23:59:59");
    });
  });

  describe("controlled 패턴", () => {
    it("외부 상태 변경 시 input 값이 업데이트된다", () => {
      const [value, setValue] = createSignal<DateTime | undefined>(
        new DateTime(2025, 1, 1, 10, 0, 0),
      );
      const { container } = render(() => (
        <DateTimePicker unit="minute" value={value()} onValueChange={setValue} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01T10:00");

      setValue(new DateTime(2025, 12, 31, 23, 59, 0));
      expect(input.value).toBe("2025-12-31T23:59");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => (
        <DateTimePicker unit="minute" value={new DateTime(2025, 1, 1, 10, 0, 0)} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01T10:00");

      fireEvent.change(input, { target: { value: "2025-06-15T14:30" } });
      expect(input.value).toBe("2025-06-15T14:30");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => (
        <DateTimePicker disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-datetime-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <DateTimePicker unit="minute" disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      expect(getByText("2025-03-15T10:30")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => (
        <DateTimePicker disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const div = container.querySelector("div.sd-datetime-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => (
        <DateTimePicker readonly value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-datetime-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <DateTimePicker unit="minute" readonly value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      expect(getByText("2025-03-15T10:30")).toBeTruthy();
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <DateTimePicker size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <DateTimePicker size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 inset 배경색이 적용된다", () => {
      const { container } = render(() => <DateTimePicker inset />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("border-none")).toBe(true);
      expect(outer.classList.contains("bg-primary-50")).toBe(true);
    });

    it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
      const { container } = render(() => (
        <DateTimePicker inset readonly value={new DateTime(2025, 3, 15, 14, 30, 0)} />
      ));
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("2025-03-15T14:30");

      expect(outer.querySelector("input")).toBeFalsy();
    });

    it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
      const { container } = render(() => (
        <DateTimePicker inset value={new DateTime(2025, 3, 15, 14, 30, 0)} />
      ));
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      expect(outer.querySelector("input")).toBeTruthy();
    });

    it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
      const { container } = render(() => <DateTimePicker inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("다크 모드 스타일", () => {
    it("다크 모드 border 스타일이 적용된다", () => {
      const { container } = render(() => <DateTimePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
    });

    it("다크 모드 background 스타일이 적용된다", () => {
      const { container } = render(() => <DateTimePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-base-900")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <DateTimePicker class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });
});
