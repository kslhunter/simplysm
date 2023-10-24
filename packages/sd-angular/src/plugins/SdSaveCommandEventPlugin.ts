import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";

@Injectable({providedIn: null})
export class SdSaveCommandEventPlugin {
  public manager!: EventManager;

  supports(eventName: string) {
    return eventName === "sdSaveCommand";
  }

  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: KeyboardEvent): void => {
      if ((event.key === "s" || event.key === "S") && event.ctrlKey && !event.altKey && !event.shiftKey) {
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
