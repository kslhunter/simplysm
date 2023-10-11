import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";
import {NeverEntryError} from "@simplysm/sd-core-common";

@Injectable({providedIn: null})
export class SdResizeEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (entry: ResizeObserverEntry) => void): () => void {
    const observer = new ResizeObserver((entries) => {
      const entry = entries.single();
      if (!entry) return;

      this.manager.getZone().run(() => {
        handler(entry);
      });
    });
    observer.observe(element);

    return (): void => {
      observer.disconnect();
    };
  }

  public addGlobalEventListener(element: string, eventName: string, handler: (event: Event) => void): () => void {
    if (element === "window") {
      const listener = (event: Event): void => {
        this.manager.getZone().run(() => {
          handler(event);
        });
      };

      window.addEventListener("resize", listener);

      return (): void => {
        window.removeEventListener("resize", listener);
      };
    }

    throw new NeverEntryError();
  }

  public supports(eventName: string): boolean {
    return eventName === "sdResize";
  }
}
