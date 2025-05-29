import {
  ApplicationRef,
  createComponent,
  inject,
  Injectable,
  inputBinding,
  Signal,
  Type,
} from "@angular/core";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import { TDirectiveInputSignals } from "../utils/types";
import { Wait } from "@simplysm/sd-core-common";

@Injectable({ providedIn: "root" })
export class SdPrintProvider {
  private _appRef = inject(ApplicationRef);

  async printAsync<T extends ISdPrint>(
    template: ISdPrintInput<T>,
    options?: {
      size?: string;
      margin?: string;
    },
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        //-- comp
        const compRef = createComponent(template.type, {
          environmentInjector: this._appRef.injector,
          bindings: [
            ...Object.keys(template.inputs).map((inputKey) =>
              inputBinding(inputKey, () => template.inputs[inputKey]),
            ),
          ],
        });

        const compEl = compRef.location.nativeElement as HTMLElement;
        compEl.classList.add("_sd-print-template");

        //-- style
        const styleEl = document.createElement("style");
        styleEl.innerHTML = `
  @page {
      size: ${options?.size ?? "A4 auto"};
      margin: ${options?.margin ?? "0"};
  }
  body > ._sd-print-template { display: none; }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; background: white; }
      body > * { display: none !important; }
      body > ._sd-print-template { display: block !important; }
  }`;

        this._appRef.attachView(compRef.hostView);

        //-- print
        document.body.appendChild(compEl);
        document.head.appendChild(styleEl);

        requestAnimationFrame(async () => {
          try {
            await this._waitForBusyCount(compRef.instance.initialized);
            await this._waitForAllImagesLoadedAsync(compEl);

            window.print();
            resolve();
          } catch (err) {
            reject(err);
          } finally {
            try {
              styleEl.remove();
              compEl.remove();
              compRef.destroy();
            } catch {}
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async getPdfBufferAsync<T extends ISdPrint>(
    template: ISdPrintInput<T>,
    options?: {
      orientation?: "portrait" | "landscape";
    },
  ): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      try {
        //-- comp
        const compRef = createComponent(template.type, {
          environmentInjector: this._appRef.injector,
          bindings: [
            ...Object.keys(template.inputs).map((inputKey) =>
              inputBinding(inputKey, () => template.inputs[inputKey]),
            ),
          ],
        });

        const compEl = compRef.location.nativeElement as HTMLElement;
        compEl.classList.add("_sd-print-template");

        //-- style
        const styleEl = document.createElement("style");
        styleEl.innerHTML = `html, body { overflow: hidden }`;

        this._appRef.attachView(compRef.hostView);

        //-- print
        document.body.appendChild(compEl);
        document.head.appendChild(styleEl);

        requestAnimationFrame(async () => {
          try {
            await this._waitForBusyCount(compRef.instance.initialized);
            await this._waitForAllImagesLoadedAsync(compEl);

            const doc = new jsPDF(options?.orientation ?? "p", "pt", "a4");
            doc.deletePage(1);

            let els = compEl.findAll<HTMLElement>("sd-print-page");
            els = els.length > 0 ? els : [compEl];

            for (const el of els) {
              const canvas = await htmlToImage.toCanvas(el, {
                backgroundColor: "white",
                pixelRatio: 4,
              });

              const orientation = el.getAttribute("sd-orientation") as
                | "landscape"
                | "portrait"
                | undefined;
              doc.addPage("a4", orientation ?? "p").addImage({
                imageData: canvas,
                x: 0,
                y: 0,
                ...(orientation === "landscape"
                  ? {
                      height: 841.89,
                      width: 595.28,
                    }
                  : {
                      width: 595.28,
                      height: 841.89,
                    }),
              });
            }

            const arrayBuffer = doc.output("arraybuffer");

            resolve(Buffer.from(arrayBuffer));
          } catch (err) {
            reject(err);
          } finally {
            try {
              styleEl.remove();
              compEl.remove();
              compRef.destroy();
            } catch {}
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private async _waitForBusyCount(initialized?: Signal<boolean>) {
    await Wait.until(() => initialized == null || initialized());
  }

  private async _waitForAllImagesLoadedAsync(container: HTMLElement): Promise<void> {
    const imgs = Array.from(container.querySelectorAll("img"));

    await Promise.all(
      imgs.map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth !== 0) {
            resolve(); // 이미 로드된 이미지
          } else {
            const onLoad = () => {
              img.removeEventListener("load", onLoad);
              img.removeEventListener("error", onLoad);
              resolve();
            };
            img.addEventListener("load", onLoad);
            img.addEventListener("error", onLoad); // 오류도 포함 (선택)
          }
        });
      }),
    );
  }
}

export interface ISdPrint {
  initialized: Signal<boolean>;
}

export interface ISdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
