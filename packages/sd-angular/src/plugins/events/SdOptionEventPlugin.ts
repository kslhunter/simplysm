import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdOptionEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string): boolean {
    return !eventName.startsWith("sd") && eventName.includes(".capture");
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const capture = eventName.includes(".capture");
    const realEventName = eventName.replace(/\.capture/, "") as keyof DocumentEventMap;

    const listener = (event: Event): void => {
      handler(event);
    };

    element.addEventListener(realEventName, listener, capture);

    return (): void => {
      element.removeEventListener(realEventName, listener, capture);
    };
  }
}
