import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { invalid } from "../../src/directives/invalid";

// directive 등록
void invalid;

describe("use:invalid directive", () => {
  describe("유효성 표시", () => {
    it("에러 메시지가 있으면 aria-invalid=true가 설정된다", () => {
      function TestComponent() {
        const errorMessage = () => "에러 발생";
        return <div data-testid="container" use:invalid={errorMessage}>content</div>;
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "true");
    });

    it("에러 메시지가 없으면 aria-invalid=false가 설정된다", () => {
      function TestComponent() {
        const errorMessage = () => "";
        return <div data-testid="container" use:invalid={errorMessage}>content</div>;
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "false");
    });

    it("에러 상태가 변경되면 aria-invalid도 업데이트된다", () => {
      function TestComponent() {
        const [hasError, setHasError] = createSignal(false);
        const errorMessage = () => (hasError() ? "에러!" : "");
        return (
          <div>
            <div data-testid="container" use:invalid={errorMessage}>
              content
            </div>
            <button data-testid="toggle" onClick={() => setHasError(!hasError())}>
              Toggle
            </button>
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "false");

      // 에러 상태로 변경
      screen.getByTestId("toggle").click();

      // 상태 변경 후 aria-invalid 업데이트 확인
      expect(container).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("hidden input", () => {
    it("hidden input이 생성되고 setCustomValidity가 호출된다", () => {
      function TestComponent() {
        const errorMessage = () => "필수 입력입니다";
        return <div data-testid="container" use:invalid={errorMessage}>content</div>;
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      const hiddenInput = container.querySelector("input") as HTMLInputElement;

      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput.validationMessage).toBe("필수 입력입니다");
    });
  });

  describe("CSS 클래스", () => {
    it("에러 상태에서 빨간 점 클래스가 추가된다", () => {
      function TestComponent() {
        const errorMessage = () => "에러!";
        return <div data-testid="container" use:invalid={errorMessage}>content</div>;
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      // invalid directive가 추가하는 클래스 확인
      expect(container.classList.length).toBeGreaterThan(0);
    });
  });
});
