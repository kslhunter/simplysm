import { ComponentFactoryResolver, Injectable, Injector, Type } from "@angular/core";
import { SdRootProvider } from "../root-providers/SdRootProvider";

@Injectable({ providedIn: null })
export class SdPrintProvider {
  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector,
                     private readonly _root: SdRootProvider) {
  }

  public async printAsync<T extends SdPrintTemplateBase<I>, I>(printType: Type<SdPrintTemplateBase<I>>,
                                                               param: I,
                                                               options?: { margin?: string; size?: string }): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      try {
        const compRef = this._cfr.resolveComponentFactory(printType).create(this._injector);
        const compEl = compRef.location.nativeElement;
        compEl.classList.add("_sd-print-template");
        document.body.appendChild(compEl);

        const styleEl = document.createElement("style");
        styleEl.innerHTML = `   
  @page { size: ${options?.size ?? "auto"}; margin: ${options?.margin ?? "0"}; }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; }
      body > * { display: none !important; }
      body > ._sd-print-template { display: block !important; }
  }`;
        document.head.appendChild(styleEl);

        await compRef.instance.sdOnOpen(param);

        this._root.appRef.attachView(compRef.hostView);
        setTimeout(() => {
          window.print();
          compEl.remove();
          styleEl.remove();
          resolve();
        });
      }
      catch (err) {
        reject(err);
      }
    });
  }
}

export abstract class SdPrintTemplateBase<I> {
  public abstract sdOnOpen(param: I): Promise<void>;
}
