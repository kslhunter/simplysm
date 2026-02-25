import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Alert } from "../../../src/components/display/Alert";

describe("Alert 컴포넌트", () => {
  describe("basic rendering", () => {
    it("children이 Alert 내부에 표시된다", () => {
      const { getByText } = render(() => <Alert>This is a note</Alert>);
      expect(getByText("This is a note")).toBeTruthy();
    });

    it("renders as div element", () => {
      const { container } = render(() => <Alert>Content</Alert>);
      const alert = container.firstChild as HTMLElement;
      expect(alert.tagName).toBe("DIV");
    });
  });

  describe("theme 속성", () => {
    it("theme prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => <Alert>Content</Alert>);
      const { container: themedContainer } = render(() => <Alert theme="danger">Content</Alert>);

      const defaultClass = (defaultContainer.firstChild as HTMLElement).className;
      const themedClass = (themedContainer.firstChild as HTMLElement).className;

      expect(defaultClass).not.toBe(themedClass);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Alert class="my-alert">Content</Alert>);
      const alert = container.firstChild as HTMLElement;
      expect(alert.classList.contains("my-alert")).toBe(true);
    });
  });

  describe("HTML attribute forwarding", () => {
    it("passes data-* attributes", () => {
      const { container } = render(() => <Alert data-testid="test-alert">Content</Alert>);
      const alert = container.firstChild as HTMLElement;
      expect(alert.getAttribute("data-testid")).toBe("test-alert");
    });
  });
});
