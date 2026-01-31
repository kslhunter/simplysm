import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DateTimeField } from "../../../src/components/controls/datetime-field";
import { DateTime } from "@simplysm/core-common";

describe("DateTimeField", () => {
  describe("기본 렌더링", () => {
    it("DateTime 값이 올바르게 렌더링된다", () => {
      const onChange = vi.fn();
      const dt = new DateTime(2025, 6, 15, 10, 30, 0);
      render(() => <DateTimeField value={dt} onChange={onChange} />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("2025-06-15T10:30");
    });

    it("undefined 값은 빈 문자열로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <DateTimeField value={undefined} onChange={onChange} />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  describe("value/onChange 동작", () => {
    it("날짜+시간을 선택하면 DateTime 타입으로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <DateTimeField value={undefined} onChange={onChange} />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "2025-06-20T14:30" } });

      expect(onChange).toHaveBeenCalled();
      const calledValue = onChange.mock.calls[0][0] as DateTime;
      expect(calledValue).toBeInstanceOf(DateTime);
      expect(calledValue.year).toBe(2025);
      expect(calledValue.month).toBe(6);
      expect(calledValue.day).toBe(20);
      expect(calledValue.hour).toBe(14);
      expect(calledValue.minute).toBe(30);
    });

    it("값을 지우면 undefined로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      const dt = new DateTime(2025, 6, 15, 10, 30, 0);
      render(() => <DateTimeField value={dt} onChange={onChange} />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("type prop", () => {
    it("type=datetime-sec일 때 초 단위가 포함된다", () => {
      const onChange = vi.fn();
      const dt = new DateTime(2025, 6, 15, 10, 30, 45);
      render(() => <DateTimeField value={dt} onChange={onChange} type="datetime-sec" />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      expect(input.value).toBe("2025-06-15T10:30:45");
      expect(input.step).toBe("1");
    });

    it("type=datetime-sec일 때 초 단위 입력이 동작한다", () => {
      const onChange = vi.fn();
      render(() => <DateTimeField value={undefined} onChange={onChange} type="datetime-sec" />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "2025-06-20T14:30:45" } });

      expect(onChange).toHaveBeenCalled();
      const calledValue = onChange.mock.calls[0][0] as DateTime;
      expect(calledValue.second).toBe(45);
    });
  });

  describe("min/max prop", () => {
    it("min 속성이 적용된다", () => {
      const onChange = vi.fn();
      const minDt = new DateTime(2024, 1, 1, 0, 0, 0);
      render(() => <DateTimeField value={undefined} onChange={onChange} min={minDt} />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      expect(input.min).toBe("2024-01-01T00:00");
    });

    it("max 속성이 적용된다", () => {
      const onChange = vi.fn();
      const maxDt = new DateTime(2025, 12, 31, 23, 59, 0);
      render(() => <DateTimeField value={undefined} onChange={onChange} max={maxDt} />);

      const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      expect(input.max).toBe("2025-12-31T23:59");
    });
  });
});
