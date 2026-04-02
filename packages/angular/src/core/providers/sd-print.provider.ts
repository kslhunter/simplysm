import {
  ApplicationRef,
  createComponent,
  inject,
  Injectable,
  inputBinding,
  type Signal,
  type Type,
} from "@angular/core";
import type { TDirectiveInputSignals, TWithOptional } from "../utils/TDirectiveInputSignals";
import { SdBusyProvider } from "../../ui/overlay/busy/sd-busy.provider";
import { wait } from "@simplysm/core-common";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";

export interface ISdPrint {
  initialized: Signal<boolean>;
  readonly _optionalPrintInputs?: string;
}

type TSdPrintOptionalKeys<T> = T extends { _optionalPrintInputs?: infer K extends string }
  ? K
  : never;

export interface ISdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: TWithOptional<
    Omit<TDirectiveInputSignals<T>, "_optionalPrintInputs" | X>,
    TSdPrintOptionalKeys<T> & keyof Omit<TDirectiveInputSignals<T>, "_optionalPrintInputs" | X>
  >;
}

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
    this._sdBusy.globalBusyCount.update((v) => v + 1);
    try {
      const compRef = createComponent(template.type, {
        environmentInjector: this._appRef.injector,
        bindings: [
          ...Object.keys(template.inputs).map((inputKey) =>
            inputBinding(inputKey, () => (template.inputs as Record<string, unknown>)[inputKey]),
          ),
        ],
      });

      const compEl = compRef.location.nativeElement as HTMLElement;
      compEl.classList.add("_sd-print-template");

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
      document.body.appendChild(compEl);
      document.head.appendChild(styleEl);

      try {
        this._appRef.tick();
        await wait.until(() => compRef.instance.initialized(), 100, 300);
        await this._waitForAllImagesLoadedAsync(compEl);

        window.print();
      } finally {
        styleEl.remove();
        compEl.remove();
        compRef.destroy();
      }
    } finally {
      this._sdBusy.globalBusyCount.update((v) => v - 1);
    }
  }

  async getPdfBufferAsync<T extends ISdPrint>(
    template: ISdPrintInput<T>,
    options?: {
      orientation?: "portrait" | "landscape";
      pageSize?: string;
    },
  ): Promise<Uint8Array> {
    this._sdBusy.globalBusyCount.update((v) => v + 1);
    try {
      const compRef = createComponent(template.type, {
        environmentInjector: this._appRef.injector,
        bindings: [
          ...Object.keys(template.inputs).map((inputKey) =>
            inputBinding(inputKey, () => (template.inputs as Record<string, unknown>)[inputKey]),
          ),
        ],
      });

      const compEl = compRef.location.nativeElement as HTMLElement;
      compEl.classList.add("_sd-print-template");

      const styleEl = document.createElement("style");
      styleEl.innerHTML = `html, body { overflow: hidden }`;

      this._appRef.attachView(compRef.hostView);
      document.body.appendChild(compEl);
      document.head.appendChild(styleEl);

      const headStylesBefore = new Set(document.head.querySelectorAll("style"));

      try {
        this._appRef.tick();
        await wait.until(() => compRef.instance.initialized(), 100, 300);
        await this._waitForAllImagesLoadedAsync(compEl);

        const pageSize = options?.pageSize ?? "a4";
        const orientation = options?.orientation ?? "p";
        const doc = new jsPDF(orientation, "pt", pageSize);
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.deletePage(1);

        let els = Array.from(compEl.querySelectorAll<HTMLElement>(".page"));
        if (els.length === 0) {
          els = [compEl];
        }

        for (const el of els) {
          el.style.width = pageWidth + "pt";

          const canvas = await htmlToImage.toCanvas(el, {
            backgroundColor: "white",
            pixelRatio: 4,
          });

          const imgWidth = pageWidth;
          const imgHeight = canvas.height * (pageWidth / canvas.width);

          doc.addPage(pageSize, orientation).addImage({
            imageData: canvas,
            x: 0,
            y: 0,
            width: imgWidth,
            height: imgHeight,
          });
        }

        const arrayBuffer = doc.output("arraybuffer");
        return new Uint8Array(arrayBuffer);
      } finally {
        styleEl.remove();
        for (const s of document.head.querySelectorAll("style")) {
          if (!headStylesBefore.has(s)) {
            s.remove();
          }
        }
        compEl.remove();
        compRef.destroy();
      }
    } finally {
      this._sdBusy.globalBusyCount.update((v) => v - 1);
    }
  }

  private async _waitForAllImagesLoadedAsync(container: HTMLElement): Promise<void> {
    const imgs = Array.from(container.querySelectorAll("img"));

    await Promise.all(
      imgs.map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth !== 0) {
            resolve();
          } else {
            const onDone = () => {
              img.removeEventListener("load", onDone);
              img.removeEventListener("error", onDone);
              resolve();
            };
            img.addEventListener("load", onDone);
            img.addEventListener("error", onDone);
          }
        });
      }),
    );
  }
}
