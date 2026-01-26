import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ripple } from "../../src/directives/ripple";

// directive 등록을 위한 side-effect import
void ripple;

describe("ripple directive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("첫 pointerdown에서 position이 static이면 relative로 변경", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    // pointerdown 전에는 스타일 미적용
    expect(button.style.position).toBe("");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });

    // pointerdown 후 스타일 적용
    expect(button.style.position).toBe("relative");
    expect(button.style.overflow).toBe("hidden");
  });

  it("position이 이미 설정된 경우 덮어쓰지 않음", () => {
    const { getByTestId } = render(() => (
      <button data-testid="btn" style={{ position: "absolute" }} use:ripple={true} />
    ));
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });

    expect(button.style.position).toBe("absolute");
  });

  it("overflow가 이미 hidden인 경우 덮어쓰지 않음", () => {
    const { getByTestId } = render(() => (
      <button data-testid="btn" style={{ overflow: "hidden" }} use:ripple={true} />
    ));
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });

    expect(button.style.overflow).toBe("hidden");
  });

  it("pointerdown으로 ripple 요소 생성", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });

    const rippleEl = button.querySelector("span");
    expect(rippleEl).not.toBeNull();
    expect(rippleEl?.style.borderRadius).toBe("50%");
    expect(rippleEl?.style.position).toBe("absolute");
  });

  it("accessor false일 때 비활성화", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={false} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });

    const rippleEl = button.querySelector("span");
    expect(rippleEl).toBeNull();
  });

  it("연속 클릭 시 기존 ripple 정리", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    fireEvent.pointerDown(button, { clientX: 60, clientY: 60 });

    const rippleEls = button.querySelectorAll("span");
    expect(rippleEls.length).toBe(1);
  });

  it("동적 accessor 값 변경 반영", () => {
    const [enabled, setEnabled] = createSignal(false);
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={enabled()} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    expect(button.querySelector("span")).toBeNull();

    setEnabled(true);
    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    expect(button.querySelector("span")).not.toBeNull();
  });

  it("pointerup 시 opacity가 0으로 변경", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    const rippleEl = button.querySelector("span")!;
    expect(rippleEl).not.toBeNull();

    fireEvent.pointerUp(button);
    expect(rippleEl.style.opacity).toBe("0");
  });

  it("pointercancel 시 opacity가 0으로 변경", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    const rippleEl = button.querySelector("span")!;
    expect(rippleEl).not.toBeNull();

    fireEvent.pointerCancel(button);
    expect(rippleEl.style.opacity).toBe("0");
  });

  it("pointerleave 시 opacity가 0으로 변경", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    const rippleEl = button.querySelector("span")!;
    expect(rippleEl).not.toBeNull();

    fireEvent.pointerLeave(button);
    expect(rippleEl.style.opacity).toBe("0");
  });

  it("언마운트 시 이벤트 리스너 정리", () => {
    const removeEventListenerSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener");
    const { unmount } = render(() => <button data-testid="btn" use:ripple={true} />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("pointercancel", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("pointerleave", expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it("transitionend 이벤트로 ripple 요소 제거", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    const rippleEl = button.querySelector("span")!;
    expect(rippleEl).not.toBeNull();

    // opacity transitionend 이벤트 발생
    fireEvent(rippleEl, new TransitionEvent("transitionend", { propertyName: "opacity" }));

    expect(button.querySelector("span")).toBeNull();
  });

  it("transform transitionend 이벤트에서는 ripple을 제거하지 않음", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    const rippleEl = button.querySelector("span")!;
    expect(rippleEl).not.toBeNull();

    // transform transitionend 이벤트 발생
    fireEvent(rippleEl, new TransitionEvent("transitionend", { propertyName: "transform" }));

    // ripple 요소가 여전히 존재해야 함
    expect(button.querySelector("span")).not.toBeNull();
  });

  it("pointerdown 후 requestAnimationFrame에서 scale(1)로 애니메이션됨", () => {
    const { getByTestId } = render(() => <button data-testid="btn" use:ripple={true} />);
    const button = getByTestId("btn");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 50 });
    const rippleEl = button.querySelector("span")!;
    expect(rippleEl).not.toBeNull();
    expect(rippleEl.style.transform).toBe("scale(0)");

    // requestAnimationFrame 콜백 실행
    vi.advanceTimersToNextFrame();

    expect(rippleEl.style.transform).toBe("scale(1)");
  });

  it("중첩 요소에서 pointerdown 시 부모에 ripple 생성", () => {
    const { getByTestId } = render(() => (
      <button data-testid="btn" use:ripple={true}>
        <span data-testid="inner">내부 텍스트</span>
      </button>
    ));
    const button = getByTestId("btn");
    const inner = getByTestId("inner");

    // 내부 요소에서 이벤트 발생 (이벤트 버블링)
    fireEvent.pointerDown(inner, { clientX: 50, clientY: 50, bubbles: true });

    // 부모 버튼에 ripple이 생성되어야 함
    const rippleEl = button.querySelector("span:not([data-testid])");
    expect(rippleEl).not.toBeNull();
  });

  it("중첩된 ripple 요소가 있는 경우 각각 독립적으로 동작", () => {
    const { getByTestId } = render(() => (
      <div data-testid="outer" use:ripple={true}>
        <button data-testid="inner" use:ripple={true}>
          버튼
        </button>
      </div>
    ));
    const _outer = getByTestId("outer");
    const inner = getByTestId("inner");

    // 내부 버튼 클릭 (stopPropagation 없음 - 버블링됨)
    fireEvent.pointerDown(inner, { clientX: 50, clientY: 50 });

    const innerRipple = inner.querySelector("span");
    expect(innerRipple).not.toBeNull();
  });
});
