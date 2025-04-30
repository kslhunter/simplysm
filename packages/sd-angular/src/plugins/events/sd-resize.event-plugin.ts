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

    const observer = new ResizeObserver((entries) => {
      const entry = entries.single();
      if (!entry) return;

      const contentRect = entry.contentRect;

      const heightChanged = contentRect.height !== prevHeight;
      const widthChanged = contentRect.width !== prevWidth;
      prevHeight = contentRect.height;
      prevWidth = contentRect.width;

      handler({ heightChanged, widthChanged, target: element, entry });
    });
    observer.observe(element);

    return (): void => {
      observer.disconnect();
    };
  }
}

export interface ISdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: HTMLElement,
  entry?: ResizeObserverEntry;
}
