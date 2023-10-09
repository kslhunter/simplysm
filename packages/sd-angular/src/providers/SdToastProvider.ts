import {ApplicationRef, ComponentRef, inject, Injectable, Type, ViewContainerRef} from "@angular/core";
import {SdToastContainerControl} from "../controls/toast/SdToastContainerControl";
import {SdSystemLogProvider} from "./SdSystemLogProvider";
import {SdToastControl} from "../controls/toast/SdToastControl";

@Injectable({providedIn: "root"})
export class SdToastProvider {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _systemLog = inject(SdSystemLogProvider);

  public alertThemes: ("info" | "success" | "warning" | "danger")[] = [];

  private _containerRef?: ComponentRef<SdToastContainerControl>;

  public get containerRef(): ComponentRef<SdToastContainerControl> {
    const vcr = this._appRef.injector.get(ViewContainerRef);
    if (this._containerRef === undefined) {
      const compRef = vcr.createComponent(SdToastContainerControl);
      const rootComp = this._appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(compRef.location.nativeElement);
      this._appRef.attachView(compRef.hostView);
      this._containerRef = compRef;
    }
    return this._containerRef;
  }

  public async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R>;
  public try<R>(fn: () => R, messageFn?: (err: Error) => string): R;
  public async try<R>(fn: () => Promise<R> | R, messageFn?: (err: Error) => string): Promise<R | undefined> {
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

  public notify<T extends SdToastBase<any, any>>(toastType: Type<T>, param: T["tParam"], onclose: (result: T["tResult"] | undefined) => void | Promise<void>): void {
    const vcr = this.containerRef.injector.get(ViewContainerRef);

    const compRef = vcr.createComponent(toastType);
    const containerEl = this.containerRef.location.nativeElement as HTMLElement;

    const toastRef = vcr.createComponent(SdToastControl, {
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

    window.setTimeout(async () => {
      this._appRef.attachView(compRef.hostView);
      this._appRef.attachView(toastRef.hostView);
      this._appRef.tick();

      try {
        toastRef.instance.open = true;
        this._appRef.tick();
        await compRef.instance.sdOnOpen(param);
        this._appRef.tick();
      }
      catch (e) {
        await close();
        throw e;
      }
    });

    window.setTimeout(
      () => {
        compRef.destroy();
        toastRef.destroy();
      },
      5000
    );
  }

  public info<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("info", message, progress);
  }

  public success<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("success", message, progress);
  }

  public warning<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("warning", message, progress);
  }

  public danger<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(500);
    }

    return this._show("danger", message, progress);
  }

  private _show<T extends boolean>(theme: "info" | "success" | "warning" | "danger", message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (this.alertThemes.includes(theme)) {
      alert(message);
      return undefined as any;
    }

    const vcr = this.containerRef.injector.get(ViewContainerRef);

    const toastRef = vcr.createComponent(SdToastControl);
    const toastEl = toastRef.location.nativeElement as HTMLElement;

    const containerEl = this.containerRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);
    this._appRef.attachView(toastRef.hostView);

    toastEl.findAll<HTMLElement>("._sd-toast-message")[0].innerText = message;
    toastRef.instance.useProgress = progress;
    toastRef.instance.progress = 0;

    // repaint
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    containerEl.offsetHeight;

    toastRef.instance.open = true;
    toastRef.instance.theme = theme;
    try {
      this._appRef.tick();
    }
    catch {
    }

    if (progress) {
      return {
        progress: (percent: number) => {
          toastRef.instance.progress = percent;
          if (percent >= 100) {
            this._closeAfterTime(toastRef, 1000);
          }
        },
        message: (msg: string) => {
          toastEl.findAll<HTMLElement>("._sd-toast-message")[0].innerText = msg;
        }
      } as any;
    }
    else {
      this._closeAfterTime(toastRef, 5000);
      return undefined as any;
    }
  }

  private _closeAfterTime(toastRef: ComponentRef<SdToastControl>, ms: number): void {
    const toastEl = toastRef.location.nativeElement as HTMLElement;

    window.setTimeout(
      () => {
        if (toastEl.matches(":hover")) {
          this._closeAfterTime(toastRef, ms);
        }
        else {
          toastEl.addEventListener("transitionend", () => {
            toastRef.destroy();
          });
          toastRef.instance.open = false;
          this._appRef.tick();
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
  public tParam!: P;

  public tResult!: R;

  public abstract sdOnOpen(param: P): void | Promise<void>;

  public close: (value?: R) => void = (value?: R) => {
    throw new Error("초기화되어있지 않습니다.");
  };
}

