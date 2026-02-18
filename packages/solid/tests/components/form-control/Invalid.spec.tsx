import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Invalid } from "../../../src/components/form-control/Invalid";

describe("Invalid 컴포넌트", () => {
  describe("Fragment 렌더링", () => {
    it("래퍼 div 없이 children과 hidden input을 렌더링한다", () => {
      const { container } = render(() => (
        <Invalid message="에러">
          <div data-testid="child">내용</div>
        </Invalid>
      ));
      const child = container.querySelector("[data-testid='child']");
      const hiddenInput = container.querySelector("input[aria-hidden='true']");
      expect(child).toBeTruthy();
      expect(hiddenInput).toBeTruthy();
      expect(child!.parentElement).toBe(container);
    });
  });

  describe("setCustomValidity", () => {
    it("message가 있으면 setCustomValidity가 설정된다", () => {
      const { container } = render(() => (
        <Invalid message="필수 입력 항목입니다">
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
    });

    it("message가 없으면 유효 상태이다", () => {
      const { container } = render(() => (
        <Invalid>
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("message가 변경되면 setCustomValidity도 업데이트된다", () => {
      const [msg, setMsg] = createSignal<string | undefined>("에러");
      const { container } = render(() => (
        <Invalid message={msg()}>
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("에러");

      setMsg(undefined);
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });

  describe("variant='border'", () => {
    it("message가 있으면 target에 border-danger-500 클래스가 추가된다", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="에러">
          <div data-testid="target" class="border">
            내용
          </div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(true);
    });

    it("message가 없으면 border-danger-500 클래스가 없다", () => {
      const { container } = render(() => (
        <Invalid variant="border">
          <div data-testid="target" class="border">
            내용
          </div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(false);
    });
  });

  describe("variant='dot' (기본값)", () => {
    it("message가 있으면 target 내부에 dot 요소가 삽입된다", () => {
      const { container } = render(() => (
        <Invalid message="에러">
          <div data-testid="target">내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      const dot = target.querySelector("[data-invalid-dot]");
      expect(dot).toBeTruthy();
    });

    it("message가 없으면 dot 요소가 없다", () => {
      const { container } = render(() => (
        <Invalid>
          <div data-testid="target">내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      const dot = target.querySelector("[data-invalid-dot]");
      expect(dot).toBeFalsy();
    });
  });

  describe("touchMode", () => {
    it("touchMode일 때 초기에는 시각적 표시가 없다", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="에러" touchMode>
          <div data-testid="target" class="border">
            내용
          </div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(false);
    });

    it("touchMode일 때 setCustomValidity는 항상 설정된다", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="에러" touchMode>
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("에러");
    });
  });
});
