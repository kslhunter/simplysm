import { Injectable } from "@angular/core";
import { EventManager } from "@angular/platform-browser";
import { NeverEntryError } from "@simplysm/sd-core-common";

@Injectable({ providedIn: null })
export class SdAndroidBackbuttonEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: Event): void => {
      this.manager.getZone().run(() => {
        handler(event);
      });
    };

    document.addEventListener("backbutton", listener);

    return (): void => {
      document.removeEventListener("backbutton", listener);
    };
  }

  public addGlobalEventListener(element: string, eventName: string, handler: Function): Function {
    if (element === "document") {
      const listener = (event: Event): void => {
        this.manager.getZone().run(() => {
          handler(event);
        });
      };

      document.addEventListener("backbutton", listener);

      return (): void => {
        document.removeEventListener("backbutton", listener);
      };
    }

    throw new NeverEntryError();
  }

  public supports(eventName: string): boolean {
    return eventName === "sdBackbutton";
  }
}
