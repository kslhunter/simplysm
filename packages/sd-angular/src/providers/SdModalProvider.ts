import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";
import {SdModalControlBase} from "../bases/SdModalControlBase";
import {SdModalControl} from "../entry-controls/SdModalControl";

@Injectable()
export class SdModalProvider {
  public get hasOpenModal(): boolean {
    return $("._sd-modal").length > 0;
  }

  public constructor(private readonly _compFactoryResolver: ComponentFactoryResolver,
                     private readonly _appRef: ApplicationRef,
                     private readonly _injector: Injector) {
  }

  public async show<T extends SdModalControlBase<I, O>, I, O>(title: string,
                                                              modalType: Type<SdModalControlBase<I, O>>,
                                                              param: T["param"],
                                                              options?: { hideCloseButton?: boolean }): Promise<O> {
    return await new Promise<O>(async resolve => {
      const compRef = this._compFactoryResolver.resolveComponentFactory(modalType).create(this._injector);
      const modalRef = this._compFactoryResolver.resolveComponentFactory(SdModalControl).create(
        this._injector,
        [[compRef.location.nativeElement]]
      );
      const $modal = $(modalRef.location.nativeElement);

      const rootComp = this._appRef.components[0];
      const $rootComp = $(rootComp.location.nativeElement);
      $rootComp.append($modal);

      const activeElement = document.activeElement;
      const close = async (value?: any) => {
        $modal.css("pointer-events", "none");
        $modal.one("transitionend", () => {
          compRef.destroy();
          modalRef.destroy();
          resolve(value);
        });
        $modal.removeClass("_open");
        $(activeElement).trigger("focus");
      };

      modalRef.instance.title = title;
      modalRef.instance.hideCloseButton = !!(options && options.hideCloseButton);
      modalRef.instance.close.subscribe(async () => {
        await close();
      });

      compRef.instance.close = close.bind(this);
      try {
        compRef.instance.param = param;
        await compRef.instance.sdBeforeOpen();
      } catch (e) {
        await close();
        throw e;
      }

      this._appRef.attachView(compRef.hostView);
      this._appRef.attachView(modalRef.hostView);
    });
  }
}
