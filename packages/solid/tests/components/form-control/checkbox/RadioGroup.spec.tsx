import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { RadioGroup } from "../../../../src/components/form-control/checkbox/RadioGroup";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("RadioGroup component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });
  describe("basic rendering", () => {
    it("renders the container", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup>
            <RadioGroup.Item value="a">A</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      expect(container.querySelector("div")).toBeTruthy();
    });

    it("renders items as radios", () => {
      const { getAllByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup>
            <RadioGroup.Item value="a">A</RadioGroup.Item>
            <RadioGroup.Item value="b">B</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      expect(getAllByRole("radio").length).toBe(2);
    });
  });

  describe("controlled pattern", () => {
    it("reflects value prop as selected state", () => {
      const { getAllByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup value="a">
            <RadioGroup.Item value="a">A</RadioGroup.Item>
            <RadioGroup.Item value="b">B</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      const radios = getAllByRole("radio");
      expect(radios[0].getAttribute("aria-checked")).toBe("true");
      expect(radios[1].getAttribute("aria-checked")).toBe("false");
    });

    it("calls onValueChange on selection", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup value={undefined} onValueChange={handleChange}>
            <RadioGroup.Item value="a">A</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      fireEvent.click(getAllByRole("radio")[0]);
      expect(handleChange).toHaveBeenCalledWith("a");
    });

    it("updates when external state changes", () => {
      const [value, setValue] = createSignal<string | undefined>(undefined);
      const { getAllByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup value={value()} onValueChange={setValue}>
            <RadioGroup.Item value="a">A</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      expect(getAllByRole("radio")[0].getAttribute("aria-checked")).toBe("false");
      setValue("a");
      expect(getAllByRole("radio")[0].getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("validation", () => {
    // The group's hidden input is positioned after the children's hidden inputs
    const getGroupHiddenInput = (container: HTMLElement) => {
      const inputs = container.querySelectorAll("input[aria-hidden='true']");
      return inputs[inputs.length - 1] as HTMLInputElement;
    };

    it("sets error message when required and no item selected", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup required value={undefined}>
            <RadioGroup.Item value="a">A</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("Please select an item");
    });

    it("is valid when required and item is selected", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup required value="a">
            <RadioGroup.Item value="a">A</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup value="a" validate={() => "커스텀 에러"}>
            <RadioGroup.Item value="a">A</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <RadioGroup value="a" validate={() => undefined}>
            <RadioGroup.Item value="a">A</RadioGroup.Item>
          </RadioGroup>
        </I18nProvider></ConfigProvider>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });
  });
});
