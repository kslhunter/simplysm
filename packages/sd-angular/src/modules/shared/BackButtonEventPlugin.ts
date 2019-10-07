import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";

@Injectable()
export class BackButtonEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: CustomEvent) => void): () => void {
    const onBackbutton = () => {
      this.manager.getZone().run(() => {
        const event = new CustomEvent("backbutton");
        handler(event as any);
      });
    };

    document.addEventListener("backbutton", onBackbutton, false);

    return () => {
      document.removeEventListener("backbutton", onBackbutton);
    };
  }

  public supports(eventName: string): boolean {
    return eventName === "backbutton";
  }
}
