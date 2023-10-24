import {Injectable} from "@angular/core";
import {EventManager} from "@angular/platform-browser";

@Injectable({providedIn: null})
export class SdResizeEventPlugin {
  manager!: EventManager;

  supports(eventName: string): boolean {
    return eventName === "sdResize" || eventName === "sdResize.outside";
  }

  addEventListener(element: HTMLElement, eventName: string, handler: (entry: ISdResizeEvent) => void): () => void {
    const outside = eventName.includes(".outside");

    let prevWidth = 0;
    let prevHeight = 0;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.single();
      if (!entry) return;

      const contentRect = entry.contentRect;

      const heightChanged = contentRect.height !== prevHeight;
      const widthChanged = contentRect.width !== prevWidth;
      prevHeight = contentRect.height;
      prevWidth = contentRect.width;

      if (outside) {
        handler({heightChanged, widthChanged, entry});
      }
      else {
        this.manager.getZone().run(() => {
          handler({heightChanged, widthChanged, entry});
        });
      }
    });
    observer.observe(element);

    return (): void => {
      observer.disconnect();
    };
  }
}

export interface ISdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  entry: ResizeObserverEntry;
}