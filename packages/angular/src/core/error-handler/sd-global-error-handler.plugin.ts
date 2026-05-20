import {
  ApplicationRef,
  EnvironmentInjector,
  ErrorHandler,
  inject,
  Injectable,
  isDevMode,
} from "@angular/core";
import consola from "consola";
import { SdSystemLogProvider } from "../config/sd-system-log.provider";

const logger = consola.withTag("angular:error-handler");

@Injectable({ providedIn: null })
export class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  private readonly _envInjector = inject(EnvironmentInjector);
  private readonly _sdSystemLog = inject(SdSystemLogProvider);
  private _hasDisplayedError = false;

  handleError(event: any) {
    try {
      if (event instanceof PromiseRejectionEvent) {
        const reason = event.reason;

        if (reason instanceof Error) {
          this._displayErrorMessage("처리되지 않은 Promise 거부", {
            Message: reason.message,
            Stack: reason.stack ?? "(스택 없음)",
          });
        } else if (typeof reason === "object" && reason != null) {
          this._displayErrorMessage("처리되지 않은 Promise 거부", {
            Reason: JSON.stringify(reason, null, 2),
          });
        } else if (typeof reason === "string") {
          this._displayErrorMessage("처리되지 않은 Promise 거부", {
            Reason: reason,
          });
        } else {
          this._displayErrorMessage("처리되지 않은 Promise 거부", {
            Reason: String(reason),
          });
        }
      } else if (event instanceof ErrorEvent) {
        const { message, filename, lineno, colno, error } = event;

        if (error == null) {
          void this._sdSystemLog.writeAsync("warn", message);
          return;
        }

        let stack = "";
        if (error?.stack != null) {
          stack = "\n" + error.stack;
        }

        this._displayErrorMessage("처리되지 않은 에러", {
          Message: `${message}`,
          Source: `${filename}(${lineno}, ${colno})${stack}`,
        });
      } else if (event instanceof Error) {
        this._displayErrorMessage(
          "처리되지 않은 에러",
          event.stack != null
            ? {
                Stack: event.stack,
              }
            : {
                Message: event.message,
                Event: JSON.stringify(event, null, 2),
              },
        );
      } else {
        this._displayErrorMessage("처리되지 않은 에러", {
          Message: String(event),
        });
      }
    } catch (err) {
      logger.error(err, event);

      document.body.textContent =
        `[에러 처리 실패]\n원본: ${String(event)}\n2차: ${String(err)}`;

      try {
        const appRef = this._envInjector.get<ApplicationRef>(ApplicationRef);
        appRef.destroy();
      } catch {
        // _displayErrorMessage에서 이미 destroy된 경우 무시
      }
    }

    return false;
  }

  private _displayErrorMessage(title: string, param: Record<string, string>) {
    if (this._hasDisplayedError) return;
    this._hasDisplayedError = true;

    const paramLines = Object.keys(param).map((key) => key + ": " + param[key]);

    void this._sdSystemLog.writeAsync("error", `[${title}]\n${paramLines.join("\n")}`);

    const appRef = this._envInjector.get<ApplicationRef>(ApplicationRef);
    appRef.destroy();

    const plainText = `[${title}]\n${paramLines.join("\n")}`;

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

    const preEl = document.createElement("pre");
    preEl.style.fontSize = "12px";
    preEl.style.fontFamily = "monospace";
    preEl.style.lineHeight = "1.4em";
    preEl.textContent = plainText;
    divEl.appendChild(preEl);

    document.body.append(divEl);
    divEl.onclick = () => {
      if (!isDevMode()) {
        location.hash = "/";
      }
      location.reload();
    };
  }
}
