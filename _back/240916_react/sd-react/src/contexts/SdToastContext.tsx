import { context } from "../utils/context";
import { SdToastContainer } from "../controls/SdToastContainer";
import { ReactNode, RefObject } from "react";
import { SdToast, TSdToastTheme } from "../controls/SdToast";
import { useSdSystemLog } from "./SdSystemLogContext";
import { signal } from "../utils/signal";

export const { SdToastConsumer, SdToastProvider, useSdToast } = context("SdToast", () => {
  const sdSystemLog = useSdSystemLog();

  const toastInfos$ = signal<ISdToastInfo[]>([]);

  const overlap$ = signal(false);
  const alertThemes$ = signal<("info" | "success" | "warning" | "danger")[]>([]);
  const beforeShowFn$ = signal<(theme: "info" | "success" | "warning" | "danger") => void>();

  /*const portal = createPortal(
    <SdToastContainer $overlap={overlap$.current}>
      {toastInfos$.current.map((item) => (
        <SdToast ref={item.ref} $progress={item.progress} $theme={item.severity}>
          {item.children}
        </SdToast>
      ))}
    </SdToastContainer>,
    document.body
  );*/

  return class {
    static template = (children?: ReactNode) => (
      <>
        {children}
        <SdToastContainer $overlap={overlap$.current}>
          {toastInfos$.current.map((item) => (
            <SdToast ref={item.ref} $progress={item.progress} $theme={item.severity}>
              {item.children}
            </SdToast>
          ))}
        </SdToastContainer>
      </>
    );

    overlap$ = overlap$;
    alertThemes$ = alertThemes$;
    beforeShowFn$ = beforeShowFn$;

    #show<T extends boolean>(
      severity: TSdToastTheme,
      message: string,
      useProgress?: T
    ): T extends true ? ISdProgressToast : void {
      this.beforeShowFn$.current?.(severity);

      if (this.alertThemes$.current.includes(severity)) {
        alert(message);
        return undefined as any;
      }

      const toastInfo: ISdToastInfo = {
        ref: { current: null },
        children: message,
        progress: useProgress ? 0 : undefined,
        severity
      };
      console.log("uuu");
      toastInfos$.update((v) => [...v, toastInfo]);
      if (useProgress) {
        return {
          progress: (percent: number) => {
            toastInfo.progress = percent;
            toastInfos$.mark();
            if (percent >= 100) {
              this.#closeAfterTime(toastInfo, 1000);
            }
          },
          message: (msg: string) => {
            toastInfo.children = msg;
            toastInfos$.mark();
          }
        } as any;
      }
      else {
        this.#closeAfterTime(toastInfo, 3000);
        return undefined as any;
      }
    }


    #closeAfterTime(toastInfo: ISdToastInfo, ms: number): void {
      window.setTimeout(() => {
        const toastEl = toastInfo.ref.current!;

        if (toastEl.matches(":hover")) {
          this.#closeAfterTime(toastInfo, ms);
        }
        else {
          toastInfos$.update((v) => v.filter((item) => item !== toastInfo));
        }
      }, ms);
    }

    async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R>;
    try<R>(fn: () => R, messageFn?: (err: Error) => string): R;
    async try<R>(fn: () => Promise<R> | R, messageFn?: (err: Error) => string): Promise<R | undefined> {
      try {
        return await fn();
      }
      catch (err) {
        if (err instanceof Error) {
          if (messageFn) {
            this.danger(messageFn(err));
          }
          else {
            this.danger(err.message);
          }

          await sdSystemLog.writeAsync("error", err.stack);

          return undefined;
        }
        else {
          throw err;
        }
      }
    }

    notify(severity: "info" | "success" | "warning" | "danger", children: ReactNode): { close(): void } {
      const toastInfo: ISdToastInfo = {
        ref: { current: null },
        children,
        severity
      };
      toastInfos$.update((v) => [...v, toastInfo]);

      return {
        close: () => {
          toastInfos$.update((v) => v.filter((item) => item !== toastInfo));
        }
      };
    }

    info<T extends boolean>(message: string, progress?: T): T extends true ? ISdProgressToast : void {
      return this.#show("info", message, progress);
    }

    success<T extends boolean>(message: string, progress?: T): T extends true ? ISdProgressToast : void {
      return this.#show("success", message, progress);
    }

    warning<T extends boolean>(message: string, progress?: T): T extends true ? ISdProgressToast : void {
      return this.#show("warning", message, progress);
    }

    danger<T extends boolean>(message: string, progress?: T): T extends true ? ISdProgressToast : void {
      return this.#show("danger", message, progress);
    }
  };
});

export interface ISdProgressToast {
  progress(percent: number): void;

  message(msg: string): void;
}

interface ISdToastInfo {
  ref: RefObject<HTMLDivElement>;
  children: ReactNode;
  progress?: number;
  severity: TSdToastTheme;
}
