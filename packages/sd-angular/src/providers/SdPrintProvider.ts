import {ApplicationRef, createComponent, inject, Injectable, Input, Type} from "@angular/core";
import {jsPDF} from "jspdf";
import * as htmlToImage from "html-to-image";

@Injectable({providedIn: "root"})
export class SdPrintProvider {
  #appRef = inject(ApplicationRef);

  async printAsync<T extends SdPrintTemplateBase<any>>(printType: Type<T>,
                                                       param: T["__tInput__"],
                                                       options?: {
                                                         orientation?: "portrait" | "landscape"
                                                       }): Promise<void> {
    await new Promise<void>((resolve) => {
      //-- comp
      const compRef = createComponent(printType, {
        environmentInjector: this.#appRef.injector
      });
      compRef.instance.param = param;

      const compEl = compRef.location.nativeElement as HTMLElement;
      compEl.classList.add("_sd-print-template");

      //-- style
      const styleEl = document.createElement("style");
      styleEl.innerHTML = `   
  @page {
      size: ${options?.orientation ?? "portrait"}; margin: 0;
  }
  body > ._sd-print-template { display: none; }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; background: white; }
      body > * { display: none !important; }
      body > ._sd-print-template { display: block !important; }
  }`;

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
    });
  }

  async getPdfBufferAsync<T extends SdPrintTemplateBase<any>>(printType: Type<T>,
                                                              param: T["__tInput__"],
                                                              options?: {
                                                                orientation?: "portrait" | "landscape"
                                                              }): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      try {
        //-- comp
        const compRef = createComponent(printType, {
          environmentInjector: this.#appRef.injector
        });
        compRef.instance.param = param;

        const compEl = compRef.location.nativeElement as HTMLElement;
        compEl.classList.add("_sd-print-template");

        //-- style
        const styleEl = document.createElement("style");
        styleEl.innerHTML = `html, body { overflow: hidden }`;

        compRef.instance.print = () => {
          setTimeout(async () => {
            try {
              document.body.appendChild(compEl);
              document.head.appendChild(styleEl);

              const doc = new jsPDF(options?.orientation ?? "p", "pt", "a4");
              doc.deletePage(1);

              let els = compEl.findAll<HTMLElement>("sd-print-page");
              els = els.length > 0 ? els : [compEl];

              for (const el of els) {
                /*const canvas = await html2canvas(el, {
                  foreignObjectRendering: true,
                  y: -el.offsetTop,
                  scale: 4,
                  width: el.offsetWidth,
                  height: el.offsetHeight,
                  windowWidth: el.offsetWidth,
                  windowHeight: el.offsetHeight
                });*/
                const canvas = await htmlToImage.toCanvas(el, {
                  backgroundColor: "white",
                  pixelRatio: 4
                });

                const orientation = el.getAttribute("sd-orientation") as "landscape" | "portrait" | undefined;
                doc.addPage("a4", orientation ?? "p").addImage({
                  imageData: canvas,
                  x: 0,
                  y: 0,
                  ...orientation === "landscape" ? {
                    height: 841.89,
                    width: 595.28
                  } : {
                    width: 595.28,
                    height: 841.89
                  }
                });
              }

              const arrayBuffer = doc.output("arraybuffer");

              compRef.destroy();
              styleEl.remove();

              resolve(Buffer.from(arrayBuffer));
            }
            catch (err) {
              reject(err);
            }
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
