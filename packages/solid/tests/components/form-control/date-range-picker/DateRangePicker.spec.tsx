import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DateOnly } from "@simplysm/core-common";
import { DateRangePicker } from "../../../../src/components/form-control/date-range-picker/DateRangePicker";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("DateRangePicker component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

  describe("basic rendering", () => {
    it("renders Select and DatePicker", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker />
        </I18nProvider></ConfigProvider>
      ));

      const wrapper = container.querySelector("[data-date-range-picker]");
      expect(wrapper).toBeTruthy();

      const select = wrapper?.querySelector("[data-select]");
      expect(select).toBeTruthy();

      const inputs = wrapper?.querySelectorAll("input");
      expect(inputs?.length).toBeGreaterThan(0);
    });

    it("defaults periodType to 'range'", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker />
        </I18nProvider></ConfigProvider>
      ));
      const wrapper = container.querySelector("[data-date-range-picker]");

      // range mode renders 2 DatePickers
      const inputs = wrapper?.querySelectorAll("input[type='date']");
      expect(inputs?.length).toBe(2);
    });
  });

  describe("'range' mode rendering", () => {
    it("renders 2 DatePickers and a '~' separator", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker periodType="range" />
        </I18nProvider></ConfigProvider>
      ));
      const wrapper = container.querySelector("[data-date-range-picker]");

      const inputs = wrapper?.querySelectorAll("input[type='date']");
      expect(inputs?.length).toBe(2);

      // verify "~" separator
      expect(wrapper?.textContent).toContain("~");
    });
  });

  describe("'day' mode rendering", () => {
    it("renders 1 DatePicker (type=date) with no '~'", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker periodType="day" />
        </I18nProvider></ConfigProvider>
      ));
      const wrapper = container.querySelector("[data-date-range-picker]");

      const dateInputs = wrapper?.querySelectorAll("input[type='date']");
      expect(dateInputs?.length).toBe(1);

      // "~" separator must not be present
      const textNodes = wrapper?.textContent ?? "";
      expect(textNodes).not.toContain("~");
    });
  });

  describe("'month' mode rendering", () => {
    it("renders 1 DatePicker (type=month) with no '~'", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker periodType="month" />
        </I18nProvider></ConfigProvider>
      ));
      const wrapper = container.querySelector("[data-date-range-picker]");

      const monthInputs = wrapper?.querySelectorAll("input[type='month']");
      expect(monthInputs?.length).toBe(1);

      // no date-type inputs
      const dateInputs = wrapper?.querySelectorAll("input[type='date']");
      expect(dateInputs?.length).toBe(0);

      // "~" separator must not be present
      expect(wrapper?.textContent).not.toContain("~");
    });
  });

  describe("from change - 'day' mode", () => {
    it("calls onToChange with the same value when from changes", () => {
      const onFromChange = vi.fn();
      const onToChange = vi.fn();

      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker
          periodType="day"
          from={new DateOnly(2025, 1, 1)}
          onFromChange={onFromChange}
          to={new DateOnly(2025, 1, 1)}
          onToChange={onToChange}
        />
        </I18nProvider></ConfigProvider>
      ));

      const wrapper = container.querySelector("[data-date-range-picker]");
      const input = wrapper?.querySelector("input[type='date']") as HTMLInputElement;

      // trigger from change by inputting a new value
      input.value = "2025-06-15";
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // in "day" mode, to is set to the same value as from
      const expectedDate = new DateOnly(2025, 6, 15);
      expect(onToChange).toHaveBeenCalledWith(expectedDate);
    });
  });

  describe("from change - 'range' mode", () => {
    it("calls onToChange(from) when from > to", () => {
      const onFromChange = vi.fn();
      const onToChange = vi.fn();
      const originalTo = new DateOnly(2025, 3, 1);
      const newFrom = new DateOnly(2025, 6, 15); // greater than to

      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker
          periodType="range"
          from={new DateOnly(2025, 1, 1)}
          onFromChange={onFromChange}
          to={originalTo}
          onToChange={onToChange}
        />
        </I18nProvider></ConfigProvider>
      ));

      const wrapper = container.querySelector("[data-date-range-picker]");
      const inputs = wrapper?.querySelectorAll("input[type='date']");
      const fromInput = inputs?.[0] as HTMLInputElement;

      // enter a date greater than to into from input
      expect(fromInput).toBeDefined();
      fromInput.value = "2025-06-15";
      fromInput.dispatchEvent(new Event("change", { bubbles: true }));

      // since from > to, to must be updated to match from
      expect(onToChange).toHaveBeenCalledWith(newFrom);
    });
  });

  describe("disabled state", () => {
    it("applies aria-disabled to Select", () => {
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
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker />
        </I18nProvider></ConfigProvider>
      ));

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
