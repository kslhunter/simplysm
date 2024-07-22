import {ApplicationRef, createComponent, inject, Injectable, Type} from "@angular/core";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";

@Injectable({providedIn: "root"})
export class SdPrintProvider {
  #appRef = inject(ApplicationRef);

  async printAsync<I>(printType: Type<SdPrintTemplateBase<I>>,
                      param: I,
                      options?: { margin?: string; size?: string }): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      try {
        const compRef = createComponent(printType, {
          environmentInjector: this.#appRef.injector
        });
        const compEl = compRef.location.nativeElement;
        compEl.classList.add("_sd-print-template");
        document.body.appendChild(compEl);

        const styleEl = document.createElement("style");
        styleEl.innerHTML = `   
  @page {
      size: ${options?.size ?? "auto"}; margin: ${options?.margin ?? "0"};
  }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; background: white; }
      body > * { display: none !important; }
      body > ._sd-print-template { display: block !important; }
  }`;
        document.head.appendChild(styleEl);

        this.#appRef.attachView(compRef.hostView);
        await compRef.instance.sdOnOpen(param);

        setTimeout(() => {
          window.print();
          compRef.destroy();
          styleEl.remove();
          resolve();
        }, 300);
      }
      catch (err) {
        reject(err);
      }
    });
  }

  async getPdfBufferAsync<I>(printType: Type<SdPrintTemplateBase<I>>,
                             param: I,
                             options?: {
                               orientation?: "p" | "portrait" | "l" | "landscape",
                             }): Promise<Buffer> {
    return await new Promise<Buffer>(async (resolve, reject) => {
      try {
        const compRef = createComponent(printType, {
          environmentInjector: this.#appRef.injector
        });
        const compEl = compRef.location.nativeElement as HTMLElement;
        compEl.classList.add("_sd-print-template");
        document.body.appendChild(compEl);

        this.#appRef.attachView(compRef.hostView);
        await compRef.instance.sdOnOpen(param);

        const styleEl = document.createElement("style");
        styleEl.innerHTML = `html, body { overflow: hidden }`;
        document.head.appendChild(styleEl);

        setTimeout(async () => {
          try {
            const doc = new jsPDF(options?.orientation ?? "p", "pt", "a4");
            doc.deletePage(1);

            let els = compEl.findAll<HTMLElement>("sd-print-page");
            els = els.length > 0 ? els : [compEl];

            for (const el of els) {
              /*const image = await html2canvas(el, {
                foreignObjectRendering: true,
                y: -el.offsetTop,
                scale: 4,
                width: el.offsetWidth,
                height: el.offsetHeight,
                windowWidth: el.offsetWidth,
                windowHeight: el.offsetHeight
              });*/
              const image = await htmlToImage.toJpeg(el, {
                backgroundColor: "white",
                pixelRatio: 4,
              });

              const orientation = el.getAttribute("sd-orientation") as "landscape" | "portrait" | undefined;
              doc.addPage("a4", orientation ?? "p").addImage({
                imageData: image, //canvas,
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

            // reject(new Error(`테스트`));
            resolve(Buffer.from(arrayBuffer));
          }
          catch (err) {
            reject(err);
          }
        }, 300);
      }
      catch (err) {
        reject(err);
      }
    });
  }
}

export abstract class SdPrintTemplateBase<I> {
  abstract sdOnOpen(param: I): void | Promise<void>;
}
