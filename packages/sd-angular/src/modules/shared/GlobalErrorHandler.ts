import {ApplicationRef, ErrorHandler, Injectable, NgModuleRef} from "@angular/core";
import {SdLogProvider} from "./SdLogProvider";
import {DateTime} from "@simplysm/sd-core";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private _isProcessing = false;

  public constructor(private readonly _log: SdLogProvider,
                     private readonly _ngModule: NgModuleRef<any>) {
  }

  public handleError(error: any): void {
    if (this._isProcessing) {
      return;
    }
    this._isProcessing = true;

    const err: Error = error.rejection ? error.rejection : error;

    const appRef = this._ngModule.injector.get(ApplicationRef);

    // 새 엘리먼트 넣기
    const prevEls = appRef.components.map(cmp => cmp.location.nativeElement).filterExists();

    setTimeout(async () => {
      if (process.env.NODE_ENV === "production") {
        const isUserSendFnSuccess = await this._log.write({stack: err.stack, type: "error"});

        for (const prevEl of prevEls) {
          const newEl = document.createElement(prevEl.tagName);
          if (process.env.NODE_ENV === "production") {
            (newEl as HTMLElement).innerHTML = `
처리되지않은 오류가 발생하였습니다.<br/>
자세한 사항은 아래 정보와 함께 관리자에게 문의하세요.<br/>
--<br/>
발생일시:<br/>
${new DateTime().toFormatString("yyyy-MM-dd HH:mm:ss.fff")}<br/>
오류메시지:<br/>
<pre>${isUserSendFnSuccess ? err.message : err.stack}</pre>`;
          }

          prevEl.parentNode.insertBefore(newEl, prevEl);
        }

        try {
          this._ngModule.destroy();
        }
        catch {
        }
      }
      else {
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

        divEl.innerHTML = `<pre style="font-size: 12px; font-family: 'D2Coding', monospace; line-height: 1.2em;">${err.stack}</pre>`;
        prevEls[0].appendChild(divEl);

        await this._log.write({stack: err.stack, type: "error"});
      }
    });

    throw err;
  }
}