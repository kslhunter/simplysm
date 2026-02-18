import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdOptionEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string): boolean {
    if (!/\.(capture|passive|once)/.test(eventName)) return false;

    const realEventName = eventName.replace(/\.(capture|passive|once)/g, "");

    return (
      `on${realEventName}` in window ||
      `on${realEventName}` in document ||
      `on${realEventName}` in HTMLElement.prototype
    );
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (event: Event) => void,
  ): () => void {
    const options: AddEventListenerOptions = {
      capture: eventName.includes(".capture"),
      passive: eventName.includes(".passive"),
      once: eventName.includes(".once"),
    };

    const realEventName = eventName.replace(
      /\.(capture|passive|once)/g,
      "",
    ) as keyof HTMLElementEventMap;

    element.addEventListener(realEventName, handler, options);

    return () => element.removeEventListener(realEventName, handler, options);
  }
}
