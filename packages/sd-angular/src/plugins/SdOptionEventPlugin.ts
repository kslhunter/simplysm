import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdOptionEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string): boolean {
    return !eventName.startsWith("sd") && (eventName.includes(".capture") || eventName.includes(".outside"));
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const capture = eventName.includes(".capture");
    const outside = eventName.includes(".outside");
    const realEventName = eventName.replace(/\.capture/, "").replace(/\.outside/, "") as keyof DocumentEventMap;

    const listener = (event: Event): void => {
      handler(event);
    };

    if (outside) {
      this.manager.getZone().runOutsideAngular(() => {
        element.addEventListener(realEventName, listener, capture);
      });
    } else {
      element.addEventListener(realEventName, listener, capture);
    }

    return (): void => {
      element.removeEventListener(realEventName, listener, capture);
    };
  }
}
