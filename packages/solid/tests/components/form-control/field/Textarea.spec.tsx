import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Textarea } from "../../../../src/components/form-control/field/Textarea";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Textarea component", () => {
  describe("basic rendering", () => {
    it("renders textarea element", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeTruthy();
    });

    it("applies placeholder to textarea", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea placeholder="내용을 입력하세요" /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe("내용을 입력하세요");
    });

    it("applies title to textarea", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea title="Textarea title" /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.title).toBe("Textarea title");
    });
  });

  describe("controlled pattern", () => {
    it("displays value prop in textarea", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea value="Hello" /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Hello");
    });

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

    it("applies disabled style", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea disabled value="Text" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly state", () => {
    it("does not render textarea when readonly=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea readonly value="Readonly text" /></I18nProvider></ConfigProvider>);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea readonly value="Readonly text" /></I18nProvider></ConfigProvider>);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("size option", () => {
    it("applies small padding when size=sm", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea size="sm" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("applies large padding when size=lg", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea size="lg" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset style", () => {
    it("removes border and applies inset background when inset=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea inset /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("relative")).toBe(true);
      const content = wrapper.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(content.classList.contains("border-none")).toBe(true);
      expect(content.classList.contains("bg-primary-50")).toBe(true);
    });

    it("shows content div and no textarea when inset + readonly", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea inset readonly value="Hello" /></I18nProvider></ConfigProvider>);
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
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea inset readonly /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toContain("\u00A0");
    });
  });

  describe("class merging", () => {
    it("merges custom class with existing styles", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Textarea class="my-custom-class" /></I18nProvider></ConfigProvider>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
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
