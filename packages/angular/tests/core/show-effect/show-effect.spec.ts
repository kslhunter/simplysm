import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ElementRef, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { setupRevealOnShow } from "../../../src/core/show-effect/setupRevealOnShow";

describe("Feature 1.6 Slice 3: ShowEffect 디렉티브", () => {
  let el: HTMLDivElement;
  let mockObserverCallback: IntersectionObserverCallback;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);

    mockObserve = vi.fn();
    mockDisconnect = vi.fn();

    const MockIO = class {
      constructor(callback: IntersectionObserverCallback) {
        mockObserverCallback = callback;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn().mockReturnValue([]);
      root = null;
      rootMargin = "";
      thresholds = [0];
    };
    vi.stubGlobal("IntersectionObserver", MockIO);

    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: new ElementRef(el) }],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    el.remove();
  });

  function triggerIntersection(isIntersecting: boolean): void {
    mockObserverCallback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  }

  it("초기 상태: opacity 0, type=t2b → translateY(-1em)", () => {
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow();
    });
    TestBed.flushEffects();

    expect(el.style.opacity).toBe("0");
    expect(el.style.transform).toBe("translateY(-1em)");
  });

  it("초기 상태: type=l2r → translateX(-1em)", () => {
    const type = signal<"l2r" | "t2b">("l2r");
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow(() => ({ type: type(), enabled: true }));
    });
    TestBed.flushEffects();

    expect(el.style.transform).toBe("translateX(-1em)");
  });

  it("viewport 진입 + enabled=true → opacity 1, transform none", () => {
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow();
    });
    TestBed.flushEffects();

    triggerIntersection(true);

    expect(el.style.opacity).toBe("1");
    expect(el.style.transform).toBe("none");
  });

  it("viewport 진입 + enabled=false → transition 없이 즉시 표시", () => {
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow(() => ({ enabled: false }));
    });
    TestBed.flushEffects();

    triggerIntersection(true);

    expect(el.style.opacity).toBe("1");
    expect(el.style.transform).toBe("");
    expect(el.style.transitionDuration).toBe("");
  });

  it("viewport 미진입(isIntersecting=false) → 초기 상태 유지", () => {
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow();
    });
    TestBed.flushEffects();

    triggerIntersection(false);

    expect(el.style.opacity).toBe("0");
  });

  it("기본값: type=t2b, enabled=true", () => {
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow();
    });
    TestBed.flushEffects();

    expect(el.style.transform).toBe("translateY(-1em)");

    triggerIntersection(true);
    expect(el.style.transitionProperty).toBe("opacity, transform");
  });

  it("IntersectionObserver가 요소를 관찰한다", () => {
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow();
    });
    TestBed.flushEffects();

    expect(mockObserve).toHaveBeenCalledWith(el);
  });

  it("type이 t2b→l2r로 변경되면 effect가 재실행되어 transform이 갱신된다", () => {
    const type = signal<"l2r" | "t2b">("t2b");
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow(() => ({ type: type() }));
    });
    TestBed.flushEffects();

    expect(el.style.transform).toBe("translateY(-1em)");

    // type 변경
    type.set("l2r");
    TestBed.flushEffects();

    expect(el.style.transform).toBe("translateX(-1em)");
    // observer가 재생성되어 다시 observe 호출
    expect(mockObserve).toHaveBeenCalledTimes(2);
  });

  it("enabled만 변경되면 effect는 재실행되지 않는다", () => {
    const enabled = signal(true);
    const type = signal<"l2r" | "t2b">("t2b");
    TestBed.runInInjectionContext(() => {
      setupRevealOnShow(() => ({ type: type(), enabled: enabled() }));
    });
    TestBed.flushEffects();

    const initialObserveCount = mockObserve.mock.calls.length;

    // enabled만 변경
    enabled.set(false);
    TestBed.flushEffects();

    // effect가 재실행되지 않으므로 observe 횟수 동일
    expect(mockObserve).toHaveBeenCalledTimes(initialObserveCount);
  });
});
