import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdIntersectionEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string): boolean {
    return eventName === "sdIntersection";
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (entry: ISdIntersectionEvent) => void,
  ): () => void {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries.single();
      if (!entry) return;

      handler({ entry });
    });
    observer.observe(element);

    return (): void => {
      observer.disconnect();
    };
  }
}

export interface ISdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
