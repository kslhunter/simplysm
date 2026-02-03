import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Button } from "../../src/components/controls/Button";

describe("ripple directive", () => {
  it("버튼 클릭 시 ripple indicator가 생성된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full");
    expect(ripple).toBeTruthy();
  });

  it("disabled 버튼은 ripple이 생성되지 않는다", () => {
    const { getByRole } = render(() => <Button disabled>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full");
    expect(ripple).toBeFalsy();
  });

  it("pointerup 후 ripple의 opacity가 0이 된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    fireEvent.pointerUp(button);

    expect(ripple.style.opacity).toBe("0");
  });

  it("빠른 연속 클릭 시 이전 ripple이 제거되고 새 ripple이 생성된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    // 첫 번째 클릭
    fireEvent.pointerDown(button, { clientX: 30, clientY: 15 });
    const firstRipple = button.querySelector(".rounded-full");
    expect(firstRipple).toBeTruthy();

    // 두 번째 클릭 (다른 위치)
    fireEvent.pointerDown(button, { clientX: 70, clientY: 35 });
    const ripples = button.querySelectorAll(".rounded-full");

    // 단일 ripple만 존재해야 함
    expect(ripples.length).toBe(1);
  });

  it("첫 pointerdown 시 ripple container가 생성되고 overflow: hidden이 적용된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    // pointerdown 전에는 ripple container 없음
    expect(button.children.length).toBe(0); // 텍스트 노드만 있음

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    // pointerdown 후에는 ripple container가 생성됨
    expect(button.children.length).toBeGreaterThan(0);
    const container = button.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.style.overflow).toBe("hidden");
    // 부모 버튼의 overflow는 변경되지 않음
    expect(button.style.overflow).not.toBe("hidden");
  });

  it("마우스를 누르고 있는 동안 ripple이 유지된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    // pointerup 없이 ripple이 유지되어야 함
    // opacity가 여전히 1이어야 함 (fade out 시작 안 함)
    expect(ripple.style.opacity).toBe("1");
  });

  it("다크모드용 ripple 클래스가 적용된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    // 라이트/다크 모드 모두 지원하는 클래스 확인
    expect(ripple.classList.contains("bg-black/20")).toBe(true);
    expect(ripple.classList.contains("dark:bg-white/20")).toBe(true);
  });

  it("pointerleave 시에도 ripple이 fade out된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    fireEvent.pointerLeave(button);

    expect(ripple.style.opacity).toBe("0");
  });

  it("pointercancel 시에도 ripple이 fade out된다", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    fireEvent.pointerCancel(button);

    expect(ripple.style.opacity).toBe("0");
  });
});
