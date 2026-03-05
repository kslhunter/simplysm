import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { Textarea } from "../../../../src/components/form-control/field/Textarea";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Textarea component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  describe("controlled pattern", () => {
    it("calls onValueChange on input", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea value="" onValueChange={handleChange} /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      fireEvent.input(textarea, { target: { value: "Test" } });

      expect(handleChange).toHaveBeenCalledWith("Test");
    });

    it("updates textarea value when external state changes", () => {
      const [value, setValue] = createSignal("Initial");
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      setValue("Updated");
      expect(textarea.value).toBe("Updated");
    });
  });

  describe("uncontrolled pattern", () => {
    it("manages value internally without onValueChange", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea value="Initial" /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      fireEvent.input(textarea, { target: { value: "Changed" } });
      expect(textarea.value).toBe("Changed");
    });
  });

  describe("disabled state", () => {
    it("does not render textarea when disabled=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea disabled value="Disabled text" /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("displays value when disabled", () => {
      const { getByText } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea disabled value="Disabled text" /></I18nProvider></ConfigProvider>);
      expect(getByText("Disabled text")).toBeTruthy();
    });
  });

  describe("readonly state", () => {
    it("does not render textarea when readonly=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea readOnly value="Readonly text" /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea readOnly value="Readonly text" /></I18nProvider></ConfigProvider>);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("inset style", () => {
    it("shows content div and no textarea when inset + readonly", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea inset readOnly value="Hello" /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toContain("Hello");

      expect(outer.querySelector("textarea")).toBeFalsy();
    });

    it("shows hidden content div and textarea when inset + editable", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea inset value="Hello" /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const textarea = outer.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe("Hello");
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea inset readOnly /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toContain("\u00A0");
    });
  });

  describe("auto height adjustment", () => {
    it("renders hidden div for height measurement", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea value="Test" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      const hiddenDiv = wrapper.querySelector("[data-hidden-content]") as HTMLElement;
      expect(hiddenDiv).toBeTruthy();
      expect(hiddenDiv.style.visibility).toBe("hidden");
    });
  });

  describe("validation", () => {
    it("sets error message in hidden input when required and empty", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea required value="" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea required value="hello" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when minLength is violated", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea minLength={3} value="ab" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Enter at least 3 characters");
    });

    it("sets error message when maxLength is violated", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea maxLength={5} value="abcdef" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Enter up to 5 characters");
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><Textarea
          validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
          value="hello"
        /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("이메일 형식이 아닙니다");
    });

    it("runs validate function after base validators pass", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><Textarea
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
