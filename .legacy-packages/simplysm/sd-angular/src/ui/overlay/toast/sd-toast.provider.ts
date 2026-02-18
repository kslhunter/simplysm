import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  inject,
  Injectable,
  inputBinding,
  outputBinding,
  OutputEmitterRef,
  Type,
} from "@angular/core";
import { SdToastContainerControl } from "./sd-toast-container.control";
import { SdSystemLogProvider } from "../../../core/providers/app/sd-system-log.provider";
import { SdToastControl } from "./sd-toast.control";
import { $signal } from "../../../core/utils/bindings/$signal";
import type { TDirectiveInputSignals } from "../../../core/utils/TDirectiveInputSignals";
import { $effect } from "../../../core/utils/bindings/$effect";

@Injectable({ providedIn: "root" })
export class SdToastProvider {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _systemLog = inject(SdSystemLogProvider);

  readonly alertThemes = $signal<("info" | "success" | "warning" | "danger")[]>([]);
  readonly overlap = $signal(false);

  private _containerRef?: ComponentRef<SdToastContainerControl>;

  beforeShowFn?: (theme: "info" | "success" | "warning" | "danger") => void;

  get containerRef() {
    if (this._containerRef == null) {
      const compRef = createComponent(SdToastContainerControl, {
        environmentInjector: this._appRef.injector,
        bindings: [inputBinding("overlap", this.overlap)],
      });

      document.body.appendChild(compRef.location.nativeElement);
      this._appRef.attachView(compRef.hostView);
      this._containerRef = compRef;
    }

    return this._containerRef;
  }

  async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>;
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R | undefined;
  async try<R>(
    fn: () => Promise<R> | R,
    messageFn?: (err: Error) => string,
  ): Promise<R | undefined> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Error) {
        if (messageFn) {
          this.danger(messageFn(err));
        } else {
          this.danger(err.message);
        }

        await this._systemLog.writeAsync("error", err.stack);

        return undefined;
      } else {
        throw err;
      }
    }
  }

  notify<T extends ISdToast<any>>(toast: ISdToastInput<T>) {
    // container
    const containerEl = this.containerRef.location.nativeElement as HTMLElement;

    // component
    const inputs = toast.inputs as Record<string, any>;
    const compRef = createComponent(toast.type, {
      environmentInjector: this._appRef.injector,
      bindings: [
        ...Object.keys(inputs).map((inputKey) => inputBinding(inputKey, () => inputs[inputKey])),
        outputBinding("close", () => closeFn()),
      ],
    });

    // toast
    const bindings = { open: $signal(false) };
    const toastRef = createComponent(SdToastControl, {
      environmentInjector: this._appRef.injector,
      projectableNodes: [[compRef.location.nativeElement]],
      bindings: [inputBinding("open", bindings.open)],
    });
    const toastEl = toastRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);

    this._appRef.attachView(toastRef.hostView);
    this._appRef.attachView(compRef.hostView);

    bindings.open.set(true);

    window.setTimeout(() => {
      closeFn();
    }, 5000);

    function closeFn() {
      toastEl.addEventListener("transitionend", () => {
        compRef.destroy();
        toastRef.destroy();
      });
      bindings.open.set(false);
    }

    return bindings;
  }

  info(message: string, userProgress: boolean = false) {
    return this._show("info", message, userProgress);
  }

  success(message: string, useProgress: boolean = false) {
    return this._show("success", message, useProgress);
  }

  warning(message: string, useProgress: boolean = false) {
    return this._show("warning", message, useProgress);
  }

  danger(message: string, useProgress: boolean = false) {
    return this._show("danger", message, useProgress);
  }

  private _show(
    theme: "info" | "success" | "warning" | "danger",
    message: string,
    useProgress: boolean,
  ) {
    this.beforeShowFn?.(theme);

    if (this.alertThemes().includes(theme)) {
      alert(message);
      return undefined as any;
    }

    const bindings = {
      progress: $signal(0),
      message: $signal(message),
      open: $signal(false),
    };
    const toastRef = createComponent(SdToastControl, {
      environmentInjector: this._appRef.injector,
      bindings: [
        inputBinding("useProgress", () => useProgress),
        inputBinding("progress", bindings.progress),
        inputBinding("message", bindings.message),
        inputBinding("theme", () => theme),
        inputBinding("open", bindings.open),
      ],
    });
    const toastEl = toastRef.location.nativeElement as HTMLElement;

    const containerEl = this.containerRef.location.nativeElement as HTMLElement;
    if (this.overlap()) {
      for (const child of Array.from(containerEl.children)) {
        containerEl.removeChild(child);
      }
    }
    containerEl.appendChild(toastEl);
    this._appRef.attachView(toastRef.hostView);

    // repaint
    containerEl.repaint();

    bindings.open.set(true);

    if (useProgress) {
      $effect(
        [bindings.progress],
        () => {
          if (bindings.progress() < 100) return;
          closeAfterTime(1000);
        },
        {
          injector: this._appRef.injector,
        },
      );
    } else {
      closeAfterTime(3000);
    }

    function closeAfterTime(ms: number): void {
      window.setTimeout(() => {
        if (toastEl.matches(":hover")) {
          closeAfterTime(1000);
        } else {
          toastEl.addEventListener("transitionend", () => {
            toastRef.destroy();
          });
          bindings.open.set(false);
        }
      }, ms);
    }

    return bindings;
  }
}

export interface ISdToast<O> {
  close: OutputEmitterRef<O | undefined>;
}

export interface ISdToastInput<T extends ISdToast<any>, X extends keyof any = ""> {
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
