import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Link } from "../../../src/components/display/Link";

describe("Link 컴포넌트", () => {
  describe("basic rendering", () => {
    it("children이 Link 내부에 표시된다", () => {
      const { getByText } = render(() => <Link href="https://example.com">링크</Link>);
      expect(getByText("링크")).toBeTruthy();
    });

    it("renders as link element", () => {
      const { container } = render(() => <Link href="https://example.com">링크</Link>);
      const link = container.firstChild as HTMLElement;
      expect(link.tagName).toBe("A");
    });
  });

  describe("href 속성", () => {
    it("href가 a 요소에 전달된다", () => {
      const { container } = render(() => <Link href="https://example.com">링크</Link>);
      const link = container.firstChild as HTMLAnchorElement;
      expect(link.getAttribute("href")).toBe("https://example.com");
    });

    it("target 속성이 전달된다", () => {
      const { container } = render(() => (
        <Link href="https://example.com" target="_blank">
          링크
        </Link>
      ));
      const link = container.firstChild as HTMLAnchorElement;
      expect(link.getAttribute("target")).toBe("_blank");
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      /* eslint-disable tailwindcss/no-custom-classname */
      const { container } = render(() => (
        <Link href="#" class="my-link">
          링크
        </Link>
      ));
      /* eslint-enable tailwindcss/no-custom-classname */
      const link = container.firstChild as HTMLElement;
      expect(link.classList.contains("my-link")).toBe(true);
    });
  });

  describe("HTML attribute forwarding", () => {
    it("passes data-* attributes", () => {
      const { container } = render(() => (
        <Link href="#" data-testid="test-link">
          링크
        </Link>
      ));
      const link = container.firstChild as HTMLElement;
      expect(link.getAttribute("data-testid")).toBe("test-link");
    });
  });
});
