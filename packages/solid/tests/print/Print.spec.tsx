import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Print } from "../../src/components/print/Print";

describe("Print 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("data-print-root 속성이 렌더링된다", () => {
      const { container } = render(() => <Print>내용</Print>);
      const root = container.querySelector("[data-print-root]");
      expect(root).toBeTruthy();
    });

    it("children이 렌더링된다", () => {
      const { getByText } = render(() => <Print>테스트 내용</Print>);
      expect(getByText("테스트 내용")).toBeTruthy();
    });

    it("ready 생략 시 data-print-ready 속성이 존재한다", () => {
      const { container } = render(() => <Print>내용</Print>);
      const root = container.querySelector("[data-print-root]");
      expect(root?.hasAttribute("data-print-ready")).toBe(true);
    });
  });

  describe("ready 속성", () => {
    it("ready={false}이면 data-print-ready 속성이 없다", () => {
      const { container } = render(() => <Print ready={false}>내용</Print>);
      const root = container.querySelector("[data-print-root]");
      expect(root?.hasAttribute("data-print-ready")).toBe(false);
    });

    it("ready가 false에서 true로 변경되면 data-print-ready가 추가된다", async () => {
      const [ready, setReady] = createSignal(false);
      const { container } = render(() => <Print ready={ready()}>내용</Print>);
      const root = container.querySelector("[data-print-root]")!;

      expect(root.hasAttribute("data-print-ready")).toBe(false);

      setReady(true);
      await Promise.resolve();
      expect(root.hasAttribute("data-print-ready")).toBe(true);
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
