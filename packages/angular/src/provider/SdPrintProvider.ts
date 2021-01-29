import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";

// @ts-ignore

export abstract class SdPrintTemplateBase<I> {
  public abstract sdOnOpen(param: I): Promise<void>;
}

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
      for (const prevEl of (document.body as Element).findAll("> ._sd-print-template")) {
        document.body.removeChild(prevEl);
      }
      document.body.appendChild(compEl);


      const styleEl = document.createElement("style");
      styleEl.innerHTML = `   
  @page { size: ${options ? options.size : "auto"}; margin: ${options ? options.margin : "0"}; }
  body > ._sd-print-template { display: none !important; }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; background: white !important; }
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
        if (window["cordova"]) {
          window["cordova"].plugins.printer.print("<html>" + document.head.outerHTML + document.body.outerHTML + "</html>");
        }
        else {
          window.print();
        }
        resolve();
        setTimeout(() => {
          compEl.remove();
          styleEl.remove();
        }, 10000);
      });
    });
  }
}
