import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Label } from "../../../src/components/display/Label";

describe("Label 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Label 내부에 표시된다", () => {
      const { getByText } = render(() => <Label>New</Label>);
      expect(getByText("New")).toBeTruthy();
    });

    it("span 요소로 렌더링된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.tagName).toBe("SPAN");
    });
  });

  describe("기본 스타일", () => {
    it("inline-block display가 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("inline-block")).toBe(true);
    });

    it("흰색 텍스트가 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("text-white")).toBe(true);
    });

    it("px-2 padding이 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("px-2")).toBe(true);
    });

    it("rounded border-radius가 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("rounded")).toBe(true);
    });
  });

  describe("theme 속성", () => {
    it("theme 미지정 시 gray 테마가 기본 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-gray-600")).toBe(true);
      expect(label.classList.contains("dark:bg-gray-500")).toBe(true);
    });

    it("theme=primary일 때 primary 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="primary">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-primary-500")).toBe(true);
      expect(label.classList.contains("dark:bg-primary-600")).toBe(true);
    });

    it("theme=info일 때 info 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="info">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-info-500")).toBe(true);
    });

    it("theme=success일 때 success 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="success">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-success-500")).toBe(true);
    });

    it("theme=warning일 때 warning 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="warning">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-warning-500")).toBe(true);
    });

    it("theme=danger일 때 danger 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="danger">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-danger-500")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Label class="my-label">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("my-label")).toBe(true);
      expect(label.classList.contains("inline-block")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Label data-testid="test-label">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.getAttribute("data-testid")).toBe("test-label");
    });
  });
});
