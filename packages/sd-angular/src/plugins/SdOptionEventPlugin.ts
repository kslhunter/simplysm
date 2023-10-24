import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";

@Injectable({providedIn: null})
export class SdOptionEventPlugin {
  manager!: EventManager;

  supports(eventName: string): boolean {
    return !eventName.startsWith("sd") && (eventName.includes(".capture") || eventName.includes(".outside"));
  }

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const capture = eventName.includes(".capture");
    const outside = eventName.includes(".outside");
    const realEventName = eventName.replace(/\.capture/, "").replace(/\.outside/, "") as keyof DocumentEventMap;

    const listener = (event: Event): void => {
      handler(event);
    };

    if (outside) {
      this.manager.getZone().runOutsideAngular(() => {
        element.addEventListener(realEventName, listener, capture);
      });
    }
    else {
      element.addEventListener(realEventName, listener, capture);
    }

    return (): void => {
      element.removeEventListener(realEventName, listener, capture);
    };
  }
}
