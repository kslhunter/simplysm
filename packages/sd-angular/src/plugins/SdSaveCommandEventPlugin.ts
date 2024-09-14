import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdSaveCommandEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdSaveCommand";
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: KeyboardEvent): void => {
      if ((event.key === "s" || event.key === "S") && event.ctrlKey && !event.altKey && !event.shiftKey) {
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
