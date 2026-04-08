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
    handler: (entry: SdResizeEvent) => void,
  ): () => void {
    let prevWidth = 0;
    let prevHeight = 0;

    let animationFrameId: number | undefined;
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(() => {
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
    });

    resizeObserver.observe(element);

    return (): void => {
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
    };
  }
}

export interface SdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: Element;
  contentRect: DOMRectReadOnly;
}
