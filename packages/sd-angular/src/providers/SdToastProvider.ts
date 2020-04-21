import {ComponentFactoryResolver, ComponentRef, Injectable, Injector, Type} from "@angular/core";
import {SdToastContainerEntryControl} from "../entry-controls/SdToastContainerEntryControl";
import {SdToastEntryControl} from "../entry-controls/SdToastEntryControl";
import {SdRootProvider} from "../root-providers/SdRootProvider";
import {SdSystemLogRootProvider} from "../root-providers/SdSystemLogRootProvider";

@Injectable()
export class SdToastProvider {
  public get containerRef(): ComponentRef<SdToastContainerEntryControl> {
    this._root.data.toast = this._root.data.toast ?? {};

    if (this._root.data.toast.containerRef === undefined) {
      const compRef = this._cfr.resolveComponentFactory(SdToastContainerEntryControl).create(this._injector);
      const rootComp = this._root.appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(compRef.location.nativeElement);
      this._root.appRef.attachView(compRef.hostView);
      this._root.data.toast.containerRef = compRef;
    }
    return this._root.data.toast.containerRef;
  }

  public get alertThemes(): ("info" | "success" | "warning" | "danger")[] {
    this._root.data.toast = this._root.data.toast ?? {};
    this._root.data.toast.alertThemes = this._root.data.toast.alertThemes ?? [];
    return this._root.data.toast.alertThemes;
  }

  public set alertThemes(value: ("info" | "success" | "warning" | "danger")[]) {
    this._root.data.toast = this._root.data.toast ?? {};
    this._root.data.toast.alertThemes = value;
  }

  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector,
                     private readonly _root: SdRootProvider,
                     private readonly _systemLog: SdSystemLogRootProvider) {
  }

  public async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined> {
    try {
      return await fn();
    }
    catch (err) {
      if (messageFn) {
        this.danger(messageFn(err));
      }
      else {
        this.danger(err.message);
      }

      await this._systemLog.writeAsync("error", err.stack);

      return undefined;
    }
  }

  public notify<T extends SdToastBase<any, any>>(toastType: Type<T>, param: T["_tParam"], onclose: (result: T["_tResult"] | undefined) => void | Promise<void>): void {
    const compRef = this._cfr.resolveComponentFactory(toastType).create(this.containerRef.injector);
    const containerEl = this.containerRef.location.nativeElement as HTMLElement;

    const toastRef = this._cfr.resolveComponentFactory(SdToastEntryControl).create(
      this.containerRef.injector,
      [[compRef.location.nativeElement]]
    );
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
    compRef.instance.close = async v => {
      await close(v);
    };

    window.setTimeout(async () => {
      this._root.appRef.attachView(compRef.hostView);
      this._root.appRef.attachView(toastRef.hostView);
      this._root.appRef.tick();

      try {
        toastRef.instance.open = true;
        this._root.appRef.tick();
        await compRef.instance.sdOnOpen(param);
        this._root.appRef.tick();
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
    return this._show("info", message, progress) as any;
  }

  public success<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("success", message, progress) as any;
  }

  public warning<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("warning", message, progress) as any;
  }

  public danger<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    return this._show("danger", message, progress) as any;
  }

  private _show<T extends boolean>(theme: "info" | "success" | "warning" | "danger", message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (this.alertThemes.includes(theme)) {
      alert(message);
      return undefined as any;
    }

    const containerEl = this.containerRef.location.nativeElement as HTMLElement;
    const toastRef = this._cfr.resolveComponentFactory(SdToastEntryControl).create(this.containerRef.injector);
    const toastEl = toastRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);
    this._root.appRef.attachView(toastRef.hostView);

    toastEl.findAll("._sd-toast-message")[0].innerText = message;
    toastRef.instance.useProgress = progress;
    toastRef.instance.progress = 0;

    // repaint
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    containerEl.offsetHeight;

    toastRef.instance.open = true;
    toastRef.instance.theme = theme;
    try {
      this._root.appRef.tick();
    }
    catch {
    }

    if (progress) {
      return {
        progress: (percent: number) => {
          toastRef.instance.progress = percent;
          if (percent >= 100) {
            window.setTimeout(
              () => {
                toastEl.addEventListener("transitionend", () => {
                  toastRef.destroy();
                });
                toastRef.instance.open = false;
                this._root.appRef.tick();
              },
              1000
            );
          }
        },
        message: (msg: string) => {
          toastEl.findAll("._sd-toast-message")[0].innerText = msg;
        }
      } as any;
    }
    else {
      window.setTimeout(
        () => {
          toastEl.addEventListener("transitionend", () => {
            toastRef.destroy();
          });
          toastRef.instance.open = false;
          this._root.appRef.tick();
        },
        5000
      );

      return undefined as any;
    }
  }
}

export interface ISdProgressToast {
  progress(percent: number): void;

  message(msg: string): void;
}

export abstract class SdToastBase<P, R> {
  public _tParam!: P;
  public _tResult!: R;

  public abstract sdOnOpen(param: P): Promise<void>;

  public close: (value?: R) => void = (value?: R) => {
    throw new Error("초기화되어있지 않습니다.");
  };
}
