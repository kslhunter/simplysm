import {Injectable} from "@angular/core";

@Injectable()
export class SdToastProvider {
  private readonly _containerEl: HTMLDivElement;

  public constructor() {
    this._containerEl = document.createElement("div");
    this._containerEl.classList.add("_sd-toast-container");
    document.body.appendChild(this._containerEl);
  }

  public info(message: string): void {
    this._show("info", message);
  }

  public success(message: string): void {
    this._show("success", message);
  }

  public warning(message: string): void {
    this._show("warning", message);
  }

  public danger(message: string): void {
    this._show("danger", message);
  }

  private _show(type: string, message: string): void {
    const toastEl = document.createElement("div");
    toastEl.classList.add("_sd-toast");
    toastEl.classList.add("_sd-toast-" + type);
    this._containerEl.prependChild(toastEl);

    const toastMessageEl = document.createElement("div");
    toastMessageEl.classList.add("_sd-toast-message");
    toastMessageEl.innerText = message;
    toastEl.appendChild(toastMessageEl);

    setTimeout(
      () => toastEl.remove(),
      3000
    );
  }
}