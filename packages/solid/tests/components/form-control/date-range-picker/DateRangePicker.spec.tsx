import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { DateOnly } from "@simplysm/core-common";
import { DateRangePicker } from "../../../../src/components/form-control/date-range-picker/DateRangePicker";

describe("DateRangePicker 컴포넌트", () => {
  describe("basic rendering", () => {
    it("Select와 DatePicker가 렌더링된다", () => {
      const { container } = render(() => <DateRangePicker />);

      const wrapper = container.querySelector("[data-date-range-picker]");
      expect(wrapper).toBeTruthy();

      const select = wrapper?.querySelector("[data-select]");
      expect(select).toBeTruthy();

      const inputs = wrapper?.querySelectorAll("input");
      expect(inputs?.length).toBeGreaterThan(0);
    });

    it("기본 periodType은 'range'이다", () => {
      const { container } = render(() => <DateRangePicker />);
      const wrapper = container.querySelector("[data-date-range-picker]");

      // 범위 모드에서는 DatePicker 2개가 렌더링됨
      const inputs = wrapper?.querySelectorAll("input[type='date']");
      expect(inputs?.length).toBe(2);
    });
  });

  describe("'range' 모드 렌더링", () => {
    it("DatePicker 2개와 '~' 구분자가 렌더링된다", () => {
      const { container } = render(() => <DateRangePicker periodType="range" />);
      const wrapper = container.querySelector("[data-date-range-picker]");

      const inputs = wrapper?.querySelectorAll("input[type='date']");
      expect(inputs?.length).toBe(2);

      // "~" 구분자 확인
      expect(wrapper?.textContent).toContain("~");
    });
  });

  describe("'day' 모드 렌더링", () => {
    it("DatePicker 1개(type=date)가 렌더링되고 '~'가 없다", () => {
      const { container } = render(() => <DateRangePicker periodType="day" />);
      const wrapper = container.querySelector("[data-date-range-picker]");

      const dateInputs = wrapper?.querySelectorAll("input[type='date']");
      expect(dateInputs?.length).toBe(1);

      // "~" 구분자가 없어야 함
      const textNodes = wrapper?.textContent ?? "";
      expect(textNodes).not.toContain("~");
    });
  });

  describe("'month' 모드 렌더링", () => {
    it("DatePicker 1개(type=month)가 렌더링되고 '~'가 없다", () => {
      const { container } = render(() => <DateRangePicker periodType="month" />);
      const wrapper = container.querySelector("[data-date-range-picker]");

      const monthInputs = wrapper?.querySelectorAll("input[type='month']");
      expect(monthInputs?.length).toBe(1);

      // date 타입 input이 없어야 함
      const dateInputs = wrapper?.querySelectorAll("input[type='date']");
      expect(dateInputs?.length).toBe(0);

      // "~" 구분자가 없어야 함
      expect(wrapper?.textContent).not.toContain("~");
    });
  });

  describe("from 변경 - 'day' 모드", () => {
    it("from 변경 시 onToChange도 같은 값으로 호출된다", () => {
      const onFromChange = vi.fn();
      const onToChange = vi.fn();

      const { container } = render(() => (
        <DateRangePicker
          periodType="day"
          from={new DateOnly(2025, 1, 1)}
          onFromChange={onFromChange}
          to={new DateOnly(2025, 1, 1)}
          onToChange={onToChange}
        />
      ));

      const wrapper = container.querySelector("[data-date-range-picker]");
      const input = wrapper?.querySelector("input[type='date']") as HTMLInputElement;

      // input에 새 값을 입력하여 from 변경 트리거
      input.value = "2025-06-15";
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // "day" 모드에서는 from 변경 시 to도 같은 값으로 설정됨
      const expectedDate = new DateOnly(2025, 6, 15);
      expect(onToChange).toHaveBeenCalledWith(expectedDate);
    });
  });

  describe("from 변경 - 'range' 모드", () => {
    it("from > to이면 onToChange(from)이 호출된다", () => {
      const onFromChange = vi.fn();
      const onToChange = vi.fn();
      const originalTo = new DateOnly(2025, 3, 1);
      const newFrom = new DateOnly(2025, 6, 15); // to보다 큰 값

      const { container } = render(() => (
        <DateRangePicker
          periodType="range"
          from={new DateOnly(2025, 1, 1)}
          onFromChange={onFromChange}
          to={originalTo}
          onToChange={onToChange}
        />
      ));

      const wrapper = container.querySelector("[data-date-range-picker]");
      const inputs = wrapper?.querySelectorAll("input[type='date']");
      const fromInput = inputs?.[0] as HTMLInputElement;

      // from input에 to보다 큰 날짜 입력
      expect(fromInput).toBeDefined();
      fromInput.value = "2025-06-15";
      fromInput.dispatchEvent(new Event("change", { bubbles: true }));

      // from > to이므로 to도 from 값으로 변경되어야 함
      expect(onToChange).toHaveBeenCalledWith(newFrom);
    });
  });

  describe("disabled state", () => {
    it("Select에 aria-disabled가 적용된다", () => {
      const { container } = render(() => <DateRangePicker disabled />);
      const wrapper = container.querySelector("[data-date-range-picker]");

      const select = wrapper?.querySelector("[data-select]");
      const combobox = select?.querySelector("[role='combobox']") ?? select;

      expect(
        combobox?.getAttribute("aria-disabled") === "true" ||
          select?.getAttribute("aria-disabled") === "true",
      ).toBe(true);
    });
  });

  describe("period type labels", () => {
    it("displays 'Range' label for default periodType 'range'", () => {
      const { container } = render(() => <DateRangePicker />);

      const wrapper = container.querySelector("[data-date-range-picker]");
      const select = wrapper?.querySelector("[data-select]");

      expect(select?.textContent).toContain("Range");
    });
  });

  describe("class merging", () => {
    it("applies custom class to wrapper", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <DateRangePicker class="my-custom-class" />);
      const wrapper = container.querySelector("[data-date-range-picker]") as HTMLElement;

      expect(wrapper).toBeTruthy();
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });
});
