import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";

@Injectable({ providedIn: null })
export class SdSaveCommandEventPlugin extends EventManagerPlugin {
  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdSaveCommand";
  }

  override addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void {
    // 모달이 안 열려 있을 때, event.target의 parent에 element가 있으면,
    // 모달이 열려있고, 포커싱된 모달이 나의 Parent일때,

    const listener = (event: KeyboardEvent): void => {
      if ((event.key === "s" || event.key === "S") && event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();

        handler(event);
      }
    };

    element.addEventListener("keydown", listener);

    return (): void => {
      element.removeEventListener("keydown", listener);
    };
  }
}
