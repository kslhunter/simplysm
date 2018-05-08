import {Injectable} from "@angular/core";

@Injectable()
export class SdBusyProvider {
  private readonly _busyEl: HTMLElement;
  private _count = 0;
  private _prevFocusedEl: HTMLElement | undefined;

  public constructor() {
    this._busyEl = document.createElement("div");
    this._busyEl.classList.add("_sd-busy");
    this._busyEl.innerHTML = "<div><div></div><div></div></div>";
    document.body.appendChild(this._busyEl);
  }

  public async show(): Promise<void> {
    this._count++;
    if (this._count > 0) {
      document.addEventListener("focus", this._prevent.bind(this), true);
      this._prevFocusedEl = document.activeElement as HTMLElement | undefined;
      if (this._prevFocusedEl) {
        this._prevFocusedEl.blur();
      }
      await new Promise<void>(resolve => {
        this._busyEl.setAttribute("sd-open", "true");
        resolve();
      });
    }
  }

  public hide(): void {
    this._count--;
    if (this._count < 1) {
      this._busyEl.removeAttribute("sd-open");
      document.removeEventListener("focus", this._prevent.bind(this), true);
      if (this._prevFocusedEl) {
        this._prevFocusedEl.focus();
      }
    }
  }

  private _prevent(e: Event): void {
    e.preventDefault();
  }
}
