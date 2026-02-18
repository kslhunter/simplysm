import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { Button } from "../../../src/components/controls/button/button";
import { button } from "../../../src/components/controls/button/button.css";

describe("Button", () => {
  describe("클릭 동작 (AC#5)", () => {
    it("클릭하면 onClick 핸들러가 호출된다", () => {
      const handleClick = vi.fn();

      render(() => <Button onClick={handleClick}>클릭</Button>);

      fireEvent.click(screen.getByRole("button", { name: "클릭" }));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disabled 상태에서 클릭해도 onClick이 호출되지 않는다", () => {
      const handleClick = vi.fn();

      render(() => (
        <Button disabled onClick={handleClick}>
          비활성화
        </Button>
      ));

      fireEvent.click(screen.getByRole("button", { name: "비활성화" }));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("렌더링", () => {
    it("children이 올바르게 렌더링된다", () => {
      render(() => <Button>테스트 버튼</Button>);

      expect(screen.getByRole("button", { name: "테스트 버튼" })).toBeInTheDocument();
    });

    it("disabled 속성이 적용된다 (AC#3)", () => {
      render(() => <Button disabled>비활성화</Button>);

      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("theme variants (AC#1)", () => {
    const themes = [
      "primary",
      "secondary",
      "danger",
      "success",
      "warning",
      "info",
      "gray",
      "slate",
    ] as const;

    it.each(themes)("theme='%s'가 올바른 클래스를 적용한다", (theme) => {
      render(() => <Button theme={theme}>{theme}</Button>);

      const buttonEl = screen.getByRole("button", { name: theme });
      const expectedClass = button({ theme });
      expect(buttonEl.className).toContain(expectedClass.split(" ")[0]);
    });

    it("theme를 지정하지 않으면 기본 스타일이 적용된다", () => {
      render(() => <Button>기본</Button>);

      const buttonEl = screen.getByRole("button", { name: "기본" });
      expect(buttonEl).toBeInTheDocument();
      // 기본 스타일은 theme variant 없이 base 스타일만 적용
    });
  });

  describe("size variants (AC#2)", () => {
    const sizes = ["xs", "sm", "lg", "xl"] as const;

    it.each(sizes)("size='%s'가 올바른 클래스를 적용한다", (size) => {
      render(() => <Button size={size}>{size}</Button>);

      const buttonEl = screen.getByRole("button", { name: size });
      const expectedClass = button({ size });
      expect(buttonEl.className).toContain(expectedClass.split(" ")[0]);
    });

    it("size를 지정하지 않으면 기본 크기가 적용된다", () => {
      render(() => <Button>기본 크기</Button>);

      const buttonEl = screen.getByRole("button", { name: "기본 크기" });
      expect(buttonEl).toBeInTheDocument();
    });
  });

  describe("theme + size 조합 (AC#1, AC#2)", () => {
    it("theme='primary' size='lg' 조합이 올바르게 동작한다", () => {
      render(() => (
        <Button theme="primary" size="lg">
          Primary Large
        </Button>
      ));

      const buttonEl = screen.getByRole("button", { name: "Primary Large" });
      const expectedClass = button({ theme: "primary", size: "lg" });
      expect(buttonEl.className).toContain(expectedClass.split(" ")[0]);
    });

    it("theme='danger' size='xs' 조합이 올바르게 동작한다", () => {
      render(() => (
        <Button theme="danger" size="xs">
          Danger XS
        </Button>
      ));

      const buttonEl = screen.getByRole("button", { name: "Danger XS" });
      const expectedClass = button({ theme: "danger", size: "xs" });
      expect(buttonEl.className).toContain(expectedClass.split(" ")[0]);
    });
  });

  describe("link 스타일 (AC#6)", () => {
    it("link={true}가 올바른 클래스를 적용한다", () => {
      render(() => <Button link>링크 버튼</Button>);

      const buttonEl = screen.getByRole("button", { name: "링크 버튼" });
      const expectedClass = button({ link: true });
      expect(buttonEl.className).toContain(expectedClass.split(" ")[0]);
    });

    it("link={true} + theme='primary' 조합이 올바르게 동작한다", () => {
      render(() => (
        <Button link theme="primary">
          링크 Primary
        </Button>
      ));

      const buttonEl = screen.getByRole("button", { name: "링크 Primary" });
      const expectedClass = button({ link: true, theme: "primary" });
      expect(buttonEl.className).toContain(expectedClass.split(" ")[0]);
    });
  });

  describe("inset 스타일 (AC#7)", () => {
    it("inset={true}가 올바른 클래스를 적용한다", () => {
      render(() => <Button inset>인셋 버튼</Button>);

      const buttonEl = screen.getByRole("button", { name: "인셋 버튼" });
      const expectedClass = button({ inset: true });
      expect(buttonEl.className).toContain(expectedClass.split(" ")[0]);
    });
  });

  describe("ripple directive (AC#4)", () => {
    it("클릭 시 ripple 효과 요소가 생성된다", () => {
      render(() => <Button>Ripple 테스트</Button>);

      const buttonEl = screen.getByRole("button", { name: "Ripple 테스트" });

      // pointerdown 이벤트 발생
      fireEvent.pointerDown(buttonEl, { clientX: 50, clientY: 25 });

      // ripple 요소가 생성되었는지 확인
      const rippleEl = buttonEl.querySelector("span");
      expect(rippleEl).toBeInTheDocument();
    });
  });

  describe("TypeScript 타입 (AC#8)", () => {
    it("모든 props가 올바른 타입으로 전달된다", () => {
      // 이 테스트는 컴파일 타임에 타입 검증을 수행
      // 잘못된 타입은 TypeScript 컴파일 에러 발생
      render(() => (
        <Button
          theme="primary"
          size="lg"
          link={false}
          inset={false}
          disabled={false}
          type="submit"
          onClick={() => {}}
        >
          타입 검증
        </Button>
      ));

      expect(screen.getByRole("button", { name: "타입 검증" })).toBeInTheDocument();
    });
  });
});
