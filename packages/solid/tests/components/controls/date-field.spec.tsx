import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DateField } from "../../../src/components/controls/date-field";
import { DateOnly } from "@simplysm/core-common";

describe("DateField", () => {
  describe("기본 렌더링", () => {
    it("DateOnly 값이 올바르게 렌더링된다", () => {
      const onChange = vi.fn();
      const date = new DateOnly(2025, 1, 15);
      render(() => <DateField value={date} onChange={onChange} />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("2025-01-15");
    });

    it("undefined 값은 빈 문자열로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <DateField value={undefined} onChange={onChange} />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  describe("value/onChange 동작", () => {
    it("날짜를 선택하면 DateOnly 타입으로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <DateField value={undefined} onChange={onChange} />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "2025-06-20" } });

      expect(onChange).toHaveBeenCalled();
      const calledValue = onChange.mock.calls[0][0] as DateOnly;
      expect(calledValue).toBeInstanceOf(DateOnly);
      expect(calledValue.year).toBe(2025);
      expect(calledValue.month).toBe(6);
      expect(calledValue.day).toBe(20);
    });

    it("값을 지우면 undefined로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      const date = new DateOnly(2025, 1, 15);
      render(() => <DateField value={date} onChange={onChange} />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("type prop", () => {
    it("type=month일 때 month input으로 렌더링된다", () => {
      const onChange = vi.fn();
      const date = new DateOnly(2025, 6, 1);
      render(() => <DateField value={date} onChange={onChange} type="month" />);

      const input = document.querySelector('input[type="month"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("2025-06");
    });

    it("type=year일 때 number input으로 렌더링된다", () => {
      const onChange = vi.fn();
      const date = new DateOnly(2025, 1, 1);
      render(() => <DateField value={date} onChange={onChange} type="year" />);

      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("2025");
    });
  });

  describe("min/max prop", () => {
    it("min 속성이 적용된다", () => {
      const onChange = vi.fn();
      const minDate = new DateOnly(2024, 1, 1);
      render(() => <DateField value={undefined} onChange={onChange} min={minDate} />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input.min).toBe("2024-01-01");
    });

    it("max 속성이 적용된다", () => {
      const onChange = vi.fn();
      const maxDate = new DateOnly(2025, 12, 31);
      render(() => <DateField value={undefined} onChange={onChange} max={maxDate} />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input.max).toBe("2025-12-31");
    });
  });

  describe("ARIA 속성", () => {
    it("disabled 시 aria-disabled가 설정된다", () => {
      const onChange = vi.fn();
      render(() => <DateField value={undefined} onChange={onChange} disabled />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute("aria-disabled", "true");
    });

    it("readOnly 시 aria-readonly가 설정된다", () => {
      const onChange = vi.fn();
      render(() => <DateField value={undefined} onChange={onChange} readOnly />);

      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input).toHaveAttribute("readonly");
      expect(input).toHaveAttribute("aria-readonly", "true");
    });
  });
});
