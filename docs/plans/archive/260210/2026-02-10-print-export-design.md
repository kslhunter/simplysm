# Print / Export PDF 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** SolidJS 기반의 인쇄(`toPrinter`) 및 PDF 내보내기(`toPdf`) 기능 구현

**Architecture:** `usePrint()` 훅이 BusyContext와 연동하여 `toPrinter`/`toPdf` 메서드를 제공. `Print` 컴파운드 컴포넌트(`Print` + `Print.Page`)로 인쇄 콘텐츠를 선언적으로 정의. 내부적으로 html-to-image + jsPDF를 사용하여 PDF 생성.

**Tech Stack:** SolidJS, jsPDF, html-to-image, Tailwind CSS, Vitest + Playwright

---

## 설계 결정 요약

- **`usePrint()`** 훅 → `{ toPrinter, toPdf }` 반환, BusyContext 연동
- **`Print`** 컴파운드 컴포넌트 → `ready` prop + `Print.Page` 서브 컴포넌트
- **3가지 사용 수준**: Print 없이(즉시) / Print만(비동기 대기) / Print+Page(다중 페이지)
- **자동 분할**: `Print.Page` 없으면 A4 높이 기준 자동 슬라이스
- **의존성**: `jspdf`, `html-to-image`를 `dependencies`로 추가
- **옵션**: `{ size?: string, margin?: string }` (CSS @page 형식)

---

## Task 1: 의존성 추가

**Files:**

- Modify: `packages/solid/package.json`

**Step 1: package.json에 jspdf, html-to-image 추가**

`packages/solid/package.json`의 `dependencies`에 추가:

```json
"html-to-image": "^1.11.13",
"jspdf": "^4.0.0",
```

알파벳 순서 유지. `clsx` 앞에 `html-to-image`, `solid-js` 뒤에 `jspdf` 위치하지 않음에 주의 — `h`는 `clsx`의 `c` 뒤, `j`는 `html-to-image`의 `h` 뒤.

**Step 2: 의존성 설치**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm install
```

**Step 3: 커밋**

```bash
git add packages/solid/package.json pnpm-lock.yaml
git commit -m "chore(solid): jspdf, html-to-image 의존성 추가"
```

---

## Task 2: Print 컴파운드 컴포넌트

**Files:**

- Create: `packages/solid/src/components/print/Print.tsx`
- Test: `packages/solid/tests/print/Print.spec.tsx`

**Step 1: 테스트 작성**

```tsx
// packages/solid/tests/print/Print.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Print } from "../../src/components/print/Print";

describe("Print 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("data-print-root 속성이 렌더링된다", () => {
      const { container } = render(() => <Print>내용</Print>);
      const root = container.querySelector("[data-print-root]");
      expect(root).toBeTruthy();
    });

    it("children이 렌더링된다", () => {
      const { getByText } = render(() => <Print>테스트 내용</Print>);
      expect(getByText("테스트 내용")).toBeTruthy();
    });

    it("ready 생략 시 data-print-ready 속성이 존재한다", () => {
      const { container } = render(() => <Print>내용</Print>);
      const root = container.querySelector("[data-print-root]");
      expect(root?.hasAttribute("data-print-ready")).toBe(true);
    });
  });

  describe("ready 속성", () => {
    it("ready={false}이면 data-print-ready 속성이 없다", () => {
      const { container } = render(() => <Print ready={false}>내용</Print>);
      const root = container.querySelector("[data-print-root]");
      expect(root?.hasAttribute("data-print-ready")).toBe(false);
    });

    it("ready가 false에서 true로 변경되면 data-print-ready가 추가된다", async () => {
      const [ready, setReady] = createSignal(false);
      const { container } = render(() => <Print ready={ready()}>내용</Print>);
      const root = container.querySelector("[data-print-root]")!;

      expect(root.hasAttribute("data-print-ready")).toBe(false);

      setReady(true);
      // SolidJS 반응형 업데이트 후 확인
      await Promise.resolve();
      expect(root.hasAttribute("data-print-ready")).toBe(true);
    });
  });

  describe("Print.Page", () => {
    it("data-print-page 속성이 렌더링된다", () => {
      const { container } = render(() => (
        <Print>
          <Print.Page>페이지 1</Print.Page>
        </Print>
      ));
      const page = container.querySelector("[data-print-page]");
      expect(page).toBeTruthy();
    });

    it("여러 Print.Page가 각각 data-print-page를 가진다", () => {
      const { container } = render(() => (
        <Print>
          <Print.Page>페이지 1</Print.Page>
          <Print.Page>페이지 2</Print.Page>
          <Print.Page>페이지 3</Print.Page>
        </Print>
      ));
      const pages = container.querySelectorAll("[data-print-page]");
      expect(pages.length).toBe(3);
    });

    it("Print.Page children이 렌더링된다", () => {
      const { getByText } = render(() => (
        <Print>
          <Print.Page>페이지 내용</Print.Page>
        </Print>
      ));
      expect(getByText("페이지 내용")).toBeTruthy();
    });
  });
});
```

**Step 2: 테스트 실패 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm vitest packages/solid/tests/print/Print.spec.tsx --project=solid --run
```

Expected: FAIL — `Print` 모듈을 찾을 수 없음

**Step 3: Print 컴포넌트 구현**

```tsx
// packages/solid/src/components/print/Print.tsx
import type { JSX, ParentProps } from "solid-js";

// --- Print.Page ---

function PrintPage(props: ParentProps) {
  return <div data-print-page>{props.children}</div>;
}

// --- Print ---

interface PrintProps extends ParentProps {
  ready?: boolean;
}

interface PrintComponent {
  (props: PrintProps): JSX.Element;
  Page: typeof PrintPage;
}

const PrintInner = (props: PrintProps) => {
  return (
    <div data-print-root {...(props.ready !== false ? { "data-print-ready": "" } : {})}>
      {props.children}
    </div>
  );
};

export const Print = PrintInner as unknown as PrintComponent;
Print.Page = PrintPage;
```

> **주의:** `data-print-ready` 속성은 `props.ready !== false`일 때만 추가. SolidJS에서는 `undefined`을 속성 값으로 주면 속성 자체가 제거되지만, spread로 조건부 추가하는 패턴이 더 명시적이다. 단, SolidJS의 반응형 동작을 위해 삼항 연산자를 사용해야 할 수 있음 — 테스트 결과에 따라 조정.

**Step 4: 테스트 통과 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm vitest packages/solid/tests/print/Print.spec.tsx --project=solid --run
```

Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/print/Print.tsx packages/solid/tests/print/Print.spec.tsx
git commit -m "feat(solid): Print 컴파운드 컴포넌트 구현 (Print + Print.Page)"
```

---

## Task 3: usePrint 훅 구현

**Files:**

- Create: `packages/solid/src/contexts/usePrint.ts`

이 훅은 내부에 여러 헬퍼 함수를 포함한다. 파일 하나에 모두 작성.

**Step 1: usePrint.ts 작성**

```typescript
// packages/solid/src/contexts/usePrint.ts
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import { useBusy } from "../components/feedback/busy/BusyContext";

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

const PAPER_SIZES: Record<string, [number, number]> = {
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

  if (PAPER_SIZES[cleanSize]) {
    const [w, h] = PAPER_SIZES[cleanSize];
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

function waitForReady(container: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const root = container.querySelector("[data-print-root]");
    if (!root) {
      resolve();
      return;
    }
    if (root.hasAttribute("data-print-ready")) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (root.hasAttribute("data-print-ready")) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-print-ready"] });
  });
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

  const dispose = render(factory, container);

  await waitForReady(container);
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
        // 자동 분할: 전체 콘텐츠를 A4 높이 기준으로 슬라이스
        const target = container.querySelector<HTMLElement>("[data-print-root]") ?? container;
        target.style.width = pageWidth + "pt";

        // 컨테이너를 visible 위치로 이동 (캔버스 렌더링을 위해)
        container.style.position = "absolute";
        container.style.left = "-9999px";

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
```

**Step 2: 타입체크**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm typecheck packages/solid
```

타입 에러가 발생하면 수정. 특히 jsPDF/html-to-image 타입 관련 이슈 주의.

**Step 3: 커밋**

```bash
git add packages/solid/src/contexts/usePrint.ts
git commit -m "feat(solid): usePrint 훅 구현 (toPrinter, toPdf)"
```

---

## Task 4: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`index.ts` 마지막 부분에 추가:

```typescript
// print
export * from "./components/print/Print";
export * from "./contexts/usePrint";
```

**Step 2: 타입체크 + 린트**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm typecheck packages/solid && pnpm lint packages/solid
```

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): Print, usePrint export 추가"
```

---

## Task 5: usePrint 테스트 작성

**Files:**

- Create: `packages/solid/tests/print/usePrint.spec.tsx`

브라우저 환경(Playwright)에서 실행. `window.print`와 jsPDF는 모킹이 필요.

**Step 1: 테스트 작성**

```tsx
// packages/solid/tests/print/usePrint.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { BusyProvider } from "../../src/components/feedback/busy/BusyProvider";
import { usePrint } from "../../src/contexts/usePrint";
import { Print } from "../../src/components/print/Print";

// window.print 모킹
vi.stubGlobal("print", vi.fn());

describe("usePrint", () => {
  describe("훅 인터페이스", () => {
    it("toPrinter와 toPdf 함수를 반환한다", () => {
      let result: ReturnType<typeof usePrint> | undefined;

      render(() => (
        <BusyProvider>
          {(() => {
            result = usePrint();
            return <div />;
          })()}
        </BusyProvider>
      ));

      expect(result).toBeDefined();
      expect(typeof result!.toPrinter).toBe("function");
      expect(typeof result!.toPdf).toBe("function");
    });
  });

  describe("toPrinter", () => {
    it("Print 없는 단순 콘텐츠를 인쇄한다", async () => {
      let printFn: ReturnType<typeof usePrint>["toPrinter"] | undefined;

      render(() => (
        <BusyProvider>
          {(() => {
            const { toPrinter } = usePrint();
            printFn = toPrinter;
            return <div />;
          })()}
        </BusyProvider>
      ));

      await printFn!(() => <div>테스트 내용</div>);
      expect(window.print).toHaveBeenCalled();
    });

    it("Print ready 대기 후 인쇄한다", async () => {
      let printFn: ReturnType<typeof usePrint>["toPrinter"] | undefined;

      render(() => (
        <BusyProvider>
          {(() => {
            const { toPrinter } = usePrint();
            printFn = toPrinter;
            return <div />;
          })()}
        </BusyProvider>
      ));

      await printFn!(() => {
        const [ready, setReady] = createSignal(false);
        setTimeout(() => setReady(true), 50);
        return <Print ready={ready()}>내용</Print>;
      });

      expect(window.print).toHaveBeenCalled();
    });
  });

  describe("toPdf", () => {
    it("Uint8Array를 반환한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <BusyProvider>
          {(() => {
            const { toPdf } = usePrint();
            pdfFn = toPdf;
            return <div />;
          })()}
        </BusyProvider>
      ));

      const result = await pdfFn!(() => <div>PDF 내용</div>);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("Print.Page로 다중 페이지 PDF를 생성한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <BusyProvider>
          {(() => {
            const { toPdf } = usePrint();
            pdfFn = toPdf;
            return <div />;
          })()}
        </BusyProvider>
      ));

      const result = await pdfFn!(() => (
        <Print>
          <Print.Page>
            <div style={{ height: "100px" }}>페이지 1</div>
          </Print.Page>
          <Print.Page>
            <div style={{ height: "100px" }}>페이지 2</div>
          </Print.Page>
        </Print>
      ));

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: 테스트 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm vitest packages/solid/tests/print/ --project=solid --run
```

Expected: PASS. 실패 시 에러 분석 후 수정.

**Step 3: 커밋**

```bash
git add packages/solid/tests/print/usePrint.spec.tsx
git commit -m "test(solid): usePrint 훅 테스트 추가"
```

---

## Task 6: 전체 검증

**Step 1: 타입체크**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm typecheck packages/solid
```

**Step 2: 린트**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm lint packages/solid
```

**Step 3: 전체 테스트**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/print-export-helpers && pnpm vitest packages/solid/tests/print/ --project=solid --run
```

에러가 있으면 수정 후 커밋.

---

## 참고: 사용 예시

```tsx
// 가장 단순
const { toPrinter } = usePrint();
await toPrinter(() => SimpleView({ title: "hello" }));

// 비동기 + 다중 페이지
const buf = await toPdf(() => Report({ data }), { size: "A4 landscape" });

// Report 컴포넌트 내부
function Report(props: { data: Data }) {
  const [loaded, setLoaded] = createSignal(false);
  // ... DB 조회 후 setLoaded(true)
  return (
    <Print ready={loaded()}>
      <Print.Page>페이지 1</Print.Page>
      <Print.Page>페이지 2</Print.Page>
    </Print>
  );
}
```
