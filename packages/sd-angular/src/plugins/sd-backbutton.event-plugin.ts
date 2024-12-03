import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdBackbuttonEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdBackbutton";
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();

      handler(event);
    };

    const listener2 = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft" && !event.ctrlKey && event.altKey && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();

        handler(event);
      }
    };

    document.addEventListener("backbutton", listener);
    document.addEventListener("keydown", listener2);

    return (): void => {
      document.removeEventListener("backbutton", listener);
      document.removeEventListener("keydown", listener2);
    };
  }
}
