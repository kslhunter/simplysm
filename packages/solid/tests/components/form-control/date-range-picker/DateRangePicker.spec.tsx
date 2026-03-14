import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DateOnly } from "@simplysm/core-common";
import { DateRangePicker } from "../../../../src/components/form-control/date-range-picker/DateRangePicker";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("DateRangePicker component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

  describe("basic rendering", () => {
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

  describe("required prop propagation", () => {
    it("propagates required to child DatePickers in range mode", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker periodType="range" required />
        </I18nProvider></ConfigProvider>
      ));
      const wrapper = container.querySelector("[data-date-range-picker]");
      const dateFields = wrapper?.querySelectorAll("[data-date-field]");

      // range mode has 2 DatePickers (from + to)
      expect(dateFields?.length).toBe(2);

      // Each DatePicker's hidden input should have the required validation message
      dateFields?.forEach((field) => {
        const hiddenInput = field.querySelector("input[aria-hidden='true']") as HTMLInputElement;
        expect(hiddenInput).toBeTruthy();
        expect(hiddenInput.validationMessage).toBe("This is a required field");
      });
    });

    it("propagates required to child DatePicker in day mode", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker periodType="day" required />
        </I18nProvider></ConfigProvider>
      ));
      const wrapper = container.querySelector("[data-date-range-picker]");
      const dateFields = wrapper?.querySelectorAll("[data-date-field]");

      // day mode has 1 DatePicker
      expect(dateFields?.length).toBe(1);

      const hiddenInput = dateFields?.[0].querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput).toBeTruthy();
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("propagates required to child DatePicker in month mode", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <DateRangePicker periodType="month" required />
        </I18nProvider></ConfigProvider>
      ));
      const wrapper = container.querySelector("[data-date-range-picker]");
      const dateFields = wrapper?.querySelectorAll("[data-date-field]");

      // month mode has 1 DatePicker
      expect(dateFields?.length).toBe(1);

      const hiddenInput = dateFields?.[0].querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput).toBeTruthy();
      expect(hiddenInput.validationMessage).toBe("This is a required field");
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

});
