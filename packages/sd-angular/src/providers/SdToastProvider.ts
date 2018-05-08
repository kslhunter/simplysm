import {Injectable} from "@angular/core";

@Injectable()
export class SdToastProvider {
  private readonly _containerEl: HTMLElement;

  public constructor() {
    this._containerEl = document.createElement("div");
    this._containerEl.classList.add("_sd-toast-container");
    document.body.appendChild(this._containerEl);
  }

  public show(message: string): void {
    this._show(undefined, message);
  }

  public primary(message: string): void {
    this._show("primary", message);
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

  private _show(theme: string | undefined, message: string): void {
    const existsToastEl = this._containerEl.find(item => item.getAttribute("sd-theme") === theme && item.getAttribute("sd-message") === message);
    if (existsToastEl) {
      clearTimeout(Number(existsToastEl.getAttribute("sd-timeout")));
      existsToastEl.remove();
    }

    const toastEl = document.createElement("div");
    toastEl.classList.add("_sd-toast");

    if (theme) {
      toastEl.setAttribute("sd-theme", theme);
    }
    toastEl.setAttribute("sd-message", message);
    toastEl.innerHTML = `<div>${message.replace(/\n/g, "<br/>")}</div>`;
    this._containerEl.prependChild(toastEl);

    toastEl.setAttribute("sd-timeout", window.setTimeout(
      () => toastEl.remove(),
      5000
    ).toString());
  }
}