import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { Checkbox } from "../../../../src/components/form-control/checkbox/Checkbox";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Checkbox component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });
  describe("basic rendering", () => {
    it("renders with checkbox role", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox /></I18nProvider></ConfigProvider>);
      expect(getByRole("checkbox")).toBeTruthy();
    });

    it("renders children as label", () => {
      const { getByText } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox>동의합니다</Checkbox></I18nProvider></ConfigProvider>);
      expect(getByText("동의합니다")).toBeTruthy();
    });

    it("defaults to unchecked", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox /></I18nProvider></ConfigProvider>);
      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("click behavior", () => {
    it("toggles checked state on click", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox /></I18nProvider></ConfigProvider>);
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);
      expect(checkbox.getAttribute("aria-checked")).toBe("true");

      fireEvent.click(checkbox);
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });

    it("does not change when disabled", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox disabled /></I18nProvider></ConfigProvider>);
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("keyboard behavior", () => {
    it("toggles with Space key", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox /></I18nProvider></ConfigProvider>);
      const checkbox = getByRole("checkbox");

      fireEvent.keyDown(checkbox, { key: " " });
      expect(checkbox.getAttribute("aria-checked")).toBe("true");

      fireEvent.keyDown(checkbox, { key: " " });
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("controlled pattern", () => {
    it("reflects value prop as checked state", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox value={true} /></I18nProvider></ConfigProvider>);
      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
    });

    it("calls onValueChange on click", () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox value={false} onValueChange={handleChange} /></I18nProvider></ConfigProvider>);

      fireEvent.click(getByRole("checkbox"));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("updates when external state changes", () => {
      const [value, setValue] = createSignal(false);
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox value={value()} onValueChange={setValue} /></I18nProvider></ConfigProvider>);

      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("false");

      setValue(true);
      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("style variants", () => {
    it("applies different styles per size", () => {
      const { getByRole: getDefault } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox /></I18nProvider></ConfigProvider>);
      const { getByRole: getSm } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox size="sm" /></I18nProvider></ConfigProvider>);

      expect(getDefault("checkbox").className).not.toBe(getSm("checkbox").className);
    });

    it("applies different styles when inset", () => {
      const { getByRole: getDefault } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox /></I18nProvider></ConfigProvider>);
      const { getByRole: getInset } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox inset /></I18nProvider></ConfigProvider>);

      expect(getDefault("checkbox").className).not.toBe(getInset("checkbox").className);
    });

    it("applies disabled style", () => {
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox disabled /></I18nProvider></ConfigProvider>);
      expect(getByRole("checkbox").classList.contains("opacity-30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { getByRole } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox class="my-custom-class" /></I18nProvider></ConfigProvider>);
      expect(getByRole("checkbox").classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and unchecked", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox required value={false} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required selection");
    });

    it("is valid when required and checked", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox required value={true} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox value={true} validate={() => "커스텀 에러"} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => <ConfigProvider clientName="test"><I18nProvider><Checkbox value={true} validate={() => undefined} /></I18nProvider></ConfigProvider>);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
