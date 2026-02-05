import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Note } from "../../../src/components/display/Note";

describe("Note 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Note 내부에 표시된다", () => {
      const { getByText } = render(() => <Note>This is a note</Note>);
      expect(getByText("This is a note")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.tagName).toBe("DIV");
    });
  });

  describe("theme 속성", () => {
    it("theme prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => <Note>Content</Note>);
      const { container: themedContainer } = render(() => <Note theme="danger">Content</Note>);

      const defaultClass = (defaultContainer.firstChild as HTMLElement).className;
      const themedClass = (themedContainer.firstChild as HTMLElement).className;

      expect(defaultClass).not.toBe(themedClass);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Note class="my-note">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("my-note")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Note data-testid="test-note">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.getAttribute("data-testid")).toBe("test-note");
    });
  });
});
