import {
  ApplicationRef,
  createComponent,
  inject,
  Injectable,
  inputBinding,
  type Signal,
  Type,
} from "@angular/core";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import type { TDirectiveInputSignals } from "../../utils/TDirectiveInputSignals";
import { Wait } from "@simplysm/sd-core-common";
import { SdBusyProvider } from "../../../ui/overlay/busy/sd-busy.provider";

@Injectable({ providedIn: "root" })
export class SdPrintProvider {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _sdBusy = inject(SdBusyProvider);

  async printAsync<T extends ISdPrint>(
    template: ISdPrintInput<T>,
    options?: {
      size?: string;
      margin?: string;
    },
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        //-- busy
        this._sdBusy.globalBusyCount.update((v) => v + 1);

        //-- comp
        const inputs = template.inputs as Record<string, any>;
        const compRef = createComponent(template.type, {
          environmentInjector: this._appRef.injector,
          bindings: [
            ...Object.keys(inputs).map((inputKey) =>
              inputBinding(inputKey, () => inputs[inputKey]),
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
            await Wait.until(() => compRef.instance.initialized());
            await this._waitForAllImagesLoadedAsync(compEl);

            window.print();
            resolve();
          } catch (err) {
            reject(err);
          } finally {
            try {
              this._sdBusy.globalBusyCount.update((v) => v - 1);
              styleEl.remove();
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
        //-- busy
        this._sdBusy.globalBusyCount.update((v) => v + 1);

        //-- comp
        const inputs = template.inputs as Record<string, any>;
        const compRef = createComponent(template.type, {
          environmentInjector: this._appRef.injector,
          bindings: [
            ...Object.keys(inputs).map((inputKey) =>
              inputBinding(inputKey, () => inputs[inputKey]),
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
            await Wait.until(() => compRef.instance.initialized());
            await this._waitForAllImagesLoadedAsync(compEl);

            const doc = new jsPDF(options?.orientation ?? "p", "pt", "a4");
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.deletePage(1);

            let els = compEl.findAll<HTMLElement>(".page");
            els = els.length > 0 ? els : [compEl];

            for (const el of els) {
              el.style.width = pageWidth + "pt";

              const canvas = await htmlToImage.toCanvas(el, {
                backgroundColor: "white",
                pixelRatio: 4,
              });

              // 가로 기준으로 비율 맞추기
              const imgWidth = pageWidth;
              const imgHeight = canvas.height * (pageWidth / canvas.width);

              doc.addPage("a4", options?.orientation ?? "p").addImage({
                imageData: canvas,
                x: 0,
                y: 0,

                width: imgWidth,
                height: imgHeight,
              });
            }

            const arrayBuffer = doc.output("arraybuffer");

            resolve(Buffer.from(arrayBuffer));
          } catch (err) {
            reject(err);
          } finally {
            try {
              this._sdBusy.globalBusyCount.update((v) => v - 1);
              styleEl.remove();
              compRef.destroy();
            } catch {}
          }
        });
      } catch (err) {
        reject(err);
      }
    });
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
