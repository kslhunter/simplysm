import {ApplicationRef, createComponent, inject, Injectable, Input, Type} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdPrintProvider {
  #appRef = inject(ApplicationRef);

  async printAsync<T extends SdPrintTemplateBase<any>>(printType: Type<T>,
                                                       param: T["__tInput__"],
                                                       options?: { margin?: string; size?: string }): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        const compRef = createComponent(printType, {
          environmentInjector: this.#appRef.injector
        });

        const compEl = compRef.location.nativeElement as HTMLElement;
        compEl.classList.add("_sd-print-template");

        const styleEl = document.createElement("style");
        styleEl.innerHTML = `   
  @page {
      size: ${options?.size ?? "auto"}; margin: ${options?.margin ?? "0"};
  }
  body > ._sd-print-template { display: none; }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; background: white; }
      body > * { display: none !important; }
      body > ._sd-print-template { display: block !important; }
  }`;

        compRef.instance.param = param;

        compRef.instance.print = () => {
          setTimeout(() => {
            document.body.appendChild(compEl);
            document.head.appendChild(styleEl);
            window.print();
            compRef.destroy();
            styleEl.remove();
            resolve();
          }, 300);
        };

        this.#appRef.attachView(compRef.hostView);
      }
      catch (err) {
        reject(err);
      }
    });
  }
}

@Injectable()
export abstract class SdPrintTemplateBase<I> {
  __tInput__!: I;

  @Input({required: true}) param!: I;

  print() {
    throw new Error("템플릿이 초기화되어있지 않습니다.");
  }
}
