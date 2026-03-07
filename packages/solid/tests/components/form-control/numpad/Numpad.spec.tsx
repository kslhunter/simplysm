import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Numpad } from "../../../../src/components/form-control/numpad/Numpad";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Numpad", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  describe("basic rendering", () => {
    it("does not render ENT button by default", () => {
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad />
          </I18nProvider>
        </ConfigProvider>
      ));
      expect(screen.queryByText("ENT")).not.toBeInTheDocument();
    });

    it("does not render minus button by default", () => {
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad />
          </I18nProvider>
        </ConfigProvider>
      ));
      // without withMinusButton, there should be no button with "-" text
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-");
      expect(minusButton).toBeFalsy();
    });
  });

  describe("digit input", () => {
    it("updates value on digit button click", () => {
      const handleChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));

      expect(handleChange).toHaveBeenLastCalledWith(123);
    });

    it("appends decimal point on decimal button click", () => {
      const handleChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText("5"));

      expect(handleChange).toHaveBeenLastCalledWith(1.5);
    });

    it("ignores duplicate decimal point", () => {
      const handleChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText(".")); // duplicate decimal
      fireEvent.click(screen.getByText("5"));

      expect(handleChange).toHaveBeenLastCalledWith(1.5);
    });

    it("allows clicking 0 multiple times", () => {
      const handleChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("0"));
      fireEvent.click(screen.getByText("0"));

      expect(handleChange).toHaveBeenLastCalledWith(100);
    });
  });

  describe("function buttons", () => {
    it("clears value on C button click", () => {
      const handleChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

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
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

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
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

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
    it("renders ENT button when withEnterButton=true", () => {
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad withEnterButton />
          </I18nProvider>
        </ConfigProvider>
      ));
      expect(screen.getByText("ENT")).toBeInTheDocument();
    });

    it("calls onEnterButtonClick on ENT button click", () => {
      const handleEnter = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad withEnterButton onEnterButtonClick={handleEnter} />
          </I18nProvider>
        </ConfigProvider>
      ));

      fireEvent.click(screen.getByText("ENT"));
      expect(handleEnter).toHaveBeenCalledTimes(1);
    });

    it("disables ENT button when required and no value", () => {
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad withEnterButton required />
          </I18nProvider>
        </ConfigProvider>
      ));

      const entButton = screen.getByText("ENT").closest("button")!;
      expect(entButton.disabled).toBe(true);
    });

    it("enables ENT button when required and value exists", () => {
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad withEnterButton required value={123} />
          </I18nProvider>
        </ConfigProvider>
      ));

      const entButton = screen.getByText("ENT").closest("button")!;
      expect(entButton.disabled).toBe(false);
    });
  });

  describe("minus button", () => {
    it("renders minus button when withMinusButton=true", () => {
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad withMinusButton />
          </I18nProvider>
        </ConfigProvider>
      ));

      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-");
      expect(minusButton).toBeTruthy();
    });

    it("toggles sign on minus button click (positive to negative)", () => {
      const handleChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad withMinusButton onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

      // enter 5
      fireEvent.click(screen.getByText("5"));

      // click minus button
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-")!;
      fireEvent.click(minusButton);

      expect(handleChange).toHaveBeenLastCalledWith(-5);
    });

    it("toggles sign on minus button click (negative to positive)", () => {
      const handleChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad withMinusButton value={-5} onValueChange={handleChange} />
          </I18nProvider>
        </ConfigProvider>
      ));

      // click minus button
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-")!;
      fireEvent.click(minusButton);

      expect(handleChange).toHaveBeenLastCalledWith(5);
    });
  });

  describe("controlled mode", () => {
    it("reflects external value changes", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad value={value()} onValueChange={setValue} />
          </I18nProvider>
        </ConfigProvider>
      ));

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(200);
      expect(input).toHaveValue("200");
    });

    it("clears input when set to undefined externally", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Numpad value={value()} onValueChange={setValue} />
          </I18nProvider>
        </ConfigProvider>
      ));

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(undefined);
      expect(input).toHaveValue("");
    });
  });
});
