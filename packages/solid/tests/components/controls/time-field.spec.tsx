import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { TimeField } from "../../../src/components/controls/time-field";
import { Time } from "@simplysm/core-common";

describe("TimeField", () => {
  describe("기본 렌더링", () => {
    it("Time 값이 올바르게 렌더링된다", () => {
      const onChange = vi.fn();
      const time = new Time(10, 30, 0);
      render(() => <TimeField value={time} onChange={onChange} />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("10:30");
    });

    it("undefined 값은 빈 문자열로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <TimeField value={undefined} onChange={onChange} />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  describe("value/onChange 동작", () => {
    it("시간을 선택하면 Time 타입으로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <TimeField value={undefined} onChange={onChange} />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "14:30" } });

      expect(onChange).toHaveBeenCalled();
      const calledValue = onChange.mock.calls[0][0] as Time;
      expect(calledValue).toBeInstanceOf(Time);
      expect(calledValue.hour).toBe(14);
      expect(calledValue.minute).toBe(30);
    });

    it("값을 지우면 undefined로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      const time = new Time(10, 30, 0);
      render(() => <TimeField value={time} onChange={onChange} />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("type prop", () => {
    it("type=time-sec일 때 초 단위가 포함된다", () => {
      const onChange = vi.fn();
      const time = new Time(10, 30, 45);
      render(() => <TimeField value={time} onChange={onChange} type="time-sec" />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      expect(input.value).toBe("10:30:45");
      expect(input.step).toBe("1");
    });

    it("type=time-sec일 때 초 단위 입력이 동작한다", () => {
      const onChange = vi.fn();
      render(() => <TimeField value={undefined} onChange={onChange} type="time-sec" />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "14:30:45" } });

      expect(onChange).toHaveBeenCalled();
      const calledValue = onChange.mock.calls[0][0] as Time;
      expect(calledValue.second).toBe(45);
    });
  });

  describe("min/max prop", () => {
    it("min 속성이 적용된다", () => {
      const onChange = vi.fn();
      const minTime = new Time(9, 0, 0);
      render(() => <TimeField value={undefined} onChange={onChange} min={minTime} />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      expect(input.min).toBe("09:00");
    });

    it("max 속성이 적용된다", () => {
      const onChange = vi.fn();
      const maxTime = new Time(18, 0, 0);
      render(() => <TimeField value={undefined} onChange={onChange} max={maxTime} />);

      const input = document.querySelector('input[type="time"]') as HTMLInputElement;
      expect(input.max).toBe("18:00");
    });
  });
});
