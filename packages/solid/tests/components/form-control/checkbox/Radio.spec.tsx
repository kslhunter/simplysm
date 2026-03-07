import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { Radio } from "../../../../src/components/form-control/checkbox/Radio";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Radio component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });
  describe("click behavior", () => {
    it("selects on click", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio /></I18nProvider></ConfigProvider>);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });

    it("does not deselect when already selected", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio checked={true} /></I18nProvider></ConfigProvider>);
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
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio checked={true} /></I18nProvider></ConfigProvider>);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });

    it("calls onCheckedChange on click", () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio checked={false} onCheckedChange={handleChange} /></I18nProvider></ConfigProvider>);

      fireEvent.click(getByRole("radio"));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("updates when external state changes", () => {
      const [value, setValue] = createSignal(false);
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio checked={value()} onCheckedChange={setValue} /></I18nProvider></ConfigProvider>);

      expect(getByRole("radio").getAttribute("aria-checked")).toBe("false");

      setValue(true);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("validation", () => {
    it("sets error message when required and not selected", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio required checked={false} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required selection");
    });

    it("is valid when required and selected", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio required checked={true} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio checked={true} validate={() => "커스텀 에러"} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Radio checked={true} validate={() => undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
