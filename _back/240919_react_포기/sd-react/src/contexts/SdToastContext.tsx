import { context, ISdRenderContext } from "../utils/context";
import React, { ReactNode, RefObject, useMemo } from "react";
import { SdToast, TSdToastTheme } from "../controls/SdToast";
import { useSdSystemLog } from "./SdSystemLogContext";
import { signal } from "../utils/signal";
import { SdToastContainer } from "../controls/SdToastContainer";
import { createPortal } from "react-dom";

export const { SdToastConsumer, SdToastProvider, useSdToast } = context("SdToast", () => {
  const sdSystemLog = useSdSystemLog();

  return useMemo(() => new class implements ISdRenderContext {
    #toastInfos$ = signal<ISdToastInfo[]>([]);

    overlap$ = signal(false);
    alertThemes$ = signal<("info" | "success" | "warning" | "danger")[]>([]);
    beforeShowFn$ = signal<(theme: "info" | "success" | "warning" | "danger") => void>(undefined);

    render = (props: { children?: ReactNode }) => {
      return (
        <>
          {props.children}
          {createPortal(
            <SdToastContainer $overlap={this.overlap$.value}>
              {this.#toastInfos$.value.map((item, index) => (
                <SdToast key={index} ref={item.ref} $progress={item.progress} $theme={item.severity}
                         $closing={item.closing}>
                  {item.children}
                </SdToast>
              ))}
            </SdToastContainer>,
            document.body
          )}
        </>
      );
    };

    #show<T extends boolean>(
      severity: TSdToastTheme,
      message: string,
      useProgress?: T
    ): T extends true ? ISdProgressToast : void {
      this.beforeShowFn$.value?.(severity);

      if (this.alertThemes$.value.includes(severity)) {
        alert(message);
        return undefined as any;
      }

      const toastInfo: ISdToastInfo = {
        ref: { current: null },
        children: message,
        progress: useProgress ? 0 : undefined,
        severity,
        closing: false
      };

      this.#toastInfos$.update((v) => [...v, toastInfo]);

      if (useProgress) {
        return {
          progress: (percent: number) => {
            toastInfo.progress = percent;
            this.#toastInfos$.forceUpdate();
            if (percent >= 100) {
              this.#closeAfterTime(toastInfo, 1000);
            }
          },
          message: (msg: string) => {
            toastInfo.children = msg;
            this.#toastInfos$.forceUpdate();
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
          toastEl.addEventListener("transitionend", () => {
            this.#toastInfos$.update((v) => v.filter((item) => item !== toastInfo));
          });
          toastInfo.closing = true;
          this.#toastInfos$.forceUpdate();
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
        severity,
        closing: false
      };
      this.#toastInfos$.update((v) => [...v, toastInfo]);

      return {
        close: () => {
          const toastEl = toastInfo.ref.current!;
          toastEl.addEventListener("transitionend", () => {
            this.#toastInfos$.update((v) => v.filter((item) => item !== toastInfo));
          });
          toastInfo.closing = true;
          this.#toastInfos$.forceUpdate();
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
  }, []);
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
  closing: boolean;
}
