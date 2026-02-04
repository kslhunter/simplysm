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

  describe("기본 스타일 (수직 레이아웃)", () => {
    it("flex flex-col 레이아웃이 적용된다", () => {
      const { container } = render(() => <FormGroup>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("flex")).toBe(true);
      expect(group.classList.contains("flex-col")).toBe(true);
    });

    it("gap-4가 적용된다", () => {
      const { container } = render(() => <FormGroup>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("gap-4")).toBe(true);
    });
  });

  describe("inline 속성", () => {
    it("inline=true일 때 가로 레이아웃이 적용된다", () => {
      const { container } = render(() => <FormGroup inline>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("inline-flex")).toBe(true);
      expect(group.classList.contains("flex-row")).toBe(true);
      expect(group.classList.contains("flex-wrap")).toBe(true);
    });

    it("inline=true일 때 gap-2가 적용된다", () => {
      const { container } = render(() => <FormGroup inline>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("gap-2")).toBe(true);
    });

    it("inline=true일 때 items-center가 적용된다", () => {
      const { container } = render(() => <FormGroup inline>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("items-center")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <FormGroup class="my-form-group">Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("my-form-group")).toBe(true);
      expect(group.classList.contains("flex")).toBe(true);
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

  describe("label 스타일", () => {
    it("label에 font-bold가 적용된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      const label = container.querySelector("label");
      expect(label?.classList.contains("font-bold")).toBe(true);
    });

    it("label에 mb-1이 적용된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      const label = container.querySelector("label");
      expect(label?.classList.contains("mb-1")).toBe(true);
    });

    it("label에 block display가 적용된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      const label = container.querySelector("label");
      expect(label?.classList.contains("block")).toBe(true);
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
