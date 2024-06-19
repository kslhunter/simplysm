import {inject, Injectable} from "@angular/core";
import {EventManagerPlugin} from "@angular/platform-browser";
import {DOCUMENT} from "@angular/common";

@Injectable({providedIn: null})
export class SdInsertCommandEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string): boolean {
    return eventName === "sdInsertCommand";
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === "Insert" && event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();

        this.manager.getZone().run(() => {
          handler(event);
        });
      }
    };

    this.manager.getZone().runOutsideAngular(() => {
      document.addEventListener("keydown", listener);
    });

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }
}
