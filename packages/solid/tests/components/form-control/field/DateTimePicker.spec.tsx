import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { DateTime } from "@simplysm/core-common";
import { DateTimePicker } from "../../../../src/components/form-control/field/DateTimePicker";

describe("DateTimePicker component", () => {
  describe("basic rendering", () => {
    it("renders input type=datetime-local when unit=minute", () => {
      const { container } = render(() => <DateTimePicker unit="minute" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("datetime-local");
    });

    it("renders input type=datetime-local when unit=second", () => {
      const { container } = render(() => <DateTimePicker unit="second" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("datetime-local");
    });

    it("defaults unit to minute", () => {
      const { container } = render(() => <DateTimePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("datetime-local");
    });

    it("defaults autocomplete to one-time-code", () => {
      const { container } = render(() => <DateTimePicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.autocomplete).toBe("one-time-code");
    });

    it("sets step=1 when unit=second", () => {
      const { container } = render(() => <DateTimePicker unit="second" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("1");
    });

    it("does not set step when unit=minute", () => {
      const { container } = render(() => <DateTimePicker unit="minute" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("");
    });
  });

  describe("value conversion", () => {
    it("displays DateTime in yyyy-MM-ddTHH:mm format for minute unit", () => {
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => <DateTimePicker unit="minute" value={dateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15T10:30");
    });

    it("displays DateTime in yyyy-MM-ddTHH:mm:ss format for second unit", () => {
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => <DateTimePicker unit="second" value={dateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2025-03-15T10:30:45");
    });

    it("passes DateTime converted from minute input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <DateTimePicker unit="minute" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03-15T10:30" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateTime;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(0);
    });

    it("passes DateTime converted from second input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <DateTimePicker unit="second" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "2025-03-15T10:30:45" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as DateTime;
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(45);
    });

    it("passes undefined to onValueChange on empty input", () => {
      const handleChange = vi.fn();
      const dateTime = new DateTime(2025, 3, 15, 10, 30, 45);
      const { container } = render(() => (
        <DateTimePicker unit="minute" value={dateTime} onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("min/max props", () => {
    it("converts min to string for minute unit", () => {
      const minDateTime = new DateTime(2025, 1, 1, 0, 0, 0);
      const { container } = render(() => <DateTimePicker unit="minute" min={minDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01T00:00");
    });

    it("converts max to string for minute unit", () => {
      const maxDateTime = new DateTime(2025, 12, 31, 23, 59, 0);
      const { container } = render(() => <DateTimePicker unit="minute" max={maxDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31T23:59");
    });

    it("includes seconds in min for second unit", () => {
      const minDateTime = new DateTime(2025, 1, 1, 0, 0, 30);
      const { container } = render(() => <DateTimePicker unit="second" min={minDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.min).toBe("2025-01-01T00:00:30");
    });

    it("includes seconds in max for second unit", () => {
      const maxDateTime = new DateTime(2025, 12, 31, 23, 59, 59);
      const { container } = render(() => <DateTimePicker unit="second" max={maxDateTime} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.max).toBe("2025-12-31T23:59:59");
    });
  });

  describe("controlled pattern", () => {
    it("updates input value when external state changes", () => {
      const [value, setValue] = createSignal<DateTime | undefined>(
        new DateTime(2025, 1, 1, 10, 0, 0),
      );
      const { container } = render(() => (
        <DateTimePicker unit="minute" value={value()} onValueChange={setValue} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01T10:00");

      setValue(new DateTime(2025, 12, 31, 23, 59, 0));
      expect(input.value).toBe("2025-12-31T23:59");
    });
  });

  describe("uncontrolled pattern", () => {
    it("manages value internally without onValueChange", () => {
      const { container } = render(() => (
        <DateTimePicker unit="minute" value={new DateTime(2025, 1, 1, 10, 0, 0)} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("2025-01-01T10:00");

      fireEvent.change(input, { target: { value: "2025-06-15T14:30" } });
      expect(input.value).toBe("2025-06-15T14:30");
    });
  });

  describe("disabled state", () => {
    it("renders as div when disabled=true", () => {
      const { container } = render(() => (
        <DateTimePicker disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-datetime-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when disabled", () => {
      const { getByText } = render(() => (
        <DateTimePicker unit="minute" disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      expect(getByText("2025-03-15T10:30")).toBeTruthy();
    });

    it("applies disabled style", () => {
      const { container } = render(() => (
        <DateTimePicker disabled value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const div = container.querySelector("div.sd-datetime-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly state", () => {
    it("renders as div when readonly=true", () => {
      const { container } = render(() => (
        <DateTimePicker readonly value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-datetime-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => (
        <DateTimePicker unit="minute" readonly value={new DateTime(2025, 3, 15, 10, 30, 0)} />
      ));
      expect(getByText("2025-03-15T10:30")).toBeTruthy();
    });
  });

  describe("size option", () => {
    it("applies small padding when size=sm", () => {
      const { container } = render(() => <DateTimePicker size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("applies large padding when size=lg", () => {
      const { container } = render(() => <DateTimePicker size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset style", () => {
    it("applies relative to outer and inset style to content when inset=true", () => {
      const { container } = render(() => <DateTimePicker inset />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);
      expect(outer.classList.contains("border-none")).toBe(false);

      const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
      expect(contentDiv.classList.contains("border-none")).toBe(true);
      expect(contentDiv.classList.contains("bg-primary-50")).toBe(true);
    });

    it("shows content div and no input when inset + readonly", () => {
      const { container } = render(() => (
        <DateTimePicker inset readonly value={new DateTime(2025, 3, 15, 14, 30, 0)} />
      ));
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("2025-03-15T14:30");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("shows hidden content div and input when inset + editable", () => {
      const { container } = render(() => (
        <DateTimePicker inset value={new DateTime(2025, 3, 15, 14, 30, 0)} />
      ));
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      expect(outer.querySelector("input")).toBeTruthy();
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <DateTimePicker inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("dark mode style", () => {
    it("applies dark mode border style", () => {
      const { container } = render(() => <DateTimePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
    });

    it("applies dark mode background style", () => {
      const { container } = render(() => <DateTimePicker />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-primary-950/30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom class with existing styles", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <DateTimePicker class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <DateTimePicker required value={undefined} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This field is required");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => (
        <DateTimePicker required value={new DateTime(2024, 1, 1, 0, 0, 0)} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when min is violated", () => {
      const { container } = render(() => (
        <DateTimePicker
          min={new DateTime(2024, 6, 1, 0, 0, 0)}
          value={new DateTime(2024, 1, 1, 0, 0, 0)}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when min is satisfied", () => {
      const { container } = render(() => (
        <DateTimePicker
          min={new DateTime(2024, 1, 1, 0, 0, 0)}
          value={new DateTime(2024, 6, 1, 0, 0, 0)}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when max is violated", () => {
      const { container } = render(() => (
        <DateTimePicker
          max={new DateTime(2024, 6, 1, 0, 0, 0)}
          value={new DateTime(2024, 12, 1, 0, 0, 0)}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when max is satisfied", () => {
      const { container } = render(() => (
        <DateTimePicker
          max={new DateTime(2024, 12, 31, 23, 59, 59)}
          value={new DateTime(2024, 6, 1, 0, 0, 0)}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <DateTimePicker value={new DateTime(2024, 1, 1, 0, 0, 0)} validate={() => "커스텀 에러"} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <DateTimePicker value={new DateTime(2024, 1, 1, 0, 0, 0)} validate={() => undefined} />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
