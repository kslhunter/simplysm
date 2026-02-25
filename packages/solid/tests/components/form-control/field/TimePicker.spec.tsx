import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Time } from "@simplysm/core-common";
import { TimePicker } from "../../../../src/components/form-control/field/TimePicker";

describe("TimePicker 컴포넌트", () => {
  describe("basic rendering", () => {
    it("unit=minute일 때 input type=time이 렌더링된다", () => {
      const { container } = render(() => <TimePicker unit="minute" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("time");
    });

    it("unit=second일 때 input type=time이 렌더링된다", () => {
      const { container } = render(() => <TimePicker unit="second" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("time");
    });

    it("기본 unit은 minute이다", () => {
      const { container } = render(() => <TimePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("time");
    });

    it("autocomplete 기본값은 one-time-code이다", () => {
      const { container } = render(() => <TimePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.autocomplete).toBe("one-time-code");
    });

    it("unit=second일 때 step=1이 설정된다", () => {
      const { container } = render(() => <TimePicker unit="second" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("1");
    });

    it("unit=minute일 때 step이 설정되지 않는다", () => {
      const { container } = render(() => <TimePicker unit="minute" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("");
    });
  });

  describe("값 변환", () => {
    it("Time 값이 minute 단위에서 HH:mm 형식으로 표시된다", () => {
      const time = new Time(10, 30, 45);
      const { container } = render(() => <TimePicker unit="minute" value={time} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("10:30");
    });

    it("Time 값이 second 단위에서 HH:mm:ss 형식으로 표시된다", () => {
      const time = new Time(10, 30, 45);
      const { container } = render(() => <TimePicker unit="second" value={time} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("10:30:45");
    });

    it("minute 단위 입력 시 Time으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <TimePicker unit="minute" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "10:30" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as Time;
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(0);
    });

    it("second 단위 입력 시 Time으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <TimePicker unit="second" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "10:30:45" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as Time;
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(45);
    });

    it("빈 값 입력 시 undefined가 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const time = new Time(10, 30, 45);
      const { container } = render(() => (
        <TimePicker unit="minute" value={time} onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("controlled 패턴", () => {
    it("외부 상태 변경 시 input 값이 업데이트된다", () => {
      const [value, setValue] = createSignal<Time | undefined>(new Time(10, 0, 0));
      const { container } = render(() => (
        <TimePicker unit="minute" value={value()} onValueChange={setValue} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("10:00");

      setValue(new Time(23, 59, 0));
      expect(input.value).toBe("23:59");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => <TimePicker unit="minute" value={new Time(10, 0, 0)} />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("10:00");

      fireEvent.change(input, { target: { value: "14:30" } });
      expect(input.value).toBe("14:30");
    });
  });

  describe("disabled state", () => {
    it("disabled=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <TimePicker disabled value={new Time(10, 30, 0)} />);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-time-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <TimePicker unit="minute" disabled value={new Time(10, 30, 0)} />
      ));
      expect(getByText("10:30")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <TimePicker disabled value={new Time(10, 30, 0)} />);
      const div = container.querySelector("div.sd-time-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <TimePicker readonly value={new Time(10, 30, 0)} />);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-time-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <TimePicker unit="minute" readonly value={new Time(10, 30, 0)} />
      ));
      expect(getByText("10:30")).toBeTruthy();
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <TimePicker size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <TimePicker size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 outer div에는 relative만, content div에 inset 스타일이 적용된다", () => {
      const { container } = render(() => <TimePicker inset />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);
      expect(outer.classList.contains("border-none")).toBe(false);

      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv.classList.contains("border-none")).toBe(true);
      expect(contentDiv.classList.contains("bg-primary-50")).toBe(true);
    });

    it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
      const { container } = render(() => <TimePicker inset readonly value={new Time(14, 30, 0)} />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("14:30");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
      const { container } = render(() => <TimePicker inset value={new Time(14, 30, 0)} />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      expect(outer.querySelector("input")).toBeTruthy();
    });

    it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
      const { container } = render(() => <TimePicker inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("다크 모드 스타일", () => {
    it("다크 모드 border 스타일이 적용된다", () => {
      const { container } = render(() => <TimePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
    });

    it("다크 모드 background 스타일이 적용된다", () => {
      const { container } = render(() => <TimePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-primary-950/30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <TimePicker class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <TimePicker required value={undefined} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This field is required");
    });

    it("required일 때 값이 있으면 유효하다", () => {
      const { container } = render(() => <TimePicker required value={new Time(10, 0, 0)} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("min 위반 시 에러 메시지가 설정된다", () => {
      const { container } = render(() => (
        <TimePicker min={new Time(12, 0, 0)} value={new Time(8, 0, 0)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("min 충족 시 유효하다", () => {
      const { container } = render(() => (
        <TimePicker min={new Time(8, 0, 0)} value={new Time(12, 0, 0)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("max 위반 시 에러 메시지가 설정된다", () => {
      const { container } = render(() => (
        <TimePicker max={new Time(12, 0, 0)} value={new Time(18, 0, 0)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("max 충족 시 유효하다", () => {
      const { container } = render(() => (
        <TimePicker max={new Time(23, 59, 59)} value={new Time(12, 0, 0)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("validate 함수가 에러를 반환하면 에러 메시지가 설정된다", () => {
      const { container } = render(() => (
        <TimePicker value={new Time(10, 0, 0)} validate={() => "커스텀 에러"} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("validate 함수가 undefined를 반환하면 유효하다", () => {
      const { container } = render(() => (
        <TimePicker value={new Time(10, 0, 0)} validate={() => undefined} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
