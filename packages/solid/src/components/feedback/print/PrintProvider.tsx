import { type ParentComponent, createSignal, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import { useBusy } from "../busy/BusyContext";
import { PrintContext, type PrintContextValue, type PrintOptions } from "./PrintContext";
import { PrintInstanceContext, type PrintInstance } from "./PrintInstanceContext";

// --- Paper size constants (pt) ---

const PAPER_SIZES: Partial<Record<string, [number, number]>> = {
  a3: [841.89, 1190.55],
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
};

// --- Internal helpers ---

function parseDimension(dim: string): number {
  const num = parseFloat(dim);
  if (dim.endsWith("mm")) return num * 2.83465;
  if (dim.endsWith("cm")) return num * 28.3465;
  if (dim.endsWith("in")) return num * 72;
  return num; // pt
}

function parseSize(size?: string): { width: number; height: number; orientation: "p" | "l" } {
  const s = (size ?? "A4").toLowerCase().trim();
  const landscape = s.includes("landscape");
  const cleanSize = s.replace(/\s*(landscape|portrait)\s*/g, "").trim();

  const paperSize = PAPER_SIZES[cleanSize];
  if (paperSize) {
    const [w, h] = paperSize;
    if (landscape) return { width: h, height: w, orientation: "l" };
    return { width: w, height: h, orientation: "p" };
  }

  const parts = cleanSize.split(/\s+/);
  if (parts.length === 2) {
    const w = parseDimension(parts[0]);
    const h = parseDimension(parts[1]);
    return { width: w, height: h, orientation: w > h ? "l" : "p" };
  }

  return { width: 595.28, height: 841.89, orientation: "p" };
}

function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  ).then(() => undefined);
}

// --- Job type for reactive rendering ---

interface PrintJob {
  factory: () => JSX.Element;
  instance: PrintInstance;
  onRendered: (container: HTMLDivElement) => void;
}

/**
 * Print Provider
 *
 * @remarks
 * - Factory content is rendered within the Provider's own reactive tree,
 *   so it can access all contexts above PrintProvider
 * - Uses Portal + hidden div for off-screen rendering
 * - BusyProvider must be an ancestor (useBusy dependency)
 */
export const PrintProvider: ParentComponent = (props) => {
  const busy = useBusy();
  const [currentJob, setCurrentJob] = createSignal<PrintJob | null>(null);

  function renderAndWait(factory: () => JSX.Element): Promise<HTMLDivElement> {
    return new Promise<HTMLDivElement>((resolve) => {
      let resolveReady: (() => void) | undefined;
      const state = { readyCalled: false };

      const readyPromise = new Promise<void>((readyResolve) => {
        resolveReady = readyResolve;
      });

      const instance: PrintInstance = {
        ready: () => {
          state.readyCalled = true;
          resolveReady?.();
        },
      };

      const onRendered = (container: HTMLDivElement): void => {
        // Wait for mount + optional ready() call
        const finalize = async (): Promise<void> => {
          await Promise.resolve();

          if (!state.readyCalled) {
            await new Promise<void>((rAFResolve) => {
              requestAnimationFrame(() => rAFResolve());
            });
          }

          if (state.readyCalled) {
            await readyPromise;
          }

          await waitForImages(container);
          resolve(container);
        };

        void finalize();
      };

      setCurrentJob({ factory, instance, onRendered });
    });
  }

  const toPrinter = async (factory: () => JSX.Element, options?: PrintOptions): Promise<void> => {
    busy.show();
    let styleEl: HTMLStyleElement | undefined;

    try {
      const container = await renderAndWait(factory);

      container.style.position = "static";
      container.style.left = "auto";
      container.classList.add("_sd-print-target");

      styleEl = document.createElement("style");
      styleEl.textContent = `
        @page {
          size: ${options?.size ?? "A4"};
          margin: ${options?.margin ?? "0"};
        }
        body > ._sd-print-target { display: none; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; background: white; }
          body > * { display: none !important; }
          body > ._sd-print-target { display: block !important; }
        }
      `;
      document.head.appendChild(styleEl);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          window.print();
          resolve();
        });
      });
    } finally {
      styleEl?.remove();
      setCurrentJob(null);
      busy.hide();
    }
  };

  const toPdf = async (factory: () => JSX.Element, options?: PrintOptions): Promise<Uint8Array> => {
    busy.show();

    try {
      const container = await renderAndWait(factory);

      const { width: pageWidth, height: pageHeight, orientation } = parseSize(options?.size);

      const doc = new jsPDF(orientation, "pt", [pageWidth, pageHeight]);
      doc.deletePage(1);

      const pages = Array.from(container.querySelectorAll<HTMLElement>("[data-print-page]"));

      if (pages.length > 0) {
        for (const pageEl of pages) {
          pageEl.style.width = pageWidth + "pt";

          const canvas = await htmlToImage.toCanvas(pageEl, {
            backgroundColor: "white",
            pixelRatio: 4,
          });

          const imgWidth = pageWidth;
          const imgHeight = canvas.height * (pageWidth / canvas.width);

          doc.addPage([pageWidth, pageHeight], orientation);
          doc.addImage({
            imageData: canvas,
            x: 0,
            y: 0,
            width: imgWidth,
            height: imgHeight,
          });
        }
      } else {
        const target = (container.firstElementChild as HTMLElement | null) ?? container;
        target.style.width = pageWidth + "pt";

        const canvas = await htmlToImage.toCanvas(target, {
          backgroundColor: "white",
          pixelRatio: 4,
        });

        const scaleFactor = pageWidth / canvas.width;
        const pageHeightPx = pageHeight / scaleFactor;
        const totalPages = Math.ceil(canvas.height / pageHeightPx);

        for (let i = 0; i < totalPages; i++) {
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);

          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(
            canvas,
            0,
            i * pageHeightPx,
            canvas.width,
            sliceCanvas.height,
            0,
            0,
            canvas.width,
            sliceCanvas.height,
          );

          const imgHeight = sliceCanvas.height * scaleFactor;

          doc.addPage([pageWidth, pageHeight], orientation);
          doc.addImage({
            imageData: sliceCanvas,
            x: 0,
            y: 0,
            width: pageWidth,
            height: imgHeight,
          });
        }
      }

      const arrayBuffer = doc.output("arraybuffer");
      return new Uint8Array(arrayBuffer);
    } finally {
      setCurrentJob(null);
      busy.hide();
    }
  };

  const contextValue: PrintContextValue = { toPrinter, toPdf };

  return (
    <PrintContext.Provider value={contextValue}>
      {props.children}
      <Portal>
        <Show when={currentJob()}>
          {(job) => (
            <div
              ref={(el) => {
                job().onRendered(el);
              }}
              style={{
                position: "fixed",
                left: "-9999px",
                top: "0",
              }}
            >
              <PrintInstanceContext.Provider value={job().instance}>
                {job().factory()}
              </PrintInstanceContext.Provider>
            </div>
          )}
        </Show>
      </Portal>
    </PrintContext.Provider>
  );
};
