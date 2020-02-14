import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";
import {SdModalEntryControl} from "../controls/SdModalEntryControl";

@Injectable()
export class SdModalProvider {
  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector,
                     private readonly _appRef: ApplicationRef) {
  }

  public async showAsync<T extends SdModalBase<any, any>>(modalType: Type<T>,
                                                          param: T["_tInput"],
                                                          options?: {}): Promise<T["_tOutput"] | undefined> {
    return await new Promise<T["_tOutput"] | undefined>((resolve, reject) => {
      try {
        const userModalRef = this._cfr.resolveComponentFactory(modalType).create(this._injector);
        const modalEntryRef = this._cfr.resolveComponentFactory(SdModalEntryControl).create(
          this._injector,
          [[userModalRef.location.nativeElement]]
        );

        const modalEntryEl = modalEntryRef.location.nativeElement as HTMLElement;

        const rootComp = this._appRef.components[0];
        const rootCompEl = rootComp.location.nativeElement as HTMLElement;
        rootCompEl.appendChild(modalEntryEl);

        const prevActiveElement = document.activeElement as HTMLElement | undefined;
        userModalRef.instance.close = (value?: T["_tOutput"]) => {
          resolve(value);

          modalEntryEl.addEventListener("transitionend", () => {
            userModalRef.destroy();
            modalEntryRef.destroy();
          });
          modalEntryRef.instance.open = false;

          if (prevActiveElement) {
            prevActiveElement.focus();
          }
        };

        this._appRef.attachView(userModalRef.hostView);
        this._appRef.attachView(modalEntryRef.hostView);

        const maxZIndex = document.body.findAll("sd-modal")
          .max((el) => Number(getComputedStyle(el).zIndex));
        if (maxZIndex) {
          modalEntryEl.style.zIndex = (maxZIndex + 1).toString();
        }

        modalEntryEl.findFocusableAll()[0]?.focus();
      }
      catch (err) {
        reject(err);
      }
    });
  }
}

export abstract class SdModalBase<I, O> {
  public _tInput!: I;
  public _tOutput!: O;

  public close(value?: O): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}