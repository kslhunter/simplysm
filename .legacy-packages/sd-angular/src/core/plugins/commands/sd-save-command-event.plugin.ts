import { inject, Injectable } from "@angular/core";
import { EventManagerPlugin } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";
import { SdModalProvider } from "../../../ui/overlay/modal/sd-modal.provider";

@Injectable({ providedIn: null })
export class SdSaveCommandEventPlugin extends EventManagerPlugin {
  private readonly _sdModal = inject(SdModalProvider);

  constructor() {
    super(inject(DOCUMENT));
  }

  override supports(eventName: string) {
    return eventName === "sdSaveCommand";
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (event: Event) => void,
  ): () => void {
    // 모달이 안 열려 있을 때, event.target의 parent에 element가 있으면,
    // 모달이 열려있고, 포커싱된 모달이 나의 Parent일때,

    const listener = (event: KeyboardEvent): void => {
      if (
        (event.key === "s" || event.key === "S") &&
        event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (this._sdModal.modalCount() > 0) {
          if ((event.target as Element).findParent("sd-modal") === element.findParent("sd-modal")) {
            event.preventDefault();
            event.stopPropagation();

            handler(event);
          }
        } else {
          event.preventDefault();
          event.stopPropagation();

          handler(event);
        }
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }
}
