import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";
import {NeverEntryError} from "@simplysm/sd-core-common";

@Injectable()
export class SdMutationEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    const listener = (event: Event): void => {
      event.preventDefault();

      this.manager.getZone().run(() => {
        handler(event);
      });
    };

    element.addEventListener("mutation", listener);

    return (): void => {
      element.removeEventListener("mutation", listener);
    };
  }

  public addGlobalEventListener(element: string, eventName: string, handler: Function): Function {
    if (element === "window") {
      const listener = (event: Event): void => {
        this.manager.getZone().run(() => {
          handler(event);
        });
      };

      window.addEventListener("mutation", listener);

      return (): void => {
        window.removeEventListener("mutation", listener);
      };
    }

    throw new NeverEntryError();
  }

  public supports(eventName: string): boolean {
    return eventName === "sdMutation";
  }
}
