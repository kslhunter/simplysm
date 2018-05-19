import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";

@Injectable()
export class ResizeEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: ResizeEvent) => void): () => void {
    let prevWidth = element.offsetWidth;
    let prevHeight = element.offsetHeight;

    const observer = new window["ResizeObserver"]((entries: any[]) => {
      const dimensions = [];
      if (prevWidth !== element.offsetWidth) {
        dimensions.push("width");
        prevWidth = element.offsetWidth;
      }
      if (prevHeight !== element.offsetHeight) {
        dimensions.push("height");
        prevHeight = element.offsetHeight;
      }

      if (dimensions.length > 0) {
        const event = new CustomEvent("resize");
        event["dimensions"] = dimensions;
        this.manager.getZone().run(() => handler(event as any));
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }

  public supports(eventName: string): boolean {
    return eventName === "resize";
  }
}

// tslint:disable-next-line:interface-name
export interface ResizeEvent extends CustomEvent {
  dimensions: ("width" | "height")[];
}