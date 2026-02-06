import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Time } from "@simplysm/core-common";
import { TimeField } from "../../../../src/components/form-control/field/TimeField";

describe("TimeField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("type=time일 때 input type=time이 렌더링된다", () => {
      const { container } = render(() => <TimeField type="time" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("time");
    });

    it("type=time-sec일 때 input type=time이 렌더링된다", () => {
      const { container } = render(() => <TimeField type="time-sec" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("time");
    });

    it("기본 type은 time이다", () => {
      const { container } = render(() => <TimeField />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("time");
    });

    it("type=time-sec일 때 step=1이 설정된다", () => {
      const { container } = render(() => <TimeField type="time-sec" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("1");
    });

    it("type=time일 때 step이 설정되지 않는다", () => {
      const { container } = render(() => <TimeField type="time" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("");
    });
  });

  describe("값 변환", () => {
    it("Time 값이 time 타입에서 HH:mm 형식으로 표시된다", () => {
      const time = new Time(10, 30, 45);
      const { container } = render(() => <TimeField type="time" value={time} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("10:30");
    });

    it("Time 값이 time-sec 타입에서 HH:mm:ss 형식으로 표시된다", () => {
      const time = new Time(10, 30, 45);
      const { container } = render(() => <TimeField type="time-sec" value={time} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("10:30:45");
    });

    it("time 타입 입력 시 Time으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <TimeField type="time" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "10:30" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as Time;
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(0);
    });

    it("time-sec 타입 입력 시 Time으로 변환되어 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <TimeField type="time-sec" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "10:30:45" } });

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
        <TimeField type="time" value={time} onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("controlled 패턴", () => {
    it("외부 상태 변경 시 input 값이 업데이트된다", () => {
      const [value, setValue] = createSignal<Time | undefined>(new Time(10, 0, 0));
      const { container } = render(() => (
        <TimeField type="time" value={value()} onValueChange={setValue} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("10:00");

      setValue(new Time(23, 59, 0));
      expect(input.value).toBe("23:59");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => (
        <TimeField type="time" value={new Time(10, 0, 0)} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("10:00");

      fireEvent.input(input, { target: { value: "14:30" } });
      expect(input.value).toBe("14:30");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => (
        <TimeField disabled value={new Time(10, 30, 0)} />
      ));
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-time-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <TimeField type="time" disabled value={new Time(10, 30, 0)} />
      ));
      expect(getByText("10:30")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => (
        <TimeField disabled value={new Time(10, 30, 0)} />
      ));
      const div = container.querySelector("div.sd-time-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => (
        <TimeField readonly value={new Time(10, 30, 0)} />
      ));
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-time-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => (
        <TimeField type="time" readonly value={new Time(10, 30, 0)} />
      ));
      expect(getByText("10:30")).toBeTruthy();
    });
  });

  describe("error 스타일", () => {
    it("error=true일 때 에러 스타일이 적용된다", () => {
      const { container } = render(() => <TimeField error />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-red-500")).toBe(true);
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <TimeField size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <TimeField size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 배경이 투명하다", () => {
      const { container } = render(() => <TimeField inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-none")).toBe(true);
      expect(wrapper.classList.contains("bg-transparent")).toBe(true);
    });
  });

  describe("다크 모드 스타일", () => {
    it("다크 모드 border 스타일이 적용된다", () => {
      const { container } = render(() => <TimeField />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
    });

    it("다크 모드 background 스타일이 적용된다", () => {
      const { container } = render(() => <TimeField />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-base-900")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <TimeField class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });
});
