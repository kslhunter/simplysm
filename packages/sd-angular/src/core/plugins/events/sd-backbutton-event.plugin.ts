import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

/** @deprecated */
@Injectable({ providedIn: null })
export class SdBackbuttonEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdBackbutton";
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (event: Event) => void,
  ): () => void {
    const listener = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();

      handler(event);
    };

    const listener2 = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft" && !event.ctrlKey && event.altKey && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();

        handler(event);
      }
    };

    // Capacitor App 플러그인 리스너 핸들
    let capacitorListenerHandle: { remove: () => Promise<void> } | undefined;

    // Capacitor 체크 및 리스너 등록
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        capacitorListenerHandle = await App.addListener("backButton", () => {
          handler(new Event("sdBackbutton"));
        });
      } catch {
        // @capacitor/app이 없으면 Cordova 방식 사용
        document.addEventListener("backbutton", listener);
      }
    })();

    document.addEventListener("keydown", listener2);

    return (): void => {
      if (capacitorListenerHandle) {
        void capacitorListenerHandle.remove();
      } else {
        document.removeEventListener("backbutton", listener);
      }
      document.removeEventListener("keydown", listener2);
    };
  }
}
