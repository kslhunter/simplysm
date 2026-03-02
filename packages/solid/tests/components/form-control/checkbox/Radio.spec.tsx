import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Radio } from "../../../../src/components/form-control/checkbox/Radio";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Radio component", () => {
  describe("basic rendering", () => {
    it("renders with radio role", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio /></I18nProvider></ConfigProvider>);
      expect(getByRole("radio")).toBeTruthy();
    });

    it("renders children as label", () => {
      const { getByText } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio>옵션 A</Radio></I18nProvider></ConfigProvider>);
      expect(getByText("옵션 A")).toBeTruthy();
    });

    it("defaults to unchecked", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio /></I18nProvider></ConfigProvider>);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("click behavior", () => {
    it("selects on click", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio /></I18nProvider></ConfigProvider>);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });

    it("does not deselect when already selected", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio value={true} /></I18nProvider></ConfigProvider>);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });

    it("does not change when disabled", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio disabled /></I18nProvider></ConfigProvider>);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("keyboard behavior", () => {
    it("selects with Space key", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio /></I18nProvider></ConfigProvider>);
      const radio = getByRole("radio");

      fireEvent.keyDown(radio, { key: " " });
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("controlled pattern", () => {
    it("reflects value prop as checked state", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio value={true} /></I18nProvider></ConfigProvider>);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });

    it("calls onValueChange on click", () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio value={false} onValueChange={handleChange} /></I18nProvider></ConfigProvider>);

      fireEvent.click(getByRole("radio"));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("updates when external state changes", () => {
      const [value, setValue] = createSignal(false);
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>);

      expect(getByRole("radio").getAttribute("aria-checked")).toBe("false");

      setValue(true);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("style variants", () => {
    it("indicator is circular", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio /></I18nProvider></ConfigProvider>);
      const indicator = getByRole("radio").querySelector("div") as HTMLElement;
      expect(indicator.classList.contains("rounded-full")).toBe(true);
    });

    it("applies different styles per size", () => {
      const { getByRole: getDefault } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio /></I18nProvider></ConfigProvider>);
      const { getByRole: getSm } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio size="sm" /></I18nProvider></ConfigProvider>);

      expect(getDefault("radio").className).not.toBe(getSm("radio").className);
    });

    it("applies disabled style", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio disabled /></I18nProvider></ConfigProvider>);
      expect(getByRole("radio").classList.contains("opacity-30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio class="my-custom-class" /></I18nProvider></ConfigProvider>);
      expect(getByRole("radio").classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and not selected", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio required value={false} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required selection");
    });

    it("is valid when required and selected", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio required value={true} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio value={true} validate={() => "커스텀 에러"} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio value={true} validate={() => undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
