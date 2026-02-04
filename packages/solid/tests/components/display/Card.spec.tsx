import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Card } from "../../../src/components/display/Card";

describe("Card 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Card 내부에 표시된다", () => {
      const { getByText } = render(() => <Card>Card Content</Card>);
      expect(getByText("Card Content")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.tagName).toBe("DIV");
    });
  });

  describe("기본 스타일", () => {
    it("block display가 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("block")).toBe(true);
    });

    it("배경색이 적용된다 (light/dark)", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("bg-white")).toBe(true);
      expect(card.classList.contains("dark:bg-gray-900")).toBe(true);
    });

    it("rounded-lg border-radius가 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("rounded-lg")).toBe(true);
    });

    it("shadow 스타일이 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("shadow-md")).toBe(true);
      expect(card.classList.contains("hover:shadow-lg")).toBe(true);
      expect(card.classList.contains("focus-within:shadow-lg")).toBe(true);
    });

    it("transition 스타일이 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("transition-shadow")).toBe(true);
      expect(card.classList.contains("duration-300")).toBe(true);
    });

    it("등장 애니메이션이 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("animate-card-in")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Card class="my-custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("my-custom-class")).toBe(true);
      expect(card.classList.contains("block")).toBe(true);
    });

    it("사용자 정의 class가 기본 스타일을 오버라이드할 수 있다", () => {
      const { container } = render(() => <Card class="rounded-none">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("rounded-none")).toBe(true);
      expect(card.classList.contains("rounded-lg")).toBe(false);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Card data-testid="test-card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.getAttribute("data-testid")).toBe("test-card");
    });

    it("id 속성이 전달된다", () => {
      const { container } = render(() => <Card id="my-card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.id).toBe("my-card");
    });
  });
});
