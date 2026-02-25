import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { FormTable } from "../../../src/components/layout/FormTable";

describe("FormTable component", () => {
  describe("basic rendering", () => {
    it("displays children inside FormTable", () => {
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

    it("renders as table element", () => {
      const { container } = render(() => <FormTable>Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.tagName).toBe("TABLE");
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <FormTable class="my-form-table">Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("my-form-table")).toBe(true);
    });
  });

  describe("HTML attribute forwarding", () => {
    it("passes data-* attributes", () => {
      const { container } = render(() => <FormTable data-testid="test-table">Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.getAttribute("data-testid")).toBe("test-table");
    });
  });
});
