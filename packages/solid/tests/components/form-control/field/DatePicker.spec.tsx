import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import { DatePicker } from "../../../../src/components/form-control/field/DatePicker";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("DatePicker component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  describe("value conversion", () => {
    it("displays DateOnly in yyyy format for year type", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="year" value={dateOnly} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025");
    });

    it("displays DateOnly in yyyy-MM format for month type", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="month" value={dateOnly} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03");
    });

    it("displays DateOnly in yyyy-MM-dd format for date type", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" value={dateOnly} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15");
    });

    it("passes DateOnly converted from year input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="year" onValueChange={handleChange} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateOnly;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it("passes DateOnly converted from month input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="month" onValueChange={handleChange} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateOnly;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(1);
    });

    it("passes DateOnly converted from date input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" onValueChange={handleChange} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03-15" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateOnly;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
    });

    it("passes undefined to onValueChange on empty input", () => {
      const handleChange = vi.fn();
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" value={dateOnly} onValueChange={handleChange} /></I18nProvider></ConfigProvider>
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("min/max props", () => {
    it("converts min to string for date type", () => {
      const minDate = new DateOnly(2025, 1, 1);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" min={minDate} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01");
    });

    it("converts max to string for date type", () => {
      const maxDate = new DateOnly(2025, 12, 31);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" max={maxDate} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31");
    });

    it("converts min to yyyy-MM format for month type", () => {
      const minDate = new DateOnly(2025, 1, 15);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="month" min={minDate} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01");
    });

    it("converts max to yyyy-MM format for month type", () => {
      const maxDate = new DateOnly(2025, 12, 15);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="month" max={maxDate} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12");
    });

    it("converts min to number for year type", () => {
      const minDate = new DateOnly(2020, 1, 1);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="year" min={minDate} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2020");
    });

    it("converts max to number for year type", () => {
      const maxDate = new DateOnly(2030, 12, 31);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="year" max={maxDate} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2030");
    });
  });

  describe("controlled pattern", () => {
    it("updates input value when external state changes", () => {
      const [value, setValue] = createSignal<DateOnly | undefined>(new DateOnly(2025, 1, 1));
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01");

      setValue(new DateOnly(2025, 12, 31));
      expect(input.value).toBe("2025-12-31");
    });
  });

  describe("uncontrolled pattern", () => {
    it("manages value internally without onValueChange", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" value={new DateOnly(2025, 1, 1)} /></I18nProvider></ConfigProvider>
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01");

      fireEvent.change(input, { target: { value: "2025-06-15" } });
      expect(input.value).toBe("2025-06-15");
    });
  });

  describe("disabled state", () => {
    it("renders as div when disabled=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker disabled value={new DateOnly(2025, 3, 15)} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-date-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when disabled", () => {
      const { getByText } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" disabled value={new DateOnly(2025, 3, 15)} /></I18nProvider></ConfigProvider>
      ));
      expect(getByText("2025-03-15")).toBeTruthy();
    });

  });

  describe("readonly state", () => {
    it("renders as div when readonly=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker readOnly value={new DateOnly(2025, 3, 15)} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-date-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker unit="date" readOnly value={new DateOnly(2025, 3, 15)} /></I18nProvider></ConfigProvider>
      ));
      expect(getByText("2025-03-15")).toBeTruthy();
    });
  });

  describe("inset style", () => {
    it("shows content div and no input when inset + readonly", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker inset readOnly value={new DateOnly(2025, 3, 15)} /></I18nProvider></ConfigProvider>
      ));
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("2025-03-15");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("shows hidden content div and input when inset + editable", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker inset value={new DateOnly(2025, 3, 15)} /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe("2025-03-15");
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker inset readOnly /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker required value={undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><DatePicker required value={new DateOnly(2024, 1, 1)} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when min is violated", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker min={new DateOnly(2024, 6, 1)} value={new DateOnly(2024, 1, 1)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when min is satisfied", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker min={new DateOnly(2024, 1, 1)} value={new DateOnly(2024, 6, 1)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when max is violated", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker max={new DateOnly(2024, 6, 1)} value={new DateOnly(2024, 12, 1)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when max is satisfied", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker max={new DateOnly(2024, 12, 31)} value={new DateOnly(2024, 6, 1)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker value={new DateOnly(2024, 1, 1)} validate={() => "커스텀 에러"} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><DatePicker value={new DateOnly(2024, 1, 1)} validate={() => undefined} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
