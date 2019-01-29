import {Injectable, OnDestroy} from "@angular/core";

@Injectable()
export class SdToastProvider implements OnDestroy {
  private readonly _containerEl: HTMLDivElement;

  public constructor() {
    this._containerEl = document.createElement("div");
    this._containerEl.classList.add("_sd-toast-container");
    document.body.appendChild(this._containerEl);
  }

  public ngOnDestroy(): void {
    this._containerEl.remove();
  }

  public info<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("info", message, progress) as any;
  }

  public success<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("success", message, progress) as any;
  }

  public warning<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("warning", message, progress) as any;
  }

  public danger<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("danger", message, progress) as any;
  }

  private _show<T extends boolean>(theme: "info" | "success" | "warning" | "danger", message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    const toastEl = document.createElement("div");
    toastEl.classList.add("_sd-toast");
    toastEl.classList.add("_sd-toast-" + theme);

    const toastBlockEl = document.createElement("div");
    toastBlockEl.classList.add("_sd-toast-block");
    toastEl.appendChild(toastBlockEl);

    const toastMessageEl = document.createElement("div");
    toastMessageEl.classList.add("_sd-toast-message");
    toastMessageEl.innerText = message;
    toastBlockEl.appendChild(toastMessageEl);

    if (progress) {
      const toastProgressEl = document.createElement("div");
      toastProgressEl.classList.add("_sd-toast-progress");
      toastBlockEl.appendChild(toastProgressEl);

      const toastProgressBarEl = document.createElement("div");
      toastProgressBarEl.classList.add("_sd-toast-progress-bar");
      toastProgressEl.appendChild(toastProgressBarEl);

      this._containerEl.prependChild(toastEl);

      return {
        progress: (percent: number) => {
          toastProgressBarEl.style.width = percent + "%";
          if (percent >= 100) {
            window.setTimeout(
              () => {
                toastEl.remove();
              },
              1000
            );
          }
        },
        message: (msg: string) => {
          toastMessageEl.innerText = msg;
        }
      } as any;
    }
    else {
      this._containerEl.prependChild(toastEl);

      window.setTimeout(
        () => {
          toastEl.remove();
        },
        5000
      );
    }

    return undefined as any;
  }
}

export interface ISdProgressToast {
  progress(percent: number): void;

  message(msg: string): void;
}
