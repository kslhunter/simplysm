import { Injectable } from "@angular/core";
import { EventManager } from "@angular/platform-browser";
import { NeverEntryError } from "@simplysm/sd-core/common";

@Injectable({ providedIn: null })
export class SdCopyEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === "Insert" && event.ctrlKey && event.altKey) {
        event.preventDefault();

        this.manager.getZone().run(() => {
          handler(event);
        });
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }

  public addGlobalEventListener(element: string, eventName: string, handler: Function): Function {
    if (element === "document") {
      const listener = (event: KeyboardEvent): void => {
        if (event.key === "Insert" && event.ctrlKey && event.altKey) {
          event.preventDefault();

          this.manager.getZone().run(() => {
            handler(event);
          });
        }
      };

      document.addEventListener("keydown", listener);

      return (): void => {
        document.removeEventListener("keydown", listener);
      };
    }

    throw new NeverEntryError();
  }

  public supports(eventName: string): boolean {
    return eventName === "sdCopy";
  }
}
