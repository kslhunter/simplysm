import {ApplicationRef, ComponentFactoryResolver, ComponentRef, Injectable, Injector, Type} from "@angular/core";
import {SdToastContainerControl} from "../controls/SdToastContainerControl";
import {SdToastControl} from "../controls/SdToastControl";
import {SdSystemLogProvider} from "./SdSystemLogProvider";

@Injectable()
export class SdToastProvider {
  private _containerRef?: ComponentRef<SdToastContainerControl>;
  public alertThemes: ("info" | "success" | "warning" | "danger")[] = [];

  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector,
                     private readonly _appRef: ApplicationRef,
                     private readonly _log: SdSystemLogProvider) {
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

      await this._log.writeAsync("error", err.stack);
    }
  }

  public notify<T extends SdToastBase<any, any>>(toastType: Type<T>, param: T["_tParam"], onclose: (result: T["_tResult"] | undefined) => void | Promise<void>): void {
    if (!this._containerRef) {
      this._containerRef = this._cfr.resolveComponentFactory(SdToastContainerControl).create(this._injector);
      const rootComp = this._appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(this._containerRef.location.nativeElement);
      this._appRef.attachView(this._containerRef.hostView);
    }

    const compRef = this._cfr.resolveComponentFactory(toastType).create(this._containerRef.injector);
    const containerEl = this._containerRef.location.nativeElement as HTMLElement;

    const toastRef = this._cfr.resolveComponentFactory(SdToastControl).create(
      this._containerRef.injector,
      [[compRef.location.nativeElement]]
    );
    const toastEl = toastRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);

    const close = (value?: any) => {
      toastEl.addEventListener("transitionend", () => {
        compRef.destroy();
        toastRef.destroy();
      });
      toastRef.instance.open = false;
      onclose(value);
    };

    toastRef.instance.close.subscribe(() => {
      close();
    });
    compRef.instance.close = close.bind(this); //tslint:disable-line:unnecessary-bind

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
        close();
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
    if (this.alertThemes.includes("info")) {
      alert(message);
      return undefined as any;
    }
    return this._show("info", message, progress) as any;
  }

  public success<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (this.alertThemes.includes("success")) {
      alert(message);
      return undefined as any;
    }
    return this._show("success", message, progress) as any;
  }

  public warning<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (this.alertThemes.includes("warning")) {
      alert(message);
      return undefined as any;
    }
    return this._show("warning", message, progress) as any;
  }

  public danger<T extends boolean>(message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (this.alertThemes.includes("danger")) {
      alert(message);
      return undefined as any;
    }
    return this._show("danger", message, progress) as any;
  }

  private _show<T extends boolean>(theme: "info" | "success" | "warning" | "danger", message: string, progress?: T): (T extends true ? ISdProgressToast : void) {
    if (!this._containerRef) {
      this._containerRef = this._cfr.resolveComponentFactory(SdToastContainerControl).create(this._injector);
      const rootComp = this._appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(this._containerRef.location.nativeElement);
      this._appRef.attachView(this._containerRef.hostView);
    }

    const containerEl = this._containerRef.location.nativeElement as HTMLElement;
    const toastRef = this._cfr.resolveComponentFactory(SdToastControl).create(this._containerRef.injector);
    const toastEl = toastRef.location.nativeElement as HTMLElement;
    containerEl.appendChild(toastEl);
    this._appRef.attachView(toastRef.hostView);

    (toastEl.findAll("._sd-toast-message")[0] as HTMLElement).innerText = message;
    toastRef.instance.useProgress = progress;
    toastRef.instance.progress = 0;

    // repaint
    containerEl.offsetHeight; // tslint:disable-line:no-unused-expression

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
            window.setTimeout(
              () => {
                toastEl.addEventListener("transitionend", () => {
                  toastRef.destroy();
                });
                toastRef.instance.open = false;
                this._appRef.tick();
              },
              1000
            );
          }
        },
        message: (msg: string) => {
          (toastEl.findAll("._sd-toast-message")[0] as HTMLElement).innerText = msg;
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
          this._appRef.tick();
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
