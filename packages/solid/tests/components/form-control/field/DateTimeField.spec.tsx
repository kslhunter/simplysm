import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { DateTime } from "@simplysm/core-common";
import { DateTimeField } from "../../../../src/components/form-control/field/DateTimeField";

describe("DateTimeField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("type=datetime일 때 input type=datetime-local이 렌더링된다", () => {
      const { container } = render(() => <DateTimeField type="datetime" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("datetime-local");
    });

    it("type=datetime-sec일 때 input type=datetime-local이 렌더링된다", () => {
      const { container } = render(() => <DateTimeField type="datetime-sec" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("datetime-local");
    });

    it("기본 type은 datetime이다", () => {
      const { container } = render(() => <DateTimeField />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("datetime-local");
    });

    it("type=datetime-sec일 때 step=1이 설정된다", () => {
      const { container } = render(() => <DateTimeField type="datetime-sec" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("1");
    });

    it("type=datetime일 때 step이 설정되지 않는다", () => {
      const { container } = render(() => <DateTimeField type="datetime" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("");
    });
  });

  describe("값 변환", () => {
    it("DateTime 값이 datetime 타입에서 yyyy-MM-ddTHH:mm 형식으로 표시된다", () => {
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => <DateTimeField type="datetime" value={dateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15T10:30");
    });

    it("DateTime 값이 datetime-sec 타입에서 yyyy-MM-ddTHH:mm:ss 형식으로 표시된다", () => {
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => <DateTimeField type="datetime-sec" value={dateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15T10:30:45");
    });

    it("datetime 타입 입력 시 DateTime으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <DateTimeField type="datetime" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "2025-03-15T10:30" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateTime;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(0);
    });

    it("datetime-sec 타입 입력 시 DateTime으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <DateTimeField type="datetime-sec" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "2025-03-15T10:30:45" } });

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
        <DateTimeField type="datetime" value={dateTime} onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("min/max 속성", () => {
    it("min 속성이 datetime 타입에서 문자열로 변환된다", () => {
      const minDateTime = new DateTime(2025, 1, 1, 0, 0, 0);
      const { container } = render(() => <DateTimeField type="datetime" min={minDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01T00:00");
    });

    it("max 속성이 datetime 타입에서 문자열로 변환된다", () => {
      const maxDateTime = new DateTime(2025, 12, 31, 23, 59, 0);
      const { container } = render(() => <DateTimeField type="datetime" max={maxDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31T23:59");
    });

    it("min 속성이 datetime-sec 타입에서 초 단위까지 포함된다", () => {
      const minDateTime = new DateTime(2025, 1, 1, 0, 0, 30);
      const { container } = render(() => <DateTimeField type="datetime-sec" min={minDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01T00:00:30");
    });

    it("max 속성이 datetime-sec 타입에서 초 단위까지 포함된다", () => {
      const maxDateTime = new DateTime(2025, 12, 31, 23, 59, 59);
      const { container } = render(() => <DateTimeField type="datetime-sec" max={maxDateTime} />);
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
        <DateTimeField type="datetime" value={value()} onValueChange={setValue} />
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
        <DateTimeField type="datetime" value={new DateTime(2025, 1, 1, 10, 0, 0)} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01T10:00");

      fireEvent.input(input, { target: { value: "2025-06-15T14:30" } });
      expect(input.value).toBe("2025-06-15T14:30");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => (
        <DateTimeField disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-datetime-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <DateTimeField type="datetime" disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      expect(getByText("2025-03-15T10:30")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => (
        <DateTimeField disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const div = container.querySelector("div.sd-datetime-field") as HTMLElement;
      expect(div.classList.contains("bg-zinc-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => (
        <DateTimeField readonly value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-datetime-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <DateTimeField type="datetime" readonly value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      expect(getByText("2025-03-15T10:30")).toBeTruthy();
    });
  });

  describe("error 스타일", () => {
    it("error=true일 때 에러 스타일이 적용된다", () => {
      const { container } = render(() => <DateTimeField error />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-red-500")).toBe(true);
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <DateTimeField size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <DateTimeField size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 배경이 투명하다", () => {
      const { container } = render(() => <DateTimeField inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-none")).toBe(true);
      expect(wrapper.classList.contains("bg-transparent")).toBe(true);
    });
  });

  describe("다크 모드 스타일", () => {
    it("다크 모드 border 스타일이 적용된다", () => {
      const { container } = render(() => <DateTimeField />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-zinc-700")).toBe(true);
    });

    it("다크 모드 background 스타일이 적용된다", () => {
      const { container } = render(() => <DateTimeField />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-zinc-900")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <DateTimeField class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });
});
