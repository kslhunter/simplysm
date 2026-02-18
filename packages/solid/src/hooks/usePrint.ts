import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import { useBusy } from "../components/feedback/busy/BusyContext";
import { PrintInstanceContext, type PrintInstance } from "../components/feedback/print/PrintInstanceContext";

// --- Types ---

export interface PrintOptions {
  size?: string;
  margin?: string;
}

export interface UsePrintReturn {
  toPrinter: (factory: () => JSX.Element, options?: PrintOptions) => Promise<void>;
  toPdf: (factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>;
}

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

  // 커스텀 크기: "210mm 297mm"
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

async function renderAndWait(factory: () => JSX.Element): Promise<{ container: HTMLElement; dispose: () => void }> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  let resolveReady: (() => void) | undefined;
  const state = { readyCalled: false };

  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const instance: PrintInstance = {
    ready: () => {
      state.readyCalled = true;
      resolveReady?.();
    },
  };

  const dispose = render(
    () =>
      PrintInstanceContext.Provider({
        value: instance,
        get children() {
          return factory();
        },
      }),
    container,
  );

  // SolidJS 컴포넌트는 동기적으로 마운트됨.
  // 동기적으로 ready()가 호출되었으면 이미 state.readyCalled=true.
  // 비동기 ready (onMount 내 async 등)를 위해 rAF 대기 후 확인.
  await Promise.resolve();

  if (!state.readyCalled) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  if (state.readyCalled) {
    await readyPromise;
  }

  await waitForImages(container);

  return { container, dispose };
}

// --- Hook ---

export function usePrint(): UsePrintReturn {
  const busy = useBusy();

  const toPrinter = async (factory: () => JSX.Element, options?: PrintOptions): Promise<void> => {
    busy.show();
    let container: HTMLElement | undefined;
    let dispose: (() => void) | undefined;
    let styleEl: HTMLStyleElement | undefined;

    try {
      const result = await renderAndWait(factory);
      container = result.container;
      dispose = result.dispose;

      // 인쇄 대상을 visible로 전환
      container.style.position = "static";
      container.style.left = "auto";
      container.classList.add("_sd-print-target");

      // @media print 스타일 주입
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
      dispose?.();
      container?.remove();
      busy.hide();
    }
  };

  const toPdf = async (factory: () => JSX.Element, options?: PrintOptions): Promise<Uint8Array> => {
    busy.show();
    let container: HTMLElement | undefined;
    let dispose: (() => void) | undefined;

    try {
      const result = await renderAndWait(factory);
      container = result.container;
      dispose = result.dispose;

      const { width: pageWidth, height: pageHeight, orientation } = parseSize(options?.size);

      const doc = new jsPDF(orientation, "pt", [pageWidth, pageHeight]);
      doc.deletePage(1);

      const pages = Array.from(container.querySelectorAll<HTMLElement>("[data-print-page]"));

      if (pages.length > 0) {
        // 명시적 페이지 분할
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
        // 자동 분할: 전체 콘텐츠를 페이지 높이 기준으로 슬라이스
        // container 자체는 off-screen 스타일(position/left)을 가지므로
        // html-to-image가 클론 시 동일 스타일을 복제하여 빈 캔버스가 생길 수 있음.
        // 따라서 실제 콘텐츠 요소를 target으로 사용.
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
      dispose?.();
      container?.remove();
      busy.hide();
    }
  };

  return { toPrinter, toPdf };
}
