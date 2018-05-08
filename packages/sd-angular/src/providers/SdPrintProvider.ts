import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";
import {SdPrintTemplateBase} from "../bases/SdPrintTemplateBase";

@Injectable()
export class SdPrintProvider {
  public constructor(private readonly _compFactoryResolver: ComponentFactoryResolver,
                     private readonly _appRef: ApplicationRef,
                     private readonly _injector: Injector) {
  }

  public async print<T extends SdPrintTemplateBase<I>, I>(printType: Type<SdPrintTemplateBase<I>>,
                                                          params: T["params"],
                                                          options?: { margin?: string; size?: string }): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      const compRef = this._compFactoryResolver.resolveComponentFactory(printType).create(this._injector);
      const compEl = compRef.location.nativeElement as HTMLElement;
      compEl.classList.add("_sd-print-template");
      document.body.appendChild(compEl);

      const styleEl = document.createElement("style");
      styleEl.innerText = `
@page { size: ${options ? options.size : "auto"}; margin: ${options ? options.margin : "0"}; }
@media print
{
    html, body { -webkit-print-color-adjust: exact; }
    body > * { display: none !important; }
    body > ._sd-print-template { display: block !important; }
}`;
      document.head.appendChild(styleEl);

      try {
        compRef.instance.params = params;
        await compRef.instance.sdBeforeOpen();
      }
      catch (e) {
        compEl.remove();
        styleEl.remove();
        reject(e);
      }

      const prevInitFn = compRef.instance["ngAfterContentInit"];
      compRef.instance["ngAfterContentInit"] = async () => {
        window.print();
        compEl.remove();
        styleEl.remove();
        if (prevInitFn) await prevInitFn();
        resolve();
      };

      this._appRef.attachView(compRef.hostView);
    });
  }
}
