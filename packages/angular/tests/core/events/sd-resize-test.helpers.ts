import { vi } from "vitest";

export let capturedCallback: ((entries: ResizeObserverEntry[]) => void) | undefined;
export let mockObserve: ReturnType<typeof vi.fn>;
export let mockDisconnect: ReturnType<typeof vi.fn>;

export function stubResizeObserver() {
  capturedCallback = undefined;
  mockObserve = vi.fn();
  mockDisconnect = vi.fn();

  const MockRO = class {
    constructor(callback: ResizeObserverCallback) {
      capturedCallback = callback as (entries: ResizeObserverEntry[]) => void;
    }
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
  };
  vi.stubGlobal("ResizeObserver", MockRO);
}

export function makeEntry(width: number, height: number, target: Element): ResizeObserverEntry {
  return {
    contentRect: {
      width, height, x: 0, y: 0, top: 0, left: 0, right: width, bottom: height,
      toJSON: () => ({}),
    } as DOMRectReadOnly,
    target,
    borderBoxSize: [],
    contentBoxSize: [],
    devicePixelContentBoxSize: [],
  } as ResizeObserverEntry;
}

export function waitForRaf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
