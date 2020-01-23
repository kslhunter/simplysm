import {ErrorHandler, Injectable} from "@angular/core";
import {Logger} from "@simplysm/sd-core-browser";

@Injectable()
export class SdAngularGlobalErrorHandler implements ErrorHandler {
  private readonly _logger = Logger.get(["simplysm", "sd-angular"]);

  public handleError(error: any): void {
    const err: Error = error.rejection ? error.rejection : error;

    const divEl = document.createElement("div");
    divEl.style.position = "fixed";
    divEl.style.top = "0";
    divEl.style.left = "0";
    divEl.style.width = "100%";
    divEl.style.height = "100%";
    divEl.style.color = "white";
    divEl.style.background = "rgba(0,0,0,.6)";
    divEl.style.zIndex = "9999";
    divEl.style.overflow = "auto";
    divEl.style.padding = "4px";

    divEl.innerHTML = `<pre style="font-size: 12px; font-family: 'D2Coding', monospace; line-height: 1.4em;">${err.stack}</pre>`;

    window.document.body.appendChild(divEl);

    this._logger.error(err);
  }
}
