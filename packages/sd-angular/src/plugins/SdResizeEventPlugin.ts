import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";
import {NeverEntryError} from "@simplysm/sd-core-common";

@Injectable()
export class SdResizeEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: Event): void => {
      event.preventDefault();

      this.manager.getZone().run(() => {
        handler(event);
      });
    };

    element.addEventListener("resize", listener);

    return (): void => {
      element.removeEventListener("resize", listener);
    };
  }

  public addGlobalEventListener(element: string, eventName: string, handler: Function): Function {
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
