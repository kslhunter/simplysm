import {ApplicationRef, createComponent, inject, Injectable, Type} from "@angular/core";
import {SdModalControl} from "../controls/SdModalControl";

@Injectable({providedIn: "root"})
export class SdModalProvider {
  #appRef = inject(ApplicationRef);

  public modalCount = 0;

  public async showAsync<T extends SdModalBase<any, any>>(modalType: Type<T>,
                                                          title: string,
                                                          param: T["__tInput__"],
                                                          options?: {
                                                            key?: string;
                                                            hideHeader?: boolean;
                                                            hideCloseButton?: boolean;
                                                            useCloseByBackdrop?: boolean;
                                                            useCloseByEscapeKey?: boolean;
                                                            float?: boolean;
                                                            minHeightPx?: number;
                                                            minWidthPx?: number;
                                                            resizable?: boolean;
                                                          }): Promise<T["__tOutput__"] | undefined> {
    return await new Promise<T["__tOutput__"] | undefined>(async (resolve, reject) => {
      try {
        const userModalRef = createComponent(modalType, {
          environmentInjector: this.#appRef.injector
        });

        const modalEntryRef = createComponent(SdModalControl, {
          environmentInjector: this.#appRef.injector,
          projectableNodes: [[userModalRef.location.nativeElement]]
        });

        const modalEntryEl = modalEntryRef.location.nativeElement as HTMLElement;

        const rootComp = this.#appRef.components[0];
        const rootCompEl = rootComp.location.nativeElement as HTMLElement;
        rootCompEl.appendChild(modalEntryEl);

        const prevActiveElement = document.activeElement as HTMLElement | undefined;
        userModalRef.instance.isModal = true;
        userModalRef.instance.title = title;
        userModalRef.instance.close = (value?: T["__tOutput__"]): void => {
          resolve(value);

          modalEntryEl.addEventListener("transitionend", () => {
            userModalRef.destroy();
            modalEntryRef.destroy();
          });
          modalEntryRef.instance.open = false;
          this.modalCount--;

          if (prevActiveElement) {
            prevActiveElement.focus();
          }
        };

        modalEntryRef.instance.key = options?.key;
        modalEntryRef.instance.title = title;
        modalEntryRef.instance.hideHeader = options?.hideHeader ?? false;
        modalEntryRef.instance.hideCloseButton = options?.hideCloseButton ?? false;
        modalEntryRef.instance.useCloseByBackdrop = options?.useCloseByBackdrop ?? true;
        modalEntryRef.instance.useCloseByEscapeKey = options?.useCloseByEscapeKey ?? true;
        modalEntryRef.instance.float = options?.float ?? false;
        modalEntryRef.instance.minHeightPx = options?.minHeightPx;
        modalEntryRef.instance.minWidthPx = options?.minWidthPx;
        modalEntryRef.instance.resizable = options?.resizable ?? false;
        modalEntryRef.instance.openChange.subscribe((value: boolean) => {
          modalEntryRef.instance.open = value;
          if (!modalEntryRef.instance.open) {
            userModalRef.instance.close();
          }
        });

        this.#appRef.attachView(modalEntryRef.hostView);
        this.#appRef.attachView(userModalRef.hostView);

        this.modalCount++;
        modalEntryRef.instance.open = true;
        await userModalRef.instance.sdOnOpen(param);

        modalEntryEl.findFirst<HTMLDivElement>("> ._dialog")!.focus();
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
  public isModal = false;
  public title!: string;

  public abstract sdOnOpen(param: I): void | Promise<void>;

  public close(value?: O): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}
