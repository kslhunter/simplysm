import { ApplicationRef, createComponent, Injectable, Type } from "@angular/core";
import { SdModalControl } from "../controls/SdModalControl";

@Injectable({ providedIn: "root" })
export class SdModalRootProvider {
  public modalCount = 0;

  public constructor(private readonly _appRef: ApplicationRef) {
  }

  public async showAsync<T extends SdModalBase<any, any>>(modalType: Type<T>,
                                                          title: string,
                                                          param: T["__tInput__"],
                                                          options?: {
                                                            key?: string;
                                                            hideHeader?: boolean;
                                                            hideCloseButton?: boolean;
                                                            disableCloseByBackdrop?: boolean;
                                                            disableCloseByEscapeKey?: boolean;
                                                            float?: boolean;
                                                            resizable?: boolean;
                                                            dialogStyle?: string;
                                                          }): Promise<T["__tOutput__"] | undefined> {
    return await new Promise<T["__tOutput__"] | undefined>(async (resolve, reject) => {
      try {
        const contentRef = createComponent(modalType, {
          environmentInjector: this._appRef.injector
        });
        const entryRef = createComponent(SdModalControl, {
          environmentInjector: this._appRef.injector,
          projectableNodes: [[contentRef.location.nativeElement]]
        });
        document.body.appendChild(entryRef.location.nativeElement);

        this._appRef.attachView(contentRef.hostView);
        this._appRef.attachView(entryRef.hostView);

        const prevActiveEl = document.activeElement as HTMLElement | undefined;
        contentRef.instance.close = (value?: T["__tOutput__"]): void => {
          resolve(value);

          entryRef.location.nativeElement.addEventListener("transitionend", () => {
            // contentRef.destroy();
            entryRef.destroy();
          });
          entryRef.setInput("open", false);
          this.modalCount--;

          if (prevActiveEl) {
            prevActiveEl.focus();
          }
        };

        entryRef.setInput("key", options?.key);
        entryRef.setInput("title", title);
        entryRef.setInput("hideHeader", options?.hideHeader);
        entryRef.setInput("hideCloseButton", options?.hideCloseButton);
        entryRef.setInput("disableCloseByBackdrop", options?.disableCloseByBackdrop);
        entryRef.setInput("disableCloseByEscapeKey", options?.disableCloseByEscapeKey);
        entryRef.setInput("float", options?.float);
        entryRef.setInput("resizable", options?.resizable);
        entryRef.setInput("dialogStyle", options?.dialogStyle);

        entryRef.instance.openChange.subscribe((value: boolean) => {
          if (!value) contentRef.instance.close();
        });

        entryRef.location.nativeElement.repaint();

        this.modalCount++;
        entryRef.setInput("open", true);

        await contentRef.instance.sdOnOpen(param);
        contentRef.changeDetectorRef.markForCheck();

        entryRef.location.nativeElement.findFirst("> ._dialog")?.focus();
      }
      catch (err) {
        reject(err);
      }
    });
  }
}

export abstract class SdModalBase<I, O> {
  public __tInput__!: I;
  public __tOutput__!: O;

  public abstract sdOnOpen(param: I): void | Promise<void>;

  public close(value?: O): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}
