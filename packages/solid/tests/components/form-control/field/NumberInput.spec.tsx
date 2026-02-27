import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { NumberInput } from "../../../../src/components/form-control/field/NumberInput";

describe("NumberInput", () => {
  describe("basic rendering", () => {
    it("renders input element", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("sets inputmode to numeric", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("inputmode", "numeric");
    });

    it("sets input type to text", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "text");
    });

    it("defaults autocomplete to one-time-code", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("autocomplete", "one-time-code");
    });
  });

  describe("value conversion", () => {
    it("displays numeric value as string", () => {
      render(() => <NumberInput value={12345} />);

      const input = screen.getByRole("textbox");
      // comma is true by default, so commas are included
      expect(input).toHaveValue("12,345");
    });

    it("displays decimal numbers correctly", () => {
      render(() => <NumberInput value={1234.56} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234.56");
    });

    it("works correctly during input", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "123" } });

      expect(handleChange).toHaveBeenCalledWith(123);
    });

    it("preserves trailing decimal point during input", () => {
      const [value, setValue] = createSignal<number | undefined>(undefined);
      render(() => <NumberInput value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");

      // preserve trailing decimal while entering "123."
      fireEvent.input(input, { target: { value: "123." } });

      // value converts to 123, but display must retain "123."
      expect(input).toHaveValue("123.");
    });

    it("ignores invalid input", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput value={100} onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      // attempt to input non-numeric characters
      fireEvent.input(input, { target: { value: "abc" } });

      // invalid input so callback is not called or value is retained
      expect(handleChange).not.toHaveBeenCalled();
    });

    it("converts empty input to undefined", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput value={100} onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "" } });

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });

    it("handles negative numbers correctly", () => {
      const handleChange = vi.fn();
      render(() => <NumberInput onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "-123" } });

      expect(handleChange).toHaveBeenCalledWith(-123);
    });
  });

  describe("display format", () => {
    it("displays thousands comma when comma=true", () => {
      render(() => <NumberInput value={1234567} comma={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234,567");
    });

    it("displays without comma when comma=false", () => {
      render(() => <NumberInput value={1234567} comma={false} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1234567");
    });

    it("defaults comma to true", () => {
      render(() => <NumberInput value={1234567} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,234,567");
    });

    it("sets minimum decimal digits with minDigits", () => {
      render(() => <NumberInput value={100} minDigits={2} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100.00");
    });

    it("displays decimals longer than minDigits as-is", () => {
      render(() => <NumberInput value={100.12345} minDigits={2} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100.12345");
    });
  });

  describe("disabled/readonly state", () => {
    it("renders as div when disabled", () => {
      render(() => <NumberInput value={1234} disabled />);

      // renders as div, not input, when disabled
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      // value is displayed in the div
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("renders as div when readonly", () => {
      render(() => <NumberInput value={5678} readonly />);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("5,678")).toBeInTheDocument();
    });

    it("applies disabled style", () => {
      const { container } = render(() => <NumberInput value={100} disabled />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("bg-base-100");
    });
  });

  describe("right alignment", () => {
    it("aligns input to the right", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("text-right");
    });
  });

  describe("style options", () => {
    it("applies small padding when size='sm'", () => {
      const { container } = render(() => <NumberInput size="sm" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("px-1.5");
    });

    it("applies large padding when size='lg'", () => {
      const { container } = render(() => <NumberInput size="lg" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("px-3");
    });

    it("applies inset style", () => {
      const { container } = render(() => <NumberInput inset />);

      // outer div is relative when inset, inner content div has border-none
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);
      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv.className).toContain("border-none");
    });
  });

  describe("inset dual-element", () => {
    it("shows content div and no input when inset + readonly", () => {
      const { container } = render(() => <NumberInput inset readonly value={1234} />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("1,234");

      expect(outer.querySelector("input:not([aria-hidden])")).toBeFalsy();
    });

    it("shows hidden content div and input when inset + editable", () => {
      const { container } = render(() => <NumberInput inset value={1234} />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
    });

    it("applies right alignment in inset + readonly", () => {
      const { container } = render(() => <NumberInput inset readonly value={100} />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv.classList.contains("justify-end")).toBe(true);
    });

    it("shows NBSP in content div when inset + empty value", () => {
      const { container } = render(() => <NumberInput inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });
  });

  describe("controlled/uncontrolled pattern", () => {
    it("reflects external value changes in controlled mode", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <NumberInput value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(200);
      expect(input).toHaveValue("200");
    });

    it("manages internal state in uncontrolled mode", () => {
      render(() => <NumberInput />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "500" } });

      expect(input).toHaveValue("500");
    });
  });

  describe("placeholder", () => {
    it("displays placeholder", () => {
      render(() => <NumberInput placeholder="숫자를 입력하세요" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "숫자를 입력하세요");
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <NumberInput required value={undefined} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This field is required");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <NumberInput required value={42} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when min is violated", () => {
      const { container } = render(() => <NumberInput min={10} value={5} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Minimum value is 10");
    });

    it("sets error message when max is violated", () => {
      const { container } = render(() => <NumberInput max={100} value={150} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Maximum value is 100");
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <NumberInput
          validate={(v) => (v !== undefined && v % 2 === 0 ? undefined : "짝수만 입력하세요")}
          value={3}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("짝수만 입력하세요");
    });
  });

  describe("Prefix slot", () => {
    it("renders NumberInput.Prefix slot", () => {
      render(() => (
        <NumberInput>
          <NumberInput.Prefix>
            <span data-testid="prefix">₩</span>
          </NumberInput.Prefix>
        </NumberInput>
      ));

      expect(document.querySelector('[data-testid="prefix"]')).not.toBeNull();
    });

    it("applies gap class when Prefix slot is used", () => {
      const { container } = render(() => (
        <NumberInput>
          <NumberInput.Prefix>
            <span>₩</span>
          </NumberInput.Prefix>
        </NumberInput>
      ));

      const wrapper = container.querySelector("[data-number-field]") as HTMLElement;
      expect(wrapper.className).toContain("gap-");
    });

    it("does not apply gap class without Prefix slot", () => {
      const { container } = render(() => <NumberInput />);

      const wrapper = container.querySelector("[data-number-field]") as HTMLElement;
      expect(wrapper.className).not.toContain("gap-");
    });

    it("renders Prefix slot when disabled", () => {
      render(() => (
        <NumberInput disabled value={100}>
          <NumberInput.Prefix>
            <span data-testid="prefix">₩</span>
          </NumberInput.Prefix>
        </NumberInput>
      ));

      expect(document.querySelector('[data-testid="prefix"]')).not.toBeNull();
    });

    it("renders Prefix slot in inset mode", () => {
      render(() => (
        <NumberInput inset value={100}>
          <NumberInput.Prefix>
            <span data-testid="prefix">₩</span>
          </NumberInput.Prefix>
        </NumberInput>
      ));

      expect(document.querySelector('[data-testid="prefix"]')).not.toBeNull();
    });
  });
});
