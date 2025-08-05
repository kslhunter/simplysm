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
import { SdToastContainerControl } from "../controls/toast/sd-toast-container.control";
import { SdSystemLogProvider } from "./sd-system-log.provider";
import { SdToastControl } from "../controls/toast/sd-toast.control";
import { $signal } from "../utils/bindings/$signal";
import { TDirectiveInputSignals } from "../utils/types";
import { $effect } from "../utils/bindings/$effect";

@Injectable({ providedIn: "root" })
export class SdToastProvider {
  readonly #appRef = inject(ApplicationRef);
  readonly #systemLog = inject(SdSystemLogProvider);

  readonly alertThemes = $signal<("info" | "success" | "warning" | "danger")[]>([]);
  readonly overlap = $signal(false);

  #containerRef?: ComponentRef<SdToastContainerControl>;

  beforeShowFn?: (theme: "info" | "success" | "warning" | "danger") => void;

  get containerRef() {
    if (this.#containerRef == null) {
      const compRef = createComponent(SdToastContainerControl, {
        environmentInjector: this.#appRef.injector,
        bindings: [inputBinding("overlap", this.overlap)],
      });

      document.body.appendChild(compRef.location.nativeElement);
      this.#appRef.attachView(compRef.hostView);
      this.#containerRef = compRef;
    }

    return this.#containerRef;
  }

  async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>;
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R | undefined;
  async try<R>(fn: () => Promise<R> | R, messageFn?: (err: Error) => string): Promise<R | undefined> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Error) {
        if (messageFn) {
          this.danger(messageFn(err));
        } else {
          this.danger(err.message);
        }

        await this.#systemLog.writeAsync("error", err.stack);

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
    const compRef = createComponent(toast.type, {
      environmentInjector: this.#appRef.injector,
      bindings: [
        ...Object.keys(toast.inputs).map((inputKey) => inputBinding(inputKey, () => toast.inputs[inputKey])),
        outputBinding("close", () => closeFn()),
      ],
    });

    // toast
    const bindings = { open: $signal(false) };
    const toastRef = createComponent(SdToastControl, {
      environmentInjector: this.#appRef.injector,
      projectableNodes: [[compRef.location.nativeElement]],
      bindings: [inputBinding("open", bindings.open)],
    });
    const toastEl = toastRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);

    this.#appRef.attachView(toastRef.hostView);
    this.#appRef.attachView(compRef.hostView);

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
    return this.#show("info", message, userProgress);
  }

  success(message: string, useProgress: boolean = false) {
    return this.#show("success", message, useProgress);
  }

  warning(message: string, useProgress: boolean = false) {
    return this.#show("warning", message, useProgress);
  }

  danger(message: string, useProgress: boolean = false) {
    return this.#show("danger", message, useProgress);
  }

  #show(theme: "info" | "success" | "warning" | "danger", message: string, useProgress: boolean) {
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
      environmentInjector: this.#appRef.injector,
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
    this.#appRef.attachView(toastRef.hostView);

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
          injector: this.#appRef.injector,
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
