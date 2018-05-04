import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";
import {SdPrintControlTemplateBase} from "../bases/SdPrintControlTemplateBase";

@Injectable()
export class SdPrintProvider {
  public constructor(private readonly _compFactoryResolver: ComponentFactoryResolver,
                     private readonly _appRef: ApplicationRef,
                     private readonly _injector: Injector) {
  }

  public async print<T extends SdPrintControlTemplateBase<I>, I>(printType: Type<SdPrintControlTemplateBase<I>>,
                                                                 param: T["param"],
                                                                 options?: { margin?: string; size?: string }): Promise<void> {
    await new Promise<void>(async resolve => {
      const compRef = this._compFactoryResolver.resolveComponentFactory(printType).create(this._injector);
      const $comp = $(compRef.location.nativeElement);
      $comp.addClass("_sd-print-template");
      $comp.appendTo($("body"));

      const $style = $("<style></style>");
      $style.text(`
@page { size: ${options ? options.size : "auto"}; margin: ${options ? options.margin : "0"}; }
@media print
{
    html, body { -webkit-print-color-adjust: exact; }
    body > * { display: none !important; }
    body > ._sd-print-template { display: block !important; }
}`);
      $style.appendTo($("head"));

      try {
        compRef.instance.param = param;
        await compRef.instance.sdBeforeOpen();
      } catch (e) {
        throw e;
      }

      this._appRef.attachView(compRef.hostView);
      setTimeout(async () => {
        window.print();
        $comp.remove();
        $style.remove();
        resolve();
      });
    });
  }
}
