import {ApplicationRef, ComponentFactoryResolver, ComponentRef, Injectable, Injector} from "@angular/core";
import {Type} from "@simplysm/sd-core";
import {SdModalControl} from "./SdModalControl";

@Injectable()
export class SdModalProvider {
  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector,
                     private readonly _appRef: ApplicationRef) {
  }

  public modalCount = 0;

  public async show<T extends SdModalBase<any, any>>(modalType: Type<T>, title: string, param: T["_tParam"], option?: { hideCloseButton?: boolean; float?: boolean; minHeight?: string; minWidth?: string; useCloseByBackdrop?: boolean; onModalRefCreated?: (modalRef: ComponentRef<SdModalControl>) => void }): Promise<T["_tResult"] | undefined> {
    this.modalCount++;

    return await new Promise<T["_tResult"]>(resolve => {
      const compRef = this._cfr.resolveComponentFactory(modalType).create(this._injector);
      const rootComp = this._appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;

      const modalRef = this._cfr.resolveComponentFactory(SdModalControl).create(
        this._injector,
        [[compRef.location.nativeElement]]
      );
      if (option && option.onModalRefCreated) {
        option.onModalRefCreated(modalRef);
      }

      const modalEl = modalRef.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(modalEl);

      const activeElement = document.activeElement as HTMLElement | undefined;
      const close = (value?: any) => {
        resolve(value);

        modalEl.addEventListener("transitionend", () => {
          compRef.destroy();
          modalRef.destroy();
        });
        modalRef.instance.open = false;

        if (activeElement) {
          activeElement.focus();
        }

        this.modalCount--;
      };

      modalRef.instance.title = title;
      modalRef.instance.hideCloseButton = option && option.hideCloseButton;
      modalRef.instance.useCloseByBackdrop = option && option.useCloseByBackdrop;
      modalRef.instance.float = option && option.float;
      modalRef.instance.minHeight = option && option.minHeight;
      modalRef.instance.minWidth = option && option.minWidth;
      modalRef.instance.close.subscribe(() => {
        close();
      });
      modalRef.instance.closeButtonClickHandler = () => {
        return compRef.instance.closeButtonClickHandler
          ? compRef.instance.closeButtonClickHandler.bind(compRef.instance)()
          : true;
      };

      compRef.instance.close = close.bind(this); //tslint:disable-line:unnecessary-bind

      setTimeout(async () => {
        this._appRef.attachView(compRef.hostView);
        this._appRef.attachView(modalRef.hostView);
        this._appRef.tick();

        try {
          if (activeElement) {
            activeElement.blur();
          }
          modalRef.instance.open = true;
          this._appRef.tick();
          await compRef.instance.sdOnOpen(param);
          this._appRef.tick();
          if (!document.activeElement || !document.activeElement.findParent(modalRef.location.nativeElement)) {
            const maxZIndex = document.body.findAll("sd-modal").max(el => Number(getComputedStyle(el).zIndex)) || 4000;
            modalEl.style.zIndex = (maxZIndex + 1).toString();
            (modalEl.findAll("> ._dialog")[0] as HTMLElement).focus();
          }
        }
        catch (e) {
          close();
          throw e;
        }
      });
    });
  }
}

export abstract class SdModalBase<P, R> {
  public _tParam!: P;
  public _tResult!: R;

  public abstract sdOnOpen(param: P): void | Promise<void>;

  public closeButtonClickHandler?: () => boolean | Promise<boolean>;

  public close: (value?: R) => void = (value?: R) => {
    throw new Error("모달이 초기화되어있지 않습니다.");
  };
}
