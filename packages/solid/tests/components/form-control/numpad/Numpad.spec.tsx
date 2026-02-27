import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Numpad } from "../../../../src/components/form-control/numpad/Numpad";

describe("Numpad", () => {
  describe("basic rendering", () => {
    it("renders root element with data-numpad attribute", () => {
      const { container } = render(() => <Numpad />);
      const root = container.querySelector("[data-numpad]");
      expect(root).toBeTruthy();
    });

    it("renders digit buttons 0-9", () => {
      render(() => <Numpad />);

      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
    });

    it("renders decimal point button", () => {
      render(() => <Numpad />);
      expect(screen.getByText(".")).toBeInTheDocument();
    });

    it("renders NumberInput (input)", () => {
      render(() => <Numpad />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("renders C button with text-danger-500 class", () => {
      render(() => <Numpad />);
      const cButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-danger-500"));
      expect(cButton).toBeTruthy();
    });

    it("renders BS button with text-warning-500 class", () => {
      render(() => <Numpad />);
      const bsButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-warning-500"));
      expect(bsButton).toBeTruthy();
    });

    it("does not render ENT button by default", () => {
      render(() => <Numpad />);
      expect(screen.queryByText("ENT")).not.toBeInTheDocument();
    });

    it("does not render minus button by default", () => {
      render(() => <Numpad />);
      // without useMinusButton, there should be no button with "-" text
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-");
      expect(minusButton).toBeFalsy();
    });
  });

  describe("digit input", () => {
    it("updates value on digit button click", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));

      expect(handleChange).toHaveBeenLastCalledWith(123);
    });

    it("appends decimal point on decimal button click", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText("5"));

      expect(handleChange).toHaveBeenLastCalledWith(1.5);
    });

    it("ignores duplicate decimal point", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText(".")); // duplicate decimal
      fireEvent.click(screen.getByText("5"));

      expect(handleChange).toHaveBeenLastCalledWith(1.5);
    });

    it("allows clicking 0 multiple times", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("0"));
      fireEvent.click(screen.getByText("0"));

      expect(handleChange).toHaveBeenLastCalledWith(100);
    });
  });

  describe("function buttons", () => {
    it("clears value on C button click", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      // enter value
      fireEvent.click(screen.getByText("5"));
      fireEvent.click(screen.getByText("6"));

      // click C button
      const cButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-danger-500"))!;
      fireEvent.click(cButton);

      expect(handleChange).toHaveBeenLastCalledWith(undefined);
    });

    it("removes last character on BS button click", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      // enter 123
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));

      // click BS button
      const bsButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-warning-500"))!;
      fireEvent.click(bsButton);

      expect(handleChange).toHaveBeenLastCalledWith(12);
    });

    it("returns undefined when all characters are removed with BS", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      // enter 1
      fireEvent.click(screen.getByText("1"));

      // click BS button
      const bsButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-warning-500"))!;
      fireEvent.click(bsButton);

      expect(handleChange).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe("ENT button", () => {
    it("renders ENT button when useEnterButton=true", () => {
      render(() => <Numpad useEnterButton />);
      expect(screen.getByText("ENT")).toBeInTheDocument();
    });

    it("calls onEnterButtonClick on ENT button click", () => {
      const handleEnter = vi.fn();
      render(() => <Numpad useEnterButton onEnterButtonClick={handleEnter} />);

      fireEvent.click(screen.getByText("ENT"));
      expect(handleEnter).toHaveBeenCalledTimes(1);
    });

    it("disables ENT button when required and no value", () => {
      render(() => <Numpad useEnterButton required />);

      const entButton = screen.getByText("ENT").closest("button")!;
      expect(entButton.disabled).toBe(true);
    });

    it("enables ENT button when required and value exists", () => {
      render(() => <Numpad useEnterButton required value={123} />);

      const entButton = screen.getByText("ENT").closest("button")!;
      expect(entButton.disabled).toBe(false);
    });
  });

  describe("minus button", () => {
    it("renders minus button when useMinusButton=true", () => {
      render(() => <Numpad useMinusButton />);

      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-");
      expect(minusButton).toBeTruthy();
    });

    it("toggles sign on minus button click (positive to negative)", () => {
      const handleChange = vi.fn();
      render(() => <Numpad useMinusButton onValueChange={handleChange} />);

      // enter 5
      fireEvent.click(screen.getByText("5"));

      // click minus button
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-")!;
      fireEvent.click(minusButton);

      expect(handleChange).toHaveBeenLastCalledWith(-5);
    });

    it("toggles sign on minus button click (negative to positive)", () => {
      const handleChange = vi.fn();
      render(() => <Numpad useMinusButton value={-5} onValueChange={handleChange} />);

      // click minus button
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-")!;
      fireEvent.click(minusButton);

      expect(handleChange).toHaveBeenLastCalledWith(5);
    });
  });

  describe("controlled mode", () => {
    it("reflects external value changes", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <Numpad value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(200);
      expect(input).toHaveValue("200");
    });

    it("clears input when set to undefined externally", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <Numpad value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(undefined);
      expect(input).toHaveValue("");
    });
  });
});
