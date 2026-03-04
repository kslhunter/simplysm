import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { NumberInput } from "../../../../src/components/form-control/field/NumberInput";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("NumberInput", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  describe("value conversion", () => {
    it("displays numeric value as string", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={12345} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      // comma is true by default, so commas are included
      expect(input).toHaveValue("12,345");
    });

    it("displays decimal numbers correctly", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={1234.56} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234.56");
    });

    it("works correctly during input", () => {
      const handleChange = vi.fn();
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput onValueChange={handleChange} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "123" } });

      expect(handleChange).toHaveBeenCalledWith(123);
    });

    it("preserves trailing decimal point during input", () => {
      const [value, setValue] = createSignal<number | undefined>(undefined);
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");

      // preserve trailing decimal while entering "123."
      fireEvent.input(input, { target: { value: "123." } });

      // value converts to 123, but display must retain "123."
      expect(input).toHaveValue("123.");
    });

    it("ignores invalid input", () => {
      const handleChange = vi.fn();
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={100} onValueChange={handleChange} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      // attempt to input non-numeric characters
      fireEvent.input(input, { target: { value: "abc" } });

      // invalid input so callback is not called or value is retained
      expect(handleChange).not.toHaveBeenCalled();
    });

    it("converts empty input to undefined", () => {
      const handleChange = vi.fn();
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={100} onValueChange={handleChange} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });

    it("handles negative numbers correctly", () => {
      const handleChange = vi.fn();
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput onValueChange={handleChange} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "-123" } });

      expect(handleChange).toHaveBeenCalledWith(-123);
    });
  });

  describe("display format", () => {
    it("displays thousands comma when comma=true", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={1234567} comma={true} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234,567");
    });

    it("displays without comma when comma=false", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={1234567} comma={false} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1234567");
    });

    it("defaults comma to true", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={1234567} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234,567");
    });

    it("sets minimum decimal digits with minDigits", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={100} minDigits={2} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100.00");
    });

    it("displays decimals longer than minDigits as-is", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={100.12345} minDigits={2} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100.12345");
    });
  });

  describe("disabled/readonly state", () => {
    it("renders as div when disabled", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={1234} disabled /></I18nProvider></ConfigProvider>);

      // renders as div, not input, when disabled
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      // value is displayed in the div
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("renders as div when readonly", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={5678} readonly /></I18nProvider></ConfigProvider>);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("5,678")).toBeInTheDocument();
    });

  });

  describe("inset dual-element", () => {
    it("shows content div and no input when inset + readonly", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput inset readonly value={1234} /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("1,234");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("shows hidden content div and input when inset + editable", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput inset value={1234} /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput inset readonly /></I18nProvider></ConfigProvider>);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("controlled/uncontrolled pattern", () => {
    it("reflects external value changes in controlled mode", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(200);
      expect(input).toHaveValue("200");
    });

    it("manages internal state in uncontrolled mode", () => {
      render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput /></I18nProvider></ConfigProvider>);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "500" } });

      expect(input).toHaveValue("500");
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput required value={undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput required value={42} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when min is violated", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput min={10} value={5} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Minimum value is 10");
    });

    it("sets error message when max is violated", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><NumberInput max={100} value={150} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Maximum value is 100");
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider><NumberInput
          validate={(v) => (v !== undefined && v % 2 === 0 ? undefined : "짝수만 입력하세요")}
          value={3}
        /></I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("짝수만 입력하세요");
    });
  });

  describe("Prefix slot", () => {
    it("renders Prefix slot when disabled", () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider><NumberInput disabled value={100}>
          <NumberInput.Prefix>
            <span data-testid="prefix">₩</span>
          </NumberInput.Prefix>
        </NumberInput></I18nProvider></ConfigProvider>
      ));

      expect(document.querySelector('[data-testid="prefix"]')).not.toBeNull();
    });

    it("renders Prefix slot in inset mode", () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider><NumberInput inset value={100}>
          <NumberInput.Prefix>
            <span data-testid="prefix">₩</span>
          </NumberInput.Prefix>
        </NumberInput></I18nProvider></ConfigProvider>
      ));

      expect(document.querySelector('[data-testid="prefix"]')).not.toBeNull();
    });
  });
});
