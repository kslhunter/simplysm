import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";
import {ResizeEvent} from "../../commons/ResizeEvent";
import {NotImplementError} from "@simplysm/sd-core";

@Injectable()
export class ResizeEventPlugin {
  public manager!: EventManager;

  public addEventListener(element: HTMLElement, eventName: string, handler: (event: ResizeEvent) => void): () => void {
    let prevWidth = element.offsetWidth;
    let prevHeight = element.offsetHeight;

    if (window["ResizeObserver"]) {
      const observer = new window["ResizeObserver"](() => {
        const dimensions: string[] = [];

        if (prevWidth !== element.offsetWidth) {
          dimensions.push("width");
          prevWidth = element.offsetWidth;
        }
        if (prevHeight !== element.offsetHeight) {
          dimensions.push("height");
          prevHeight = element.offsetHeight;
        }

        if (dimensions.length > 0) {
          const event = new CustomEvent("resize", {detail: {dimensions}}) as ResizeEvent;
          this.manager.getZone().run(() => {
            handler(event as any);
          });
        }
      });
      observer.observe(element);

      return () => observer.disconnect();
    }
    else {
      const timeout = window.setInterval(() => {
        const dimensions: string[] = [];

        if (prevWidth !== element.offsetWidth) {
          dimensions.push("width");
          prevWidth = element.offsetWidth;
        }
        if (prevHeight !== element.offsetHeight) {
          dimensions.push("height");
          prevHeight = element.offsetHeight;
        }

        if (dimensions.length > 0) {
          const event = new CustomEvent("resize", {detail: {dimensions}}) as ResizeEvent;
          this.manager.getZone().run(() => {
            handler(event as any);
          });
        }
      }, 1000);

      return () => {
        window.clearTimeout(timeout);
      };
    }
  }

  public addGlobalEventListener(element: string, eventName: string, handler: Function): Function {
    if (element === "window") {
      const listener = (event: Event) => {
        handler(event);
      };

      window.addEventListener(eventName, listener);

      return () => {
        window.removeEventListener(eventName, listener);
      };
    }

    throw new NotImplementError();
  }

  public supports(eventName: string): boolean {
    return eventName === "resize";
  }
}
