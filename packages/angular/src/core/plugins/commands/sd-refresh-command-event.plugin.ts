import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";
import { findTopOpenModalEl } from "./findTopOpenModalEl";

@Injectable({ providedIn: null })
export class SdRefreshCommandEventPlugin extends EventManagerPlugin {
  private readonly _document = inject(DOCUMENT);

  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdRefreshCommand";
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (event: Event) => void,
  ): () => void {
    const listener = (event: KeyboardEvent): void => {
      if (
        (event.key === "l" || event.key === "L") &&
        event.ctrlKey &&
        event.altKey &&
        !event.shiftKey
      ) {
        const topModal = findTopOpenModalEl(this._document);
        if (topModal != null && !topModal.contains(element)) return;

        event.preventDefault();
        event.stopPropagation();
        handler(event);
      }
    };

    this._document.addEventListener("keydown", listener);

    return (): void => {
      this._document.removeEventListener("keydown", listener);
    };
  }
}
