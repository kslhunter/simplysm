import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { TextInput } from "../../../../src/components/form-control/field/TextInput";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("TextInput component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  describe("controlled pattern", () => {
    it("calls onValueChange on input", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput value="" onValueChange={handleChange} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "Test" } });

      expect(handleChange).toHaveBeenCalledWith("Test");
    });

    it("updates input value when external state changes", () => {
      const [value, setValue] = createSignal("Initial");
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("Initial");

      setValue("Updated");
      expect(input.value).toBe("Updated");
    });
  });

  describe("uncontrolled pattern", () => {
    it("manages value internally without onValueChange", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput value="Initial" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("Initial");

      fireEvent.input(input, { target: { value: "Changed" } });
      expect(input.value).toBe("Changed");
    });
  });

  describe("disabled state", () => {
    it("renders as div when disabled=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput disabled value="Disabled text" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-text-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when disabled", () => {
      const { getByText } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput disabled value="Disabled text" /></I18nProvider></ConfigProvider>);
      expect(getByText("Disabled text")).toBeTruthy();
    });
  });

  describe("readonly state", () => {
    it("renders as div when readonly=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput readonly value="Readonly text" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input:not([aria-hidden])");
      const div = container.querySelector("div.sd-text-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput readonly value="Readonly text" /></I18nProvider></ConfigProvider>);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("format option", () => {
    it("displays value with format applied", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput format="XXX-XXXX-XXXX" value="01012345678" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("010-1234-5678");
    });

    it("passes raw value to onValueChange when format is applied", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TextInput format="XXX-XXXX-XXXX" value="" onValueChange={handleChange} /></I18nProvider></ConfigProvider>
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "010-1234-5678" } });

      // raw value with format characters ('-') stripped is passed
      expect(handleChange).toHaveBeenCalledWith("01012345678");
    });
  });

  describe("inset style", () => {
    it("shows content div and no input when inset + readonly", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput inset readonly value="Hello" /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("Hello");

      const input = outer.querySelector("input:not([aria-hidden])");
      expect(input).toBeFalsy();
    });

    it("shows hidden content div and input when inset + editable", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput inset value="Hello" /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe("Hello");
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput inset readonly /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });

    it("content div is always in DOM when toggling inset + readonly/editable", () => {
      const [readonly, setReadonly] = createSignal(true);
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput inset readonly={readonly()} value="Test" /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;

      let contentDiv = outer.querySelector("[data-text-field-content]");
      expect(contentDiv).toBeTruthy();
      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();

      setReadonly(false);
      contentDiv = outer.querySelector("[data-text-field-content]");
      expect(contentDiv).toBeTruthy();
      expect(outer.querySelector("input")).toBeTruthy();
    });
  });

  describe("validation", () => {
    it("sets error message in hidden input when required and empty", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput required value="" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput required value="hello" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when minLength is violated", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput minLength={3} value="ab" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Enter at least 3 characters");
    });

    it("sets error message when maxLength is violated", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput maxLength={5} value="abcdef" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Enter up to 5 characters");
    });

    it("sets error message when pattern is violated", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><TextInput pattern="^[0-9]+$" value="abc" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("The input format is invalid");
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TextInput
          validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
          value="hello"
        /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("이메일 형식이 아닙니다");
    });

    it("runs validate function after base validators pass", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><TextInput
          required
          validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
          value=""
        /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });
  });
});
