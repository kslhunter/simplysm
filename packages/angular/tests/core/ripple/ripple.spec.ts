import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ElementRef, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { setupRipple } from "../../../src/core/ripple/setupRipple";

describe("Feature 1.6 Slice 2: Ripple 디렉티브", () => {
  let el: HTMLDivElement;
  let enabled: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    el = document.createElement("div");
    Object.assign(el.style, { width: "100px", height: "100px" });
    document.body.appendChild(el);
    enabled = signal(true);

    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: new ElementRef(el) }],
    });

    TestBed.runInInjectionContext(() => {
      setupRipple(() => enabled());
    });
    TestBed.flushEffects();
  });

  afterEach(() => {
    el.remove();
  });

  it("host 요소에 position:relative와 overflow:hidden이 설정된다", () => {
    expect(el.style.position).toBe("relative");
    expect(el.style.overflow).toBe("hidden");
  });

  it("enabled + pointerdown → 물결 자식 요소가 생성된다", () => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, bubbles: true }),
    );

    const ripple = el.querySelector("div");
    expect(ripple).not.toBeNull();
    expect(ripple!.style.borderRadius).toBe("100%");
  });

  it("disabled + pointerdown → 물결이 생성되지 않는다", () => {
    enabled.set(false);

    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, bubbles: true }),
    );

    const ripple = el.querySelector("div");
    expect(ripple).toBeNull();
  });

  it("pointerup → 물결 opacity가 0이 된다", () => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, bubbles: true }),
    );
    const ripple = el.querySelector("div")!;

    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    expect(ripple.style.opacity).toBe("0");
  });

  it("pointercancel → 물결 opacity가 0이 된다", () => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, bubbles: true }),
    );
    const ripple = el.querySelector("div")!;

    el.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));

    expect(ripple.style.opacity).toBe("0");
  });

  it("pointerleave → 물결 opacity가 0이 된다", () => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, bubbles: true }),
    );
    const ripple = el.querySelector("div")!;

    el.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));

    expect(ripple.style.opacity).toBe("0");
  });

  it("연속 pointerdown → 이전 물결이 제거되고 새 물결이 생성된다", () => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 30, clientY: 30, bubbles: true }),
    );
    const firstRipple = el.querySelector("div")!;

    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 70, clientY: 70, bubbles: true }),
    );

    expect(firstRipple.parentElement).toBeNull();
    const newRipple = el.querySelector("div");
    expect(newRipple).not.toBeNull();
  });
});
