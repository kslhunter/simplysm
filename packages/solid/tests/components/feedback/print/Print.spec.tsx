import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Print } from "../../../../src/components/feedback/print/Print";

describe("Print", () => {
  describe("basic rendering", () => {
    it("renders children", () => {
      const { getByText } = render(() => <Print>테스트 내용</Print>);
      expect(getByText("테스트 내용")).toBeTruthy();
    });
  });

  describe("Print.Page", () => {
    it("renders with data-print-page attribute", () => {
      const { container } = render(() => (
        <Print>
          <Print.Page>페이지 1</Print.Page>
        </Print>
      ));
      const page = container.querySelector("[data-print-page]");
      expect(page).toBeTruthy();
    });

    it("each Print.Page has data-print-page attribute", () => {
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

    it("renders Print.Page children", () => {
      const { getByText } = render(() => (
        <Print>
          <Print.Page>페이지 내용</Print.Page>
        </Print>
      ));
      expect(getByText("페이지 내용")).toBeTruthy();
    });
  });
});
