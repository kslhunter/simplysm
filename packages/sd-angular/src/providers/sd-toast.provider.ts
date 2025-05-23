import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  Directive,
  inject,
  Injectable,
  input,
  Type,
} from "@angular/core";
import { SdToastContainerControl } from "../controls/sd-toast-container.control";
import { SdSystemLogProvider } from "./sd-system-log.provider";
import { SdToastControl } from "../controls/sd-toast.control";

@Injectable({ providedIn: "root" })
export class SdToastProvider {
  private _appRef = inject(ApplicationRef);
  private _systemLog = inject(SdSystemLogProvider);

  alertThemes: ("info" | "success" | "warning" | "danger")[] = [];
  overlap = false;

  private _containerRef?: ComponentRef<SdToastContainerControl>;

  beforeShowFn?: (theme: "info" | "success" | "warning" | "danger") => void;

  get containerRef(): ComponentRef<SdToastContainerControl> {
    if (this._containerRef === undefined) {
      const compRef = createComponent(SdToastContainerControl, {
        environmentInjector: this._appRef.injector,
      });
      compRef.setInput("overlap", this.overlap);

      const rootComp = this._appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(compRef.location.nativeElement);
      this._appRef.attachView(compRef.hostView);
      this._containerRef = compRef;
    }
    return this._containerRef;
  }

  async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R>;
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R;
  async try<R>(
    fn: () => Promise<R> | R,
    messageFn?: (err: Error) => string,
  ): Promise<R | undefined> {
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

        await this._systemLog.writeAsync("error", err.stack);

        return undefined;
      }
      else {
        throw err;
      }
    }
  }

  notify<T extends SdToastBase<any, any>>(
    toastType: Type<T>,
    params: T["__tInput__"],
    onclose: (result: T["__tOutput__"] | undefined) => void | Promise<void>,
  ): void {
    const compRef = createComponent(toastType, {
      environmentInjector: this._appRef.injector,
    });
    const containerEl = this.containerRef.location.nativeElement as HTMLElement;

    const toastRef = createComponent(SdToastControl, {
      environmentInjector: this._appRef.injector,
      projectableNodes: [[compRef.location.nativeElement]],
    });
    const toastEl = toastRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);

    const close = async (value?: any): Promise<void> => {
      toastEl.addEventListener("transitionend", () => {
        compRef.destroy();
        toastRef.destroy();
      });
      toastRef.setInput("open", false);
      await onclose(value);
    };

    toastRef.instance.close.subscribe(async () => {
      await close();
    });
    this._appRef.attachView(toastRef.hostView);

    compRef.setInput("params", params);
    compRef.instance.close = async (v) => {
      await close(v);
    };
    this._appRef.attachView(compRef.hostView);

    toastRef.setInput("open", true);

    window.setTimeout(() => {
      compRef.destroy();
      toastRef.destroy();
    }, 5000);
  }

  info<T extends boolean>(message: string, progress?: T): T extends true ? ISdProgressToast : void {
    return this._show("info", message, progress);
  }

  success<T extends boolean>(message: string, progress?: T): T extends true
    ? ISdProgressToast
    : void {
    return this._show("success", message, progress);
  }

  warning<T extends boolean>(message: string, progress?: T): T extends true
    ? ISdProgressToast
    : void {
    return this._show("warning", message, progress);
  }

  danger<T extends boolean>(message: string, progress?: T): T extends true
    ? ISdProgressToast
    : void {
    return this._show("danger", message, progress);
  }

  private _show<T extends boolean>(
    theme: "info" | "success" | "warning" | "danger",
    message: string,
    progress?: T,
  ): T extends true ? ISdProgressToast : void {
    this.beforeShowFn?.(theme);

    if (this.alertThemes.includes(theme)) {
      alert(message);
      return undefined as any;
    }

    const toastRef = createComponent(SdToastControl, {
      environmentInjector: this._appRef.injector,
    });
    const toastEl = toastRef.location.nativeElement as HTMLElement;

    const containerEl = this.containerRef.location.nativeElement as HTMLElement;
    if (this.overlap) {
      for (const child of Array.from(containerEl.children)) {
        containerEl.removeChild(child);
      }
    }
    containerEl.appendChild(toastEl);
    this._appRef.attachView(toastRef.hostView);

    toastEl.findAll<HTMLElement>("._sd-toast-message")[0].innerText = message;
    toastRef.setInput("useProgress", progress ?? false);
    toastRef.setInput("progress", 0);

    // repaint
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    containerEl.offsetHeight;

    toastRef.setInput("open", true);
    toastRef.setInput("theme", theme);

    if (progress) {
      return {
        progress: (percent: number) => {
          toastRef.setInput("progress", percent);
          if (percent >= 100) {
            this._closeAfterTime(toastRef, 1000);
          }
        },
        message: (msg: string) => {
          toastEl.findAll<HTMLElement>("._sd-toast-message")[0].innerText = msg;
        },
      } as any;
    }
    else {
      this._closeAfterTime(toastRef, 3000);
      return undefined as any;
    }
  }

  private _closeAfterTime(toastRef: ComponentRef<SdToastControl>, ms: number): void {
    const toastEl = toastRef.location.nativeElement as HTMLElement;

    window.setTimeout(() => {
      if (toastEl.matches(":hover")) {
        this._closeAfterTime(toastRef, ms);
      }
      else {
        toastEl.addEventListener("transitionend", () => {
          toastRef.destroy();
        });
        toastRef.setInput("open", false);
      }
    }, ms);
  }
}

export interface ISdProgressToast {
  progress(percent: number): void;

  message(msg: string): void;
}

@Directive()
export abstract class SdToastBase<I, O> {
  __tInput__!: I;
  __tOutput__!: O;

  params = input.required<I>();

  close(value?: O): void {
    throw new Error("초기화되어있지 않습니다.");
  }
}
