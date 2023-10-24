import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";

@Injectable({providedIn: null})
export class SdRefreshCommandEventPlugin {
  manager!: EventManager;

  supports(eventName: string) {
    return eventName === "sdDataRefreshCommand";
  }

  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: KeyboardEvent): void => {
      if ((event.key === "l" || event.key === "L") && event.ctrlKey && event.altKey && !event.shiftKey) {
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
