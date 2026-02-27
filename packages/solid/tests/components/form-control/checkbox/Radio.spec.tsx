import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Radio } from "../../../../src/components/form-control/checkbox/Radio";

describe("Radio component", () => {
  describe("basic rendering", () => {
    it("renders with radio role", () => {
      const { getByRole } = render(() => <Radio />);
      expect(getByRole("radio")).toBeTruthy();
    });

    it("renders children as label", () => {
      const { getByText } = render(() => <Radio>옵션 A</Radio>);
      expect(getByText("옵션 A")).toBeTruthy();
    });

    it("defaults to unchecked", () => {
      const { getByRole } = render(() => <Radio />);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("click behavior", () => {
    it("selects on click", () => {
      const { getByRole } = render(() => <Radio />);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });

    it("does not deselect when already selected", () => {
      const { getByRole } = render(() => <Radio value={true} />);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });

    it("does not change when disabled", () => {
      const { getByRole } = render(() => <Radio disabled />);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("keyboard behavior", () => {
    it("selects with Space key", () => {
      const { getByRole } = render(() => <Radio />);
      const radio = getByRole("radio");

      fireEvent.keyDown(radio, { key: " " });
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("controlled pattern", () => {
    it("reflects value prop as checked state", () => {
      const { getByRole } = render(() => <Radio value={true} />);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });

    it("calls onValueChange on click", () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => <Radio value={false} onValueChange={handleChange} />);

      fireEvent.click(getByRole("radio"));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("updates when external state changes", () => {
      const [value, setValue] = createSignal(false);
      const { getByRole } = render(() => <Radio value={value()} onValueChange={setValue} />);

      expect(getByRole("radio").getAttribute("aria-checked")).toBe("false");

      setValue(true);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("style variants", () => {
    it("indicator is circular", () => {
      const { getByRole } = render(() => <Radio />);
      const indicator = getByRole("radio").querySelector("div") as HTMLElement;
      expect(indicator.classList.contains("rounded-full")).toBe(true);
    });

    it("applies different styles per size", () => {
      const { getByRole: getDefault } = render(() => <Radio />);
      const { getByRole: getSm } = render(() => <Radio size="sm" />);

      expect(getDefault("radio").className).not.toBe(getSm("radio").className);
    });

    it("applies disabled style", () => {
      const { getByRole } = render(() => <Radio disabled />);
      expect(getByRole("radio").classList.contains("opacity-30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { getByRole } = render(() => <Radio class="my-custom-class" />);
      expect(getByRole("radio").classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and not selected", () => {
      const { container } = render(() => <Radio required value={false} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required selection");
    });

    it("is valid when required and selected", () => {
      const { container } = render(() => <Radio required value={true} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => <Radio value={true} validate={() => "커스텀 에러"} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => <Radio value={true} validate={() => undefined} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
