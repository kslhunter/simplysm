import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";

@Injectable()
export class SdPrintProvider {
  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _appRef: ApplicationRef,
                     private readonly _injector: Injector) {
  }

  public async print<T extends SdPrintTemplateBase<I>, I>(printType: Type<SdPrintTemplateBase<I>>,
                                                          param: I,
                                                          options?: { margin?: string; size?: string }): Promise<void> {
    await new Promise<void>(async resolve => {
      const compRef = this._cfr.resolveComponentFactory(printType).create(this._injector);
      const compEl = compRef.location.nativeElement;
      compEl.classList.add("_sd-print-template");
      document.body.appendChild(compEl);

      const styleEl = document.createElement("style");
      styleEl.innerHTML = `   
  @page { size: ${options ? options.size : "auto"}; margin: ${options ? options.margin : "0"}; }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; }
      body > * { display: none !important; }
      body > ._sd-print-template { display: block !important; }
  }`;
      document.head!.appendChild(styleEl);

      try {
        await compRef.instance.sdOnOpen(param);
      }
      catch (e) {
        throw e;
      }

      this._appRef.attachView(compRef.hostView);
      setTimeout(async () => {
        window.print();
        compEl.remove();
        styleEl.remove();
        resolve();
      });
    });
  }
}

export abstract class SdPrintTemplateBase<I> {
  public abstract sdOnOpen(param: I): Promise<void>;
}
