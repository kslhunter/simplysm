import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdRefreshCommandEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdRefreshCommand";
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: KeyboardEvent): void => {
      if ((event.key === "l" || event.key === "L") && event.ctrlKey && event.altKey && !event.shiftKey) {
        event.preventDefault();

        handler(event);
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }
}
