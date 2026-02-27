import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import { DatePicker } from "../../../../src/components/form-control/field/DatePicker";

describe("DatePicker component", () => {
  describe("basic rendering", () => {
    it("renders input type=number when unit=year", () => {
      const { container } = render(() => <DatePicker unit="year" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("number");
    });

    it("renders input type=month when unit=month", () => {
      const { container } = render(() => <DatePicker unit="month" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("month");
    });

    it("renders input type=date when unit=date", () => {
      const { container } = render(() => <DatePicker unit="date" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("date");
    });

    it("defaults autocomplete to one-time-code", () => {
      const { container } = render(() => <DatePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.autocomplete).toBe("one-time-code");
    });

    it("defaults unit to date", () => {
      const { container } = render(() => <DatePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("date");
    });
  });

  describe("value conversion", () => {
    it("displays DateOnly in yyyy format for year type", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <DatePicker unit="year" value={dateOnly} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025");
    });

    it("displays DateOnly in yyyy-MM format for month type", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <DatePicker unit="month" value={dateOnly} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03");
    });

    it("displays DateOnly in yyyy-MM-dd format for date type", () => {
      const dateOnly = new DateOnly(2025, 3, 15);
      const { container } = render(() => <DatePicker unit="date" value={dateOnly} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15");
    });

    it("passes DateOnly converted from year input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <DatePicker unit="year" onValueChange={handleChange} />);
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
      const { container } = render(() => <DatePicker unit="month" onValueChange={handleChange} />);
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
      const { container } = render(() => <DatePicker unit="date" onValueChange={handleChange} />);
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
        <DatePicker unit="date" value={dateOnly} onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("min/max props", () => {
    it("converts min to string for date type", () => {
      const minDate = new DateOnly(2025, 1, 1);
      const { container } = render(() => <DatePicker unit="date" min={minDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01");
    });

    it("converts max to string for date type", () => {
      const maxDate = new DateOnly(2025, 12, 31);
      const { container } = render(() => <DatePicker unit="date" max={maxDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31");
    });

    it("converts min to yyyy-MM format for month type", () => {
      const minDate = new DateOnly(2025, 1, 15);
      const { container } = render(() => <DatePicker unit="month" min={minDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01");
    });

    it("converts max to yyyy-MM format for month type", () => {
      const maxDate = new DateOnly(2025, 12, 15);
      const { container } = render(() => <DatePicker unit="month" max={maxDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12");
    });

    it("converts min to number for year type", () => {
      const minDate = new DateOnly(2020, 1, 1);
      const { container } = render(() => <DatePicker unit="year" min={minDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2020");
    });

    it("converts max to number for year type", () => {
      const maxDate = new DateOnly(2030, 12, 31);
      const { container } = render(() => <DatePicker unit="year" max={maxDate} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2030");
    });
  });

  describe("controlled pattern", () => {
    it("updates input value when external state changes", () => {
      const [value, setValue] = createSignal<DateOnly | undefined>(new DateOnly(2025, 1, 1));
      const { container } = render(() => (
        <DatePicker unit="date" value={value()} onValueChange={setValue} />
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
        <DatePicker unit="date" value={new DateOnly(2025, 1, 1)} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01");

      fireEvent.change(input, { target: { value: "2025-06-15" } });
      expect(input.value).toBe("2025-06-15");
    });
  });

  describe("disabled state", () => {
    it("renders as div when disabled=true", () => {
      const { container } = render(() => <DatePicker disabled value={new DateOnly(2025, 3, 15)} />);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-date-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when disabled", () => {
      const { getByText } = render(() => (
        <DatePicker unit="date" disabled value={new DateOnly(2025, 3, 15)} />
      ));
      expect(getByText("2025-03-15")).toBeTruthy();
    });

    it("applies disabled style", () => {
      const { container } = render(() => <DatePicker disabled value={new DateOnly(2025, 3, 15)} />);
      const div = container.querySelector("div.sd-date-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly state", () => {
    it("renders as div when readonly=true", () => {
      const { container } = render(() => <DatePicker readonly value={new DateOnly(2025, 3, 15)} />);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-date-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => (
        <DatePicker unit="date" readonly value={new DateOnly(2025, 3, 15)} />
      ));
      expect(getByText("2025-03-15")).toBeTruthy();
    });
  });

  describe("size option", () => {
    it("applies small padding when size=sm", () => {
      const { container } = render(() => <DatePicker size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("applies large padding when size=lg", () => {
      const { container } = render(() => <DatePicker size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset style", () => {
    it("applies relative to outer and inset style to content when inset=true", () => {
      const { container } = render(() => <DatePicker inset />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);
      expect(outer.classList.contains("border-none")).toBe(false);

      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv.classList.contains("border-none")).toBe(true);
      expect(contentDiv.classList.contains("bg-primary-50")).toBe(true);
    });

    it("shows content div and no input when inset + readonly", () => {
      const { container } = render(() => (
        <DatePicker inset readonly value={new DateOnly(2025, 3, 15)} />
      ));
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("2025-03-15");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("shows hidden content div and input when inset + editable", () => {
      const { container } = render(() => <DatePicker inset value={new DateOnly(2025, 3, 15)} />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe("2025-03-15");
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <DatePicker inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("dark mode style", () => {
    it("applies dark mode border style", () => {
      const { container } = render(() => <DatePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
    });

    it("applies dark mode background style", () => {
      const { container } = render(() => <DatePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-primary-950/30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom class with existing styles", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <DatePicker class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <DatePicker required value={undefined} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This field is required");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <DatePicker required value={new DateOnly(2024, 1, 1)} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when min is violated", () => {
      const { container } = render(() => (
        <DatePicker min={new DateOnly(2024, 6, 1)} value={new DateOnly(2024, 1, 1)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when min is satisfied", () => {
      const { container } = render(() => (
        <DatePicker min={new DateOnly(2024, 1, 1)} value={new DateOnly(2024, 6, 1)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when max is violated", () => {
      const { container } = render(() => (
        <DatePicker max={new DateOnly(2024, 6, 1)} value={new DateOnly(2024, 12, 1)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when max is satisfied", () => {
      const { container } = render(() => (
        <DatePicker max={new DateOnly(2024, 12, 31)} value={new DateOnly(2024, 6, 1)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <DatePicker value={new DateOnly(2024, 1, 1)} validate={() => "커스텀 에러"} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <DatePicker value={new DateOnly(2024, 1, 1)} validate={() => undefined} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
