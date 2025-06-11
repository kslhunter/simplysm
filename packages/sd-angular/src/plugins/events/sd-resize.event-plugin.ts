import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdResizeEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string): boolean {
    return eventName === "sdResize";
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (entry: ISdResizeEvent) => void,
  ): () => void {
    let prevWidth = 0;
    let prevHeight = 0;

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;

      const contentRect = entry.boundingClientRect;

      const heightChanged = contentRect.height !== prevHeight;
      const widthChanged = contentRect.width !== prevWidth;
      prevHeight = contentRect.height;
      prevWidth = contentRect.width;

      handler({
        heightChanged,
        widthChanged,
        target: entry.target,
        contentRect: entry.boundingClientRect,
      });

      intersectionObserver.unobserve(entry.target);
    });
    intersectionObserver.observe(element);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const contentRect = entry.contentRect;

      const heightChanged = contentRect.height !== prevHeight;
      const widthChanged = contentRect.width !== prevWidth;
      prevHeight = contentRect.height;
      prevWidth = contentRect.width;

      handler({
        heightChanged,
        widthChanged,
        target: entry.target,
        contentRect: entry.contentRect,
      });
    });
    resizeObserver.observe(element);

    return (): void => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
    };
  }
}

export interface ISdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: Element;
  contentRect: DOMRectReadOnly;
}
