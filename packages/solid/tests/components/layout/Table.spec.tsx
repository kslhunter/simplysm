import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Table } from "../../../src/components/layout/Table";

describe("Table 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Table 내부에 표시된다", () => {
      const { container } = render(() => (
        <Table>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>
      ));
      expect(container.querySelector("td")?.textContent).toBe("Content");
    });

    it("table 요소로 렌더링된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.tagName).toBe("TABLE");
    });
  });

  describe("기본 스타일", () => {
    it("w-full이 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("w-full")).toBe(true);
    });

    it("border-separate가 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-separate")).toBe(true);
    });

    it("border-spacing-0이 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-spacing-0")).toBe(true);
    });

    it("테두리 스타일이 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-r")).toBe(true);
      expect(table.classList.contains("border-b")).toBe(true);
      expect(table.classList.contains("border-gray-300")).toBe(true);
      expect(table.classList.contains("dark:border-gray-600")).toBe(true);
    });
  });

  describe("inset 속성", () => {
    it("inset=true일 때 외곽 테두리가 제거된다", () => {
      const { container } = render(() => <Table inset>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-r-0")).toBe(true);
      expect(table.classList.contains("border-b-0")).toBe(true);
    });
  });

  describe("inline 속성", () => {
    it("inline=true일 때 w-auto가 적용된다", () => {
      const { container } = render(() => <Table inline>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("w-auto")).toBe(true);
      expect(table.classList.contains("w-full")).toBe(false);
    });
  });

  describe("속성 조합", () => {
    it("inset과 inline이 동시에 적용될 수 있다", () => {
      const { container } = render(() => (
        <Table inset inline>
          Content
        </Table>
      ));
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-r-0")).toBe(true);
      expect(table.classList.contains("border-b-0")).toBe(true);
      expect(table.classList.contains("w-auto")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Table class="my-table">Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("my-table")).toBe(true);
      expect(table.classList.contains("border-separate")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Table data-testid="test-table">Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.getAttribute("data-testid")).toBe("test-table");
    });
  });
});
