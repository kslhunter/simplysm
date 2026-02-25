import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Tag } from "../../../src/components/display/Tag";

describe("Tag 컴포넌트", () => {
  describe("basic rendering", () => {
    it("children이 Tag 내부에 표시된다", () => {
      const { getByText } = render(() => <Tag>New</Tag>);
      expect(getByText("New")).toBeTruthy();
    });

    it("renders as span element", () => {
      const { container } = render(() => <Tag>Tag</Tag>);
      const tag = container.firstChild as HTMLElement;
      expect(tag.tagName).toBe("SPAN");
    });
  });

  describe("theme 속성", () => {
    it("theme prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => <Tag>Tag</Tag>);
      const { container: themedContainer } = render(() => <Tag theme="danger">Tag</Tag>);

      const defaultClass = (defaultContainer.firstChild as HTMLElement).className;
      const themedClass = (themedContainer.firstChild as HTMLElement).className;

      expect(defaultClass).not.toBe(themedClass);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Tag class="my-tag">Tag</Tag>);
      const tag = container.firstChild as HTMLElement;
      expect(tag.classList.contains("my-tag")).toBe(true);
    });
  });

  describe("HTML attribute forwarding", () => {
    it("passes data-* attributes", () => {
      const { container } = render(() => <Tag data-testid="test-tag">Tag</Tag>);
      const tag = container.firstChild as HTMLElement;
      expect(tag.getAttribute("data-testid")).toBe("test-tag");
    });
  });
});
