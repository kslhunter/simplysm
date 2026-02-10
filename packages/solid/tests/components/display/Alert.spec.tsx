import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Alert } from "../../../src/components/display/Alert";

describe("Alert 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Alert 내부에 표시된다", () => {
      const { getByText } = render(() => <Alert>This is a note</Alert>);
      expect(getByText("This is a note")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
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

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Alert class="my-alert">Content</Alert>);
      const alert = container.firstChild as HTMLElement;
      expect(alert.classList.contains("my-alert")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Alert data-testid="test-alert">Content</Alert>);
      const alert = container.firstChild as HTMLElement;
      expect(alert.getAttribute("data-testid")).toBe("test-alert");
    });
  });
});
