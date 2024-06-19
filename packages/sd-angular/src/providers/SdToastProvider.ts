import {ApplicationRef, ComponentRef, createComponent, inject, Injectable, NgZone, Type} from "@angular/core";
import {SdToastContainerControl} from "../controls/SdToastContainerControl";
import {SdSystemLogProvider} from "./SdSystemLogProvider";
import {SdToastControl} from "../controls/SdToastControl";

@Injectable({providedIn: "root"})
export class SdToastProvider {
  #appRef = inject(ApplicationRef);
  #systemLog = inject(SdSystemLogProvider);
  #ngZone = inject(NgZone);

  alertThemes: ("info" | "success" | "warning" | "danger")[] = [];

  #containerRef?: ComponentRef<SdToastContainerControl>;

  get containerRef(): ComponentRef<SdToastContainerControl> {
    if (this.#containerRef === undefined) {
      const compRef = createComponent(SdToastContainerControl, {
        environmentInjector: this.#appRef.injector
      });
      const rootComp = this.#appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(compRef.location.nativeElement);
      this.#appRef.attachView(compRef.hostView);
      this.#containerRef = compRef;
    }
    return this.#containerRef;
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

        await this.#systemLog.writeAsync("error", err.stack);

        return undefined;
      }
      else {
        throw err;
      }
    }
  }

  notify<T extends SdToastBase<any, any>>(toastType: Type<T>, param: T["tParam"], onclose: (result: T["tResult"] | undefined) => void | Promise<void>): void {
    const compRef = createComponent(toastType, {
      environmentInjector: this.#appRef.injector
    });
    const containerEl = this.containerRef.location.nativeElement as HTMLElement;

    const toastRef = createComponent(SdToastControl, {
      environmentInjector: this.#appRef.injector,
      projectableNodes: [[compRef.location.nativeElement]]
    });
    const toastEl = toastRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);

    const close = async (value?: any): Promise<void> => {
      toastEl.addEventListener("transitionend", () => {
        compRef.destroy();
        toastRef.destroy();
      });
      toastRef.instance.open = false;
      await onclose(value);
    };

    toastRef.instance.close.subscribe(async () => {
      await close();
    });

    compRef.instance.close = async (v) => {
      await close(v);
    };

    requestAnimationFrame(async () => {
      await this.#ngZone.run(async () => {
        this.#appRef.attachView(compRef.hostView);
        this.#appRef.attachView(toastRef.hostView);
        this.#appRef.tick();

        try {
          toastRef.instance.open = true;
          await compRef.instance.sdOnOpen(param);
        }
        catch (e) {
          await close();
          throw e;
        }
      });
    });

    window.setTimeout(
      () => {
        compRef.destroy();
        toastRef.destroy();
      },
      5000
    );
  }

  info<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this.#show("info", message, progress);
  }

  success<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this.#show("success", message, progress);
  }

  warning<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this.#show("warning", message, progress);
  }

  danger<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(500);
    }

    return this.#show("danger", message, progress);
  }

  #show<T extends boolean>(theme: "info" | "success" | "warning" | "danger", message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (this.alertThemes.includes(theme)) {
      alert(message);
      return undefined as any;
    }

    const toastRef = createComponent(SdToastControl, {
      environmentInjector: this.#appRef.injector
    });
    const toastEl = toastRef.location.nativeElement as HTMLElement;

    const containerEl = this.containerRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);
    this.#appRef.attachView(toastRef.hostView);

    toastEl.findAll<HTMLElement>("._sd-toast-message")[0].innerText = message;
    toastRef.instance.useProgress = progress ?? false;
    toastRef.instance.progress = 0;

    // repaint
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    containerEl.offsetHeight;

    toastRef.instance.open = true;
    toastRef.instance.theme = theme;
    try {
      this.#appRef.tick();
    }
    catch {
    }

    if (progress) {
      return {
        progress: (percent: number) => {
          toastRef.instance.progress = percent;
          if (percent >= 100) {
            this.#closeAfterTime(toastRef, 1000);
          }
        },
        message: (msg: string) => {
          toastEl.findAll<HTMLElement>("._sd-toast-message")[0].innerText = msg;
        }
      } as any;
    }
    else {
      this.#closeAfterTime(toastRef, 5000);
      return undefined as any;
    }
  }

  #closeAfterTime(toastRef: ComponentRef<SdToastControl>, ms: number): void {
    const toastEl = toastRef.location.nativeElement as HTMLElement;

    window.setTimeout(
      () => {
        if (toastEl.matches(":hover")) {
          this.#closeAfterTime(toastRef, ms);
        }
        else {
          toastEl.addEventListener("transitionend", () => {
            toastRef.destroy();
          });
          toastRef.instance.open = false;
          this.#appRef.tick();
        }
      },
      ms
    );
  }
}

export interface ISdProgressToast {
  progress(percent: number): void;

  message(msg: string): void;
}

export abstract class SdToastBase<P, R> {
  tParam!: P;

  tResult!: R;

  abstract sdOnOpen(param: P): void | Promise<void>;

  close: (value?: R) => void = (value?: R) => {
    throw new Error("초기화되어있지 않습니다.");
  };
}

