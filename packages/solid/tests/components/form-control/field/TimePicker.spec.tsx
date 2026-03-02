import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { Time } from "@simplysm/core-common";
import { TimePicker } from "../../../../src/components/form-control/field/TimePicker";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("TimePicker component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  describe("basic rendering", () => {
    it("renders input type=time when unit=minute", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("time");
    });

    it("renders input type=time when unit=second", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="second" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("time");
    });

    it("defaults unit to minute", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("time");
    });

    it("defaults autocomplete to one-time-code", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.autocomplete).toBe("one-time-code");
    });

    it("sets step=1 when unit=second", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="second" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("1");
    });

    it("does not set step when unit=minute", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.step).toBe("");
    });
  });

  describe("value conversion", () => {
    it("displays Time in HH:mm format for minute unit", () => {
      const time = new Time(10, 30, 45);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" value={time} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("10:30");
    });

    it("displays Time in HH:mm:ss format for second unit", () => {
      const time = new Time(10, 30, 45);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="second" value={time} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("10:30:45");
    });

    it("passes Time converted from minute input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" onValueChange={handleChange} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "10:30" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as Time;
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(0);
    });

    it("passes Time converted from second input to onValueChange", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="second" onValueChange={handleChange} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "10:30:45" } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      const result = handleChange.mock.calls[0][0] as Time;
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(45);
    });

    it("passes undefined to onValueChange on empty input", () => {
      const handleChange = vi.fn();
      const time = new Time(10, 30, 45);
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" value={time} onValueChange={handleChange} /></I18nProvider></ConfigProvider>
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("controlled pattern", () => {
    it("updates input value when external state changes", () => {
      const [value, setValue] = createSignal<Time | undefined>(new Time(10, 0, 0));
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("10:00");

      setValue(new Time(23, 59, 0));
      expect(input.value).toBe("23:59");
    });
  });

  describe("uncontrolled pattern", () => {
    it("manages value internally without onValueChange", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" value={new Time(10, 0, 0)} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("10:00");

      fireEvent.change(input, { target: { value: "14:30" } });
      expect(input.value).toBe("14:30");
    });
  });

  describe("disabled state", () => {
    it("renders as div when disabled=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker disabled value={new Time(10, 30, 0)} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-time-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when disabled", () => {
      const { getByText } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" disabled value={new Time(10, 30, 0)} /></I18nProvider></ConfigProvider>
      ));
      expect(getByText("10:30")).toBeTruthy();
    });

    it("applies disabled style", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker disabled value={new Time(10, 30, 0)} /></I18nProvider></ConfigProvider>);
      const div = container.querySelector("div.sd-time-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly state", () => {
    it("renders as div when readonly=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker readonly value={new Time(10, 30, 0)} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-time-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker unit="minute" readonly value={new Time(10, 30, 0)} /></I18nProvider></ConfigProvider>
      ));
      expect(getByText("10:30")).toBeTruthy();
    });
  });

  describe("size option", () => {
    it("applies small padding when size=sm", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker size="sm" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("applies large padding when size=lg", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker size="lg" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset style", () => {
    it("applies relative to outer and inset style to content when inset=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker inset /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);
      expect(outer.classList.contains("border-none")).toBe(false);

      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv.classList.contains("border-none")).toBe(true);
      expect(contentDiv.classList.contains("bg-primary-50")).toBe(true);
    });

    it("shows content div and no input when inset + readonly", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker inset readonly value={new Time(14, 30, 0)} /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("14:30");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("shows hidden content div and input when inset + editable", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker inset value={new Time(14, 30, 0)} /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      expect(outer.querySelector("input")).toBeTruthy();
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker inset readonly /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("dark mode style", () => {
    it("applies dark mode border style", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
    });

    it("applies dark mode background style", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:bg-primary-950/30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom class with existing styles", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker class="my-custom-class" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker required value={undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TimePicker required value={new Time(10, 0, 0)} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when min is violated", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker min={new Time(12, 0, 0)} value={new Time(8, 0, 0)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when min is satisfied", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker min={new Time(8, 0, 0)} value={new Time(12, 0, 0)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when max is violated", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker max={new Time(12, 0, 0)} value={new Time(18, 0, 0)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).not.toBe("");
    });

    it("is valid when max is satisfied", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker max={new Time(23, 59, 59)} value={new Time(12, 0, 0)} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker value={new Time(10, 0, 0)} validate={() => "커스텀 에러"} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TimePicker value={new Time(10, 0, 0)} validate={() => undefined} /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
