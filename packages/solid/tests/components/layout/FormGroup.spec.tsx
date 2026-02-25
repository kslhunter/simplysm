import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { FormGroup } from "../../../src/components/layout/FormGroup";

describe("FormGroup component", () => {
  describe("basic rendering", () => {
    it("displays children inside FormGroup", () => {
      const { getByText } = render(() => <FormGroup>Content</FormGroup>);
      expect(getByText("Content")).toBeTruthy();
    });

    it("renders as div element", () => {
      const { container } = render(() => <FormGroup>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.tagName).toBe("DIV");
    });
  });

  describe("inline property", () => {
    it("styles differ based on inline prop", () => {
      const { container: defaultContainer } = render(() => <FormGroup>Content</FormGroup>);
      const { container: inlineContainer } = render(() => <FormGroup inline>Content</FormGroup>);

      const defaultClass = (defaultContainer.firstChild as HTMLElement).className;
      const inlineClass = (inlineContainer.firstChild as HTMLElement).className;

      expect(defaultClass).not.toBe(inlineClass);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <FormGroup class="my-form-group">Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("my-form-group")).toBe(true);
    });
  });
});

describe("FormGroup.Item component", () => {
  describe("basic rendering", () => {
    it("displays children inside Item", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item>Field Content</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Field Content")).toBeTruthy();
    });

    it("renders as div element", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item>Content</FormGroup.Item>
        </FormGroup>
      ));
      const item = container.querySelector("[data-form-group-item]");
      expect(item?.tagName).toBe("DIV");
    });
  });

  describe("label property", () => {
    it("displays label", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Name")).toBeTruthy();
    });

    it("label can be JSX.Element", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item label={<span>Custom Label</span>}>Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Custom Label")).toBeTruthy();
    });

    it("label element is not rendered when no label is provided", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item>Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(container.querySelector("label")).toBeNull();
    });
  });

  describe("class merging", () => {
    it("applies custom classes to Item", () => {
      const { container } = render(() => (
        <FormGroup>
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <FormGroup.Item class="my-item">Content</FormGroup.Item>
        </FormGroup>
      ));
      const item = container.querySelector("[data-form-group-item]");
      expect(item?.classList.contains("my-item")).toBe(true);
    });
  });
});
