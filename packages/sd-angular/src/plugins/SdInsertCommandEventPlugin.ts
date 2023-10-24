import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";

@Injectable({providedIn: null})
export class SdInsertCommandEventPlugin {
  manager!: EventManager;

  supports(eventName: string): boolean {
    return eventName === "sdInsertCommand";
  }

  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
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
