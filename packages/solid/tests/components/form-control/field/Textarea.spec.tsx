import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Textarea } from "../../../../src/components/form-control/field/Textarea";

describe("Textarea component", () => {
  describe("basic rendering", () => {
    it("renders textarea element", () => {
      const { container } = render(() => <Textarea />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeTruthy();
    });

    it("applies placeholder to textarea", () => {
      const { container } = render(() => <Textarea placeholder="내용을 입력하세요" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe("내용을 입력하세요");
    });

    it("applies title to textarea", () => {
      const { container } = render(() => <Textarea title="Textarea title" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.title).toBe("Textarea title");
    });
  });

  describe("controlled pattern", () => {
    it("displays value prop in textarea", () => {
      const { container } = render(() => <Textarea value="Hello" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Hello");
    });

    it("calls onValueChange on input", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <Textarea value="" onValueChange={handleChange} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      fireEvent.input(textarea, { target: { value: "Test" } });

      expect(handleChange).toHaveBeenCalledWith("Test");
    });

    it("updates textarea value when external state changes", () => {
      const [value, setValue] = createSignal("Initial");
      const { container } = render(() => <Textarea value={value()} onValueChange={setValue} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      setValue("Updated");
      expect(textarea.value).toBe("Updated");
    });
  });

  describe("uncontrolled pattern", () => {
    it("manages value internally without onValueChange", () => {
      const { container } = render(() => <Textarea value="Initial" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      fireEvent.input(textarea, { target: { value: "Changed" } });
      expect(textarea.value).toBe("Changed");
    });
  });

  describe("disabled state", () => {
    it("does not render textarea when disabled=true", () => {
      const { container } = render(() => <Textarea disabled value="Disabled text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("displays value when disabled", () => {
      const { getByText } = render(() => <Textarea disabled value="Disabled text" />);
      expect(getByText("Disabled text")).toBeTruthy();
    });

    it("applies disabled style", () => {
      const { container } = render(() => <Textarea disabled value="Text" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly state", () => {
    it("does not render textarea when readonly=true", () => {
      const { container } = render(() => <Textarea readonly value="Readonly text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("displays value when readonly", () => {
      const { getByText } = render(() => <Textarea readonly value="Readonly text" />);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("size option", () => {
    it("applies small padding when size=sm", () => {
      const { container } = render(() => <Textarea size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("applies large padding when size=lg", () => {
      const { container } = render(() => <Textarea size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset style", () => {
    it("removes border and applies inset background when inset=true", () => {
      const { container } = render(() => <Textarea inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("relative")).toBe(true);
      const content = wrapper.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(content.classList.contains("border-none")).toBe(true);
      expect(content.classList.contains("bg-primary-50")).toBe(true);
    });

    it("shows content div and no textarea when inset + readonly", () => {
      const { container } = render(() => <Textarea inset readonly value="Hello" />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toContain("Hello");

      expect(outer.querySelector("textarea")).toBeFalsy();
    });

    it("shows hidden content div and textarea when inset + editable", () => {
      const { container } = render(() => <Textarea inset value="Hello" />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const textarea = outer.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe("Hello");
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <Textarea inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toContain("\u00A0");
    });
  });

  describe("class merging", () => {
    it("merges custom class with existing styles", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Textarea class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("auto height adjustment", () => {
    it("renders hidden div for height measurement", () => {
      const { container } = render(() => <Textarea value="Test" />);
      const wrapper = container.firstChild as HTMLElement;
      const hiddenDiv = wrapper.querySelector("[data-hidden-content]") as HTMLElement;
      expect(hiddenDiv).toBeTruthy();
      expect(hiddenDiv.style.visibility).toBe("hidden");
    });
  });

  describe("validation", () => {
    it("sets error message in hidden input when required and empty", () => {
      const { container } = render(() => <Textarea required value="" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <Textarea required value="hello" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when minLength is violated", () => {
      const { container } = render(() => <Textarea minLength={3} value="ab" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Enter at least 3 characters");
    });

    it("sets error message when maxLength is violated", () => {
      const { container } = render(() => <Textarea maxLength={5} value="abcdef" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Enter up to 5 characters");
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <Textarea
          validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
          value="hello"
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("이메일 형식이 아닙니다");
    });

    it("runs validate function after base validators pass", () => {
      const { container } = render(() => (
        <Textarea
          required
          validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
          value=""
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });
  });
});
