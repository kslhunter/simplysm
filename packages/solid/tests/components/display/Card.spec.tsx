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

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Card class="my-custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("my-custom-class")).toBe(true);
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
