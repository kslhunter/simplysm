import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { CheckboxGroup } from "../../../../src/components/form-control/checkbox/CheckboxGroup";

describe("CheckboxGroup component", () => {
  describe("basic rendering", () => {
    it("renders the container", () => {
      const { container } = render(() => (
        <CheckboxGroup>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(container.querySelector("div")).toBeTruthy();
    });

    it("renders items as checkboxes", () => {
      const { getAllByRole } = render(() => (
        <CheckboxGroup>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
          <CheckboxGroup.Item value="b">B</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getAllByRole("checkbox").length).toBe(2);
    });
  });

  describe("controlled pattern", () => {
    it("reflects value prop as selected state", () => {
      const { getAllByRole } = render(() => (
        <CheckboxGroup value={["a"]}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
          <CheckboxGroup.Item value="b">B</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      const checkboxes = getAllByRole("checkbox");
      expect(checkboxes[0].getAttribute("aria-checked")).toBe("true");
      expect(checkboxes[1].getAttribute("aria-checked")).toBe("false");
    });

    it("calls onValueChange on toggle", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <CheckboxGroup value={[]} onValueChange={handleChange}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      fireEvent.click(getAllByRole("checkbox")[0]);
      expect(handleChange).toHaveBeenCalledWith(["a"]);
    });

    it("updates when external state changes", () => {
      const [value, setValue] = createSignal<string[]>([]);
      const { getAllByRole } = render(() => (
        <CheckboxGroup value={value()} onValueChange={setValue}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getAllByRole("checkbox")[0].getAttribute("aria-checked")).toBe("false");
      setValue(["a"]);
      expect(getAllByRole("checkbox")[0].getAttribute("aria-checked")).toBe("true");
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
        <CheckboxGroup required value={[]}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("Please select an item");
    });

    it("is valid when required and item is selected", () => {
      const { container } = render(() => (
        <CheckboxGroup required value={["a"]}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <CheckboxGroup value={["a"]} validate={() => "커스텀 에러"}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("커스텀 에러");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <CheckboxGroup value={["a"]} validate={() => undefined}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });
  });
});
