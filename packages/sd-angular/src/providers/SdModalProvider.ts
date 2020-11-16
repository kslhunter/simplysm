import { ComponentFactoryResolver, Injectable, Injector, Type } from "@angular/core";
import { SdModalControl } from "../controls/SdModalControl";
import { SdRootProvider } from "../root-providers/SdRootProvider";

@Injectable({ providedIn: null })
export class SdModalProvider {
  public get modalCount(): number {
    this._root.data.modal = this._root.data.modal ?? {};
    this._root.data.modal.modalCount = this._root.data.modal.modalCount ?? 0;
    return this._root.data.modal.modalCount;
  }

  public set modalCount(value: number) {
    this._root.data.modal = this._root.data.toast ?? {};
    this._root.data.modal.modalCount = value;
  }

  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector,
                     private readonly _root: SdRootProvider) {
  }

  public async showAsync<T extends SdModalBase<any, any>>(modalType: Type<T>,
                                                          title: string,
                                                          param: T["__tInput__"],
                                                          options?: {
                                                            key?: string;
                                                            hideCloseButton?: boolean;
                                                            useCloseByBackdrop?: boolean;
                                                            useCloseByEscapeKey?: boolean;
                                                            float?: boolean;
                                                          }): Promise<T["__tOutput__"] | undefined> {
    return await new Promise<T["__tOutput__"] | undefined>(async (resolve, reject) => {
      try {
        const userModalRef = this._cfr.resolveComponentFactory(modalType).create(this._injector);
        const modalEntryRef = this._cfr.resolveComponentFactory(SdModalControl).create(
          this._injector,
          [[userModalRef.location.nativeElement]]
        );

        const modalEntryEl = modalEntryRef.location.nativeElement as HTMLElement;

        const rootComp = this._root.appRef.components[0];
        const rootCompEl = rootComp.location.nativeElement as HTMLElement;
        rootCompEl.appendChild(modalEntryEl);

        const prevActiveElement = document.activeElement as HTMLElement | undefined;
        userModalRef.instance.isModal = true;
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
        modalEntryRef.instance.hideCloseButton = options?.hideCloseButton;
        modalEntryRef.instance.useCloseByBackdrop = options?.useCloseByBackdrop ?? true;
        modalEntryRef.instance.useCloseByEscapeKey = options?.useCloseByEscapeKey ?? true;
        modalEntryRef.instance.float = options?.float;
        modalEntryRef.instance.openChange.subscribe(() => {
          if (!modalEntryRef.instance.open) {
            userModalRef.instance.close();
          }
        });

        this._root.appRef.attachView(userModalRef.hostView);
        this._root.appRef.attachView(modalEntryRef.hostView);

        this.modalCount++;
        modalEntryRef.instance.open = true;
        await userModalRef.instance.sdOnOpen(param);
        modalEntryEl.findFirst("> ._dialog")?.focus();
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

  public abstract sdOnOpen(param: I): void | Promise<void>;

  public close(value?: O): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}