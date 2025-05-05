import { ApplicationRef, ErrorHandler, inject, Injectable, NgModuleRef } from "@angular/core";
import { SdSystemLogProvider } from "../providers/sd-system-log.provider";

@Injectable({ providedIn: null })
export class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  private _ngModuleRef = inject(NgModuleRef);
  private _systemLog = inject(SdSystemLogProvider);

  handleError(error: any) {
    const err: Error = error.rejection !== undefined ? error.rejection : error;

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

    divEl.innerHTML = `<pre style="font-size: 12px; font-family: monospace; line-height: 1.4em;">${err.stack
    ?? ""}</pre>`;

    try {
      const appRef = this._ngModuleRef.injector.get<ApplicationRef>(ApplicationRef);
      appRef.destroy();

      // appRef["_views"][0]["rootNodes"][0].appendChild(divEl);
      document.body.append(divEl);
      divEl.onclick = () => {
        location.hash = "/";
        location.reload();
      };

      this._systemLog.writeAsync("error", err.stack).catch(() => {
      });
    }
    catch {
    }
  }
}
