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

  describe("기본 스타일", () => {
    it("block display가 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("block")).toBe(true);
    });

    it("p-3 padding이 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("p-3")).toBe(true);
    });

    it("rounded border-radius가 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("rounded")).toBe(true);
    });
  });

  describe("theme 속성", () => {
    it("theme 미지정 시 gray 테마가 기본 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-gray-100")).toBe(true);
      expect(note.classList.contains("dark:bg-gray-800")).toBe(true);
    });

    it("theme=primary일 때 primary 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="primary">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-primary-100")).toBe(true);
      expect(note.classList.contains("dark:bg-primary-900/30")).toBe(true);
    });

    it("theme=info일 때 info 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="info">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-info-100")).toBe(true);
    });

    it("theme=success일 때 success 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="success">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-success-100")).toBe(true);
    });

    it("theme=warning일 때 warning 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="warning">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-warning-100")).toBe(true);
    });

    it("theme=danger일 때 danger 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="danger">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-danger-100")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Note class="my-note">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("my-note")).toBe(true);
      expect(note.classList.contains("block")).toBe(true);
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
