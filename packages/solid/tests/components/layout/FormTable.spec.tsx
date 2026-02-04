import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { FormTable } from "../../../src/components/layout/FormTable";

describe("FormTable 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 FormTable 내부에 표시된다", () => {
      const { container } = render(() => (
        <FormTable>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </FormTable>
      ));
      expect(container.querySelector("td")?.textContent).toBe("Content");
    });

    it("table 요소로 렌더링된다", () => {
      const { container } = render(() => <FormTable>Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.tagName).toBe("TABLE");
    });
  });

  describe("기본 스타일", () => {
    it("border-separate가 적용된다", () => {
      const { container } = render(() => <FormTable>Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-separate")).toBe(true);
    });

    it("border-spacing-0이 적용된다", () => {
      const { container } = render(() => <FormTable>Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-spacing-0")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <FormTable class="my-form-table">Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("my-form-table")).toBe(true);
      expect(table.classList.contains("border-separate")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <FormTable data-testid="test-table">Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.getAttribute("data-testid")).toBe("test-table");
    });
  });
});
