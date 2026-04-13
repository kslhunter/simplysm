import "@simplysm/core-browser";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ElementRef, Renderer2, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { setupInvalid } from "../../../src/core/validation/setupInvalid";

describe("Feature 1.6 Slice 4: Invalid 디렉티브", () => {
  let hostEl: HTMLDivElement;
  let formEl: HTMLFormElement;
  let invalidMessage: ReturnType<typeof signal<string>>;

  beforeEach(() => {
    formEl = document.createElement("form");
    hostEl = document.createElement("div");
    formEl.appendChild(hostEl);
    document.body.appendChild(formEl);

    invalidMessage = signal("");

    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: new ElementRef(hostEl) },
        { provide: Renderer2, useValue: createRenderer() },
      ],
    });

    TestBed.runInInjectionContext(() => {
      setupInvalid(() => invalidMessage());
    });
    TestBed.flushEffects();
  });

  afterEach(() => {
    formEl.remove();
  });

  function getIndicator(): HTMLDivElement | null {
    return hostEl.querySelector("div");
  }

  function getHiddenInput(): HTMLInputElement | null {
    return hostEl.querySelector("input.sd-invalid-input");
  }

  it("host 요소에 position:relative가 설정된다", () => {
    expect(hostEl.style.position).toBe("relative");
  });

  it("invalidMessage가 빈 문자열 → 인디케이터 숨김", () => {
    expect(getIndicator()!.style.display).toBe("none");
  });

  it("invalidMessage가 비어있지 않음 → 인디케이터 표시", () => {
    invalidMessage.set("필수 항목입니다");
    TestBed.flushEffects();

    expect(getIndicator()!.style.display).toBe("block");
  });

  it("invalidMessage를 다시 비움 → 인디케이터 숨김", () => {
    invalidMessage.set("에러");
    TestBed.flushEffects();
    expect(getIndicator()!.style.display).toBe("block");

    invalidMessage.set("");
    TestBed.flushEffects();
    expect(getIndicator()!.style.display).toBe("none");
  });

  it("form submit → validity 갱신 후 인디케이터 상태 반영", () => {
    invalidMessage.set("에러 메시지");
    formEl.dispatchEvent(new Event("submit", { cancelable: true }));
    TestBed.flushEffects();

    expect(getIndicator()!.style.display).toBe("block");
  });

  it("hidden input focus → host의 tabbable 요소로 포커스 이동", () => {
    const button = document.createElement("button");
    button.textContent = "Test";
    hostEl.insertBefore(button, getHiddenInput());

    getHiddenInput()!.focus();

    expect(document.activeElement).toBe(button);
  });
});

function createRenderer(): Renderer2 {
  return {
    createElement(name: string): HTMLElement {
      return document.createElement(name);
    },
    appendChild(parent: HTMLElement, newChild: HTMLElement): void {
      parent.appendChild(newChild);
    },
    insertBefore(parent: HTMLElement, newChild: HTMLElement, refChild: HTMLElement | null): void {
      parent.insertBefore(newChild, refChild);
    },
    setStyle(el: HTMLElement, style: string, value: string): void {
      el.style.setProperty(style, value);
    },
    listen(target: HTMLElement, eventName: string, callback: (event: Event) => void): () => void {
      target.addEventListener(eventName, callback);
      return () => target.removeEventListener(eventName, callback);
    },
  } as unknown as Renderer2;
}
