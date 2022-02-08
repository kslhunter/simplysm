import { Injectable } from "@angular/core";
import { EventManager } from "@angular/platform-browser";
import { NeverEntryError } from "@simplysm/sd-core-common";

@Injectable({ providedIn: null })
export class SdPasteEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: ClipboardEvent): void => {
      this.manager.getZone().run(() => {
        handler(event);
      });
    };

    document.addEventListener("paste", listener);

    return (): void => {
      document.removeEventListener("paste", listener);
    };
  }

  public addGlobalEventListener(element: string, eventName: string, handler: Function): Function {
    if (element === "document") {
      const listener = (event: ClipboardEvent): void => {
        this.manager.getZone().run(() => {
          handler(event);
        });
      };

      document.addEventListener("paste", listener);

      return (): void => {
        document.removeEventListener("paste", listener);
      };
    }

    throw new NeverEntryError();
  }

  public supports(eventName: string): boolean {
    return eventName === "sdPaste";
  }
}
