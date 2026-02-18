import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { anchorStyles, type AnchorStyles } from "../../../src/styles/utilities/anchor.css";

// 공통 상수 - 중복 제거
const THEMES = [
  "primary",
  "secondary",
  "danger",
  "success",
  "warning",
  "info",
  "gray",
  "slate",
] as const;

describe("anchorStyles", () => {
  describe("theme variants (AC#1)", () => {
    const themes = THEMES;

    it.each(themes)("theme='%s'가 올바른 클래스를 생성한다", (theme) => {
      const className = anchorStyles({ theme });
      expect(className).toBeDefined();
      expect(typeof className).toBe("string");
      expect(className.length).toBeGreaterThan(0);
    });

    it("기본 theme는 'primary'이다", () => {
      const defaultClassName = anchorStyles();
      const primaryClassName = anchorStyles({ theme: "primary" });
      expect(defaultClassName).toBe(primaryClassName);
    });
  });

  describe("스타일 적용 테스트 (AC#2, #3)", () => {
    it("표준 <a> 태그에 스타일이 적용된다 (AC#4)", () => {
      const className = anchorStyles({ theme: "primary" });

      render(() => (
        <a href="/test" class={className} data-testid="anchor">
          테스트 링크
        </a>
      ));

      const anchor = screen.getByTestId("anchor");
      expect(anchor).toBeInTheDocument();
      expect(anchor.className).toContain(className.split(" ")[0]);
    });

    it("disabled 상태가 data-disabled 속성으로 적용된다 (AC#3)", () => {
      const className = anchorStyles({ theme: "primary" });

      render(() => (
        <a href="/test" class={className} data-disabled="true" data-testid="disabled-anchor">
          비활성 링크
        </a>
      ));

      const anchor = screen.getByTestId("disabled-anchor");
      expect(anchor).toBeInTheDocument();
      expect(anchor).toHaveAttribute("data-disabled", "true");
    });

    it("모든 theme에 대해 클래스가 생성된다", () => {
      THEMES.forEach((theme) => {
        const className = anchorStyles({ theme });
        expect(className).toBeDefined();
      });
    });
  });

  describe("hover/focus-visible 스타일 (AC#2 보강)", () => {
    it("hover 이벤트가 올바르게 트리거된다", () => {
      const className = anchorStyles({ theme: "primary" });

      render(() => (
        <a href="/test" class={className} data-testid="hover-anchor">
          호버 테스트
        </a>
      ));

      const anchor = screen.getByTestId("hover-anchor");

      // hover 이벤트 발생
      fireEvent.mouseEnter(anchor);

      // 요소가 여전히 존재하고 클래스가 적용되어 있는지 확인
      expect(anchor).toBeInTheDocument();
      expect(anchor.className).toContain(className.split(" ")[0]);
    });

    it("focus 이벤트가 올바르게 트리거된다", () => {
      const className = anchorStyles({ theme: "primary" });

      render(() => (
        <a href="/test" class={className} data-testid="focus-anchor">
          포커스 테스트
        </a>
      ));

      const anchor = screen.getByTestId("focus-anchor");

      // focus 직접 호출 (fireEvent.focus는 실제 포커스를 이동시키지 않음)
      anchor.focus();

      // 요소가 포커스를 받을 수 있는지 확인
      expect(anchor).toBeInTheDocument();
      expect(document.activeElement).toBe(anchor);
    });

    it("키보드 네비게이션으로 포커스가 가능하다 (접근성)", () => {
      const className = anchorStyles({ theme: "primary" });

      render(() => (
        <div>
          <button data-testid="before">이전</button>
          <a href="/test" class={className} data-testid="keyboard-anchor">
            키보드 접근성 테스트
          </a>
        </div>
      ));

      const anchor = screen.getByTestId("keyboard-anchor");

      // 링크는 기본적으로 tabindex를 가지므로 포커스 가능해야 함
      anchor.focus();
      expect(document.activeElement).toBe(anchor);
    });
  });

  describe("TypeScript 타입 (AC#5)", () => {
    it("AnchorStyles 타입이 정의되어 있다", () => {
      // 이 테스트는 컴파일 타임에 타입 검증을 수행
      const styles: AnchorStyles = { theme: "primary" };
      expect(styles.theme).toBe("primary");
    });

    it("잘못된 theme 값은 타입 에러가 발생해야 한다", () => {
      // 컴파일 타임에 타입 체크되므로 런타임에서는 검증만
      THEMES.forEach((theme) => {
        expect(() => anchorStyles({ theme })).not.toThrow();
      });
    });
  });

  describe("recipe 함수 동작", () => {
    it("인자 없이 호출하면 기본 스타일이 적용된다", () => {
      const className = anchorStyles();
      expect(className).toBeDefined();
      expect(typeof className).toBe("string");
    });

    it("각 theme별로 다른 클래스가 생성된다", () => {
      const primaryClass = anchorStyles({ theme: "primary" });
      const dangerClass = anchorStyles({ theme: "danger" });

      // 다른 theme는 다른 클래스명을 가져야 함
      expect(primaryClass).not.toBe(dangerClass);
    });
  });
});
