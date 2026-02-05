import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Label } from "../../../src/components/display/Label";

describe("Label 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Label 내부에 표시된다", () => {
      const { getByText } = render(() => <Label>New</Label>);
      expect(getByText("New")).toBeTruthy();
    });

    it("span 요소로 렌더링된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.tagName).toBe("SPAN");
    });
  });

  describe("theme 속성", () => {
    it("theme prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => <Label>Tag</Label>);
      const { container: themedContainer } = render(() => <Label theme="danger">Tag</Label>);

      const defaultClass = (defaultContainer.firstChild as HTMLElement).className;
      const themedClass = (themedContainer.firstChild as HTMLElement).className;

      expect(defaultClass).not.toBe(themedClass);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Label class="my-label">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("my-label")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Label data-testid="test-label">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.getAttribute("data-testid")).toBe("test-label");
    });
  });
});
