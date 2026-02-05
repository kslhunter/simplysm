import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { FormGroup } from "../../../src/components/layout/FormGroup";

describe("FormGroup 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 FormGroup 내부에 표시된다", () => {
      const { getByText } = render(() => <FormGroup>Content</FormGroup>);
      expect(getByText("Content")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => <FormGroup>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.tagName).toBe("DIV");
    });
  });

  describe("inline 속성", () => {
    it("inline prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => <FormGroup>Content</FormGroup>);
      const { container: inlineContainer } = render(() => <FormGroup inline>Content</FormGroup>);

      const defaultClass = (defaultContainer.firstChild as HTMLElement).className;
      const inlineClass = (inlineContainer.firstChild as HTMLElement).className;

      expect(defaultClass).not.toBe(inlineClass);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <FormGroup class="my-form-group">Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("my-form-group")).toBe(true);
    });
  });
});

describe("FormGroup.Item 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Item 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item>Field Content</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Field Content")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item>Content</FormGroup.Item>
        </FormGroup>
      ));
      const item = container.querySelector("[data-form-group-item]");
      expect(item?.tagName).toBe("DIV");
    });
  });

  describe("label 속성", () => {
    it("label이 표시된다", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Name")).toBeTruthy();
    });

    it("label이 JSX.Element일 수 있다", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item label={<span>Custom Label</span>}>Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Custom Label")).toBeTruthy();
    });

    it("label이 없을 때 label 요소가 렌더링되지 않는다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item>Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(container.querySelector("label")).toBeNull();
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 Item에 적용된다", () => {
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
