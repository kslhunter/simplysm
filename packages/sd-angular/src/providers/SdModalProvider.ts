import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";
import {SdModalBase} from "../bases/SdModalBase";
import {SdModalControl} from "../controls/SdModalControl";

@Injectable()
export class SdModalProvider {
  public constructor(private readonly _compFactoryResolver: ComponentFactoryResolver,
                     private readonly _appRef: ApplicationRef,
                     private readonly _injector: Injector) {
  }

  public async show<T extends SdModalBase<I, O>, I, O>(title: string,
                                                       modalType: Type<SdModalBase<I, O>>,
                                                       params: T["params"],
                                                       options?: { hideCloseButton?: boolean }): Promise<O> {
    return await new Promise<O>(async (resolve, reject) => {
      const compRef = this._compFactoryResolver.resolveComponentFactory(modalType).create(this._injector);
      const modalRef = this._compFactoryResolver.resolveComponentFactory(SdModalControl).create(
        this._injector,
        [[compRef.location.nativeElement]]
      );
      const modalEl = modalRef.location.nativeElement as HTMLElement;
      const rootEl = this._appRef.components[0].location.nativeElement as HTMLElement;
      rootEl.appendChild(modalEl);

      const prevFocusedEl = document.activeElement as HTMLElement | undefined;
      const close = () => {
        compRef.destroy();
        modalRef.destroy();
        if (prevFocusedEl) prevFocusedEl.focus();
      };

      modalRef.instance.title = title;
      modalRef.instance.hideCloseButton = options && options.hideCloseButton;
      modalRef.instance.openChange.subscribe((open: boolean) => {
        if (open) return;
        close();
        resolve();
      });

      compRef.instance.close = (value: any) => {
        close();
        resolve(value);
      };

      try {
        compRef.instance.params = params;
        await compRef.instance.sdBeforeOpen();
      }
      catch (e) {
        close();
        reject(e);
      }

      this._appRef.attachView(compRef.hostView);
      this._appRef.attachView(modalRef.hostView);
    });
  }
}
