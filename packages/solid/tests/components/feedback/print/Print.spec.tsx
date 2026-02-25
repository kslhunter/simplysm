import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Print } from "../../../../src/components/feedback/print/Print";

describe("Print 컴포넌트", () => {
  describe("basic rendering", () => {
    it("renders children", () => {
      const { getByText } = render(() => <Print>테스트 내용</Print>);
      expect(getByText("테스트 내용")).toBeTruthy();
    });
  });

  describe("Print.Page", () => {
    it("data-print-page 속성이 렌더링된다", () => {
      const { container } = render(() => (
        <Print>
          <Print.Page>페이지 1</Print.Page>
        </Print>
      ));
      const page = container.querySelector("[data-print-page]");
      expect(page).toBeTruthy();
    });

    it("여러 Print.Page가 각각 data-print-page를 가진다", () => {
      const { container } = render(() => (
        <Print>
          <Print.Page>페이지 1</Print.Page>
          <Print.Page>페이지 2</Print.Page>
          <Print.Page>페이지 3</Print.Page>
        </Print>
      ));
      const pages = container.querySelectorAll("[data-print-page]");
      expect(pages.length).toBe(3);
    });

    it("Print.Page children이 렌더링된다", () => {
      const { getByText } = render(() => (
        <Print>
          <Print.Page>페이지 내용</Print.Page>
        </Print>
      ));
      expect(getByText("페이지 내용")).toBeTruthy();
    });
  });
});
