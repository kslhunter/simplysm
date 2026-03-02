import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { ColorPicker } from "../../../../src/components/form-control/color-picker/ColorPicker";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("ColorPicker component", () => {
  describe("basic rendering", () => {
    it("renders input type=color", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("color");
    });

    it("defaults to #000000", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("#000000");
    });
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

    it("applies disabled style", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker disabled /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.classList.contains("cursor-default")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker class="my-custom-class" /></I18nProvider></ConfigProvider>);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><ColorPicker required value={undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This field is required");
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
