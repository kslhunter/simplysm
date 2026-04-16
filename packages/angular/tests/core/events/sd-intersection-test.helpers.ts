import { vi } from "vitest";

export let capturedCallback: ((entries: IntersectionObserverEntry[]) => void) | undefined;
export let mockObserve: ReturnType<typeof vi.fn>;
export let mockDisconnect: ReturnType<typeof vi.fn>;

export function stubIntersectionObserver() {
  capturedCallback = undefined;
  mockObserve = vi.fn();
  mockDisconnect = vi.fn();

  const MockIO = class {
    constructor(callback: IntersectionObserverCallback) {
      capturedCallback = callback as (entries: IntersectionObserverEntry[]) => void;
    }
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
    takeRecords = vi.fn().mockReturnValue([]);
    root = null;
    rootMargin = "0px";
    thresholds = [0];
  };
  vi.stubGlobal("IntersectionObserver", MockIO);
}

export function makeEntry(
  isIntersecting: boolean,
  target: Element,
): IntersectionObserverEntry {
  return {
    isIntersecting,
    intersectionRatio: isIntersecting ? 1 : 0,
    target,
    boundingClientRect: {} as DOMRectReadOnly,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    time: performance.now(),
  } as IntersectionObserverEntry;
}
