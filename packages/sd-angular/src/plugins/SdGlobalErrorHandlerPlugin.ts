/* eslint-disable no-console */
import {
  ApplicationRef,
  EnvironmentInjector,
  ErrorHandler,
  inject,
  Injectable,
} from "@angular/core";
import { SdSystemLogProvider } from "../providers/SdSystemLogProvider";

@Injectable({ providedIn: null })
export class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  #envInjector = inject(EnvironmentInjector);
  #systemLog = inject(SdSystemLogProvider);

  async handleError(event: any) {
    try {
      if (event instanceof PromiseRejectionEvent) {
        const reason = event.reason;

        if (reason instanceof Error) {
          await this.#displayErrorMessage("Unhandled Promise Rejection", {
            Message: reason.message,
            Stack: reason.stack ?? "(no stack)",
          });
        } else if (typeof reason === "object" && reason !== null) {
          await this.#displayErrorMessage("Unhandled Promise Rejection", {
            Reason: JSON.stringify(reason, null, 2),
          });
        } else {
          await this.#displayErrorMessage("Unhandled Promise Rejection", {
            Event: JSON.stringify(event, null, 2),
          });
        }
      } else if (event instanceof ErrorEvent) {
        const { message, filename, lineno, colno, error } = event;

        if (error == null) {
          await this.#warning(message);
          return;
        }

        let stack = "";
        if (error?.stack != null) {
          stack = "\n" + error.stack;
        }

        await this.#displayErrorMessage("Uncaught Error", {
          Message: `${message}`,
          Source: `${filename}(${lineno}, ${colno})${stack}`,
        });
      } else if (event instanceof Error) {
        await this.#displayErrorMessage(
          "Uncaught Error",
          event.stack != null
            ? {
                Stack: event.stack,
              }
            : {
                Messasge: event.message,
                Event: JSON.stringify(event, null, 2),
              },
        );
      }
    } catch (err) {
      console.error(err);

      const appRef = this.#envInjector.get<ApplicationRef>(ApplicationRef);
      appRef.destroy();
    }

    return false;
  }

  async #warning(message: string) {
    await this.#systemLog.writeAsync("warn", message);
  }

  async #displayErrorMessage(title: string, param: Record<string, string>) {
    const paramLines = Object.keys(param).map((key) => key + ": " + param[key]);

    await this.#systemLog.writeAsync("error", `[${title}]\n${paramLines.join("\n")}`);

    const appRef = this.#envInjector.get<ApplicationRef>(ApplicationRef);
    appRef.destroy();

    // HTML 그리는 순간 appRef의 각종 이벤트가 발생하기 때문에, appRef가 destroy된 다음 수행해야함
    const htmlText = `[${title}]<br />${paramLines.join("<br />")}`;

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

    divEl.innerHTML = `<pre style="font-size: 12px; font-family: monospace; line-height: 1.4em;">${htmlText}</pre>`;

    document.body.append(divEl);
    divEl.onclick = () => {
      if (process.env["NODE_ENV"] === "production") {
        location.hash = "/";
      }
      location.reload();
    };
  }
}
