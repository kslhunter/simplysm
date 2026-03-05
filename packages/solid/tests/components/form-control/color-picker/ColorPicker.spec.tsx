import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { ColorPicker } from "../../../../src/components/form-control/color-picker/ColorPicker";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("ColorPicker component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });
  describe("controlled pattern", () => {
    it("calls onValueChange on color change", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <ColorPicker value="#000000" onValueChange={handleChange} />
        </I18nProvider></ConfigProvider>
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "#ff5500" } });

      expect(handleChange).toHaveBeenCalledWith("#ff5500");
    });

    it("updates input value when external state changes", () => {
      const [value, setValue] = createSignal("#ff0000");
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("#ff0000");

      setValue("#00ff00");
      expect(input.value).toBe("#00ff00");
    });
  });

  describe("disabled state", () => {
    it("disables input when disabled=true", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker disabled /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker required value={undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker required value="#ff0000" /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <ColorPicker
            validate={(v) => (v === "#000000" ? "검정색은 사용할 수 없습니다" : undefined)}
            value="#000000"
          />
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("검정색은 사용할 수 없습니다");
    });
  });
});
