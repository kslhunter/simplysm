import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";
import { SdModalProvider } from "../providers/SdModalProvider";

@Injectable({ providedIn: null })
export class SdRefreshCommandEventPlugin extends EventManagerPlugin {
  #sdModal = inject(SdModalProvider);

  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdRefreshCommand";
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: KeyboardEvent): void => {
      if ((event.key === "l" || event.key === "L") && event.ctrlKey && event.altKey && !event.shiftKey) {
        if (this.#sdModal.modalCount() > 0) {
          if ((event.target as Element).findParent("sd-modal") === element.findParent("sd-modal")) {
            event.preventDefault();
            event.stopPropagation();

            handler(event);
          }
        }
        else {
          event.preventDefault();
          event.stopPropagation();

          handler(event);
        }
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }
}
