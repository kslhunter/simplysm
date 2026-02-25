import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Table } from "../../../src/components/data/Table";

describe("Table 컴포넌트", () => {
  describe("basic rendering", () => {
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

    it("renders as table element", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.tagName).toBe("TABLE");
    });
  });

  describe("inset 속성", () => {
    it("inset prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => <Table>Content</Table>);
      const { container: insetContainer } = render(() => <Table inset>Content</Table>);

      const defaultClass = (defaultContainer.firstChild as HTMLElement).className;
      const insetClass = (insetContainer.firstChild as HTMLElement).className;

      expect(defaultClass).not.toBe(insetClass);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Table class="my-table">Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("my-table")).toBe(true);
    });
  });

  describe("HTML attribute forwarding", () => {
    it("passes data-* attributes", () => {
      const { container } = render(() => <Table data-testid="test-table">Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.getAttribute("data-testid")).toBe("test-table");
    });
  });
});
