import { ApplicationRef, ComponentRef, createComponent, Injectable } from "@angular/core";
import { TSdTheme } from "../commons";
import { SdToastContainerControl } from "../controls/SdToastContainerControl";
import { SdToastControl } from "../controls/SdToastControl";
import { Type } from "@simplysm/sd-core-common";
import { SdSystemLogRootProvider } from "./SdSystemLogRootProvider";

@Injectable({ providedIn: "root" })
export class SdToastRootProvider {
  public alertThemes: TSdTheme[] = [];

  private readonly _containerCompEl: HTMLElement;

  public constructor(private readonly _appRef: ApplicationRef,
                     private readonly _systemLog: SdSystemLogRootProvider) {
    const containerCompRef = this._attachControl(document.body, SdToastContainerControl);
    this._containerCompEl = containerCompRef.location.nativeElement as HTMLElement;
  }

  public async tryAsync<R>(fn: () => Promise<R> | R, messageFn?: (err: Error) => string): Promise<R | undefined> {
    try {
      return await fn();
    }
    catch (err) {
      if (err instanceof Error) {
        if (messageFn) {
          this.show("danger", messageFn(err));
        }
        else {
          this.show("danger", err.message);
        }

        await this._systemLog.writeAsync("error", err.stack);

        return undefined;
      }
      else {
        throw err;
      }
    }
  }

  public show<T extends boolean>(theme: TSdTheme, message: string, useProgress?: T): (T extends true ? ISdProgressToast : void) {
    if (this.alertThemes.includes(theme)) {
      alert(message);
      return undefined as any;
    }

    const compRef = this._attachControl(this._containerCompEl, SdToastControl);

    compRef.setInput("theme", theme);
    compRef.setInput("message", message);
    compRef.setInput("open", true);

    if (useProgress) {
      compRef.setInput("progress", 0);

      return {
        progress: (percent: number) => {
          compRef.setInput("progress", percent);
          if (percent >= 100) {
            this._closeAfterTime(compRef, 1000);
          }
        },
        message: (msg: string) => {
          compRef.setInput("message", msg);
        }
      } as any;
    }
    else {
      this._closeAfterTime(compRef, 5000);
      return undefined as any;
    }
  }

  private _closeAfterTime(compRef: ComponentRef<SdToastControl>, ms: number): void {
    const compEl = compRef.location.nativeElement as HTMLElement;

    window.setTimeout(
      () => {
        if (compEl.matches(":hover")) {
          this._closeAfterTime(compRef, ms);
        }
        else {
          compEl.addEventListener("transitionend", () => {
            compRef.destroy();
          });
          compRef.setInput("open", false);
        }
      },
      ms
    );
  }

  private _attachControl<T>(containerEl: HTMLElement, controlType: Type<T>): ComponentRef<T> {
    const controlRef = createComponent(controlType, {
      environmentInjector: this._appRef.injector
    });
    const controlEl = controlRef.location.nativeElement;
    containerEl.appendChild(controlEl);
    this._appRef.attachView(controlRef.hostView);

    containerEl.repaint();

    return controlRef;
  }
}


export interface ISdProgressToast {
  progress(percent: number): void;

  message(msg: string): void;
}
