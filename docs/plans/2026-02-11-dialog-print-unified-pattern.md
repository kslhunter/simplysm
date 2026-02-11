# Dialog/Print/PDF 통일 패턴 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dialog, Print, PDF의 프로그래매틱 API를 NiceModal 패턴 기반으로 통일한다.

**Architecture:** 팩토리 함수 `() => JSX.Element`로 컴포넌트를 전달하고, Context(`useDialogInstance`, `usePrintInstance`)로 내부에서 close/ready 신호를 보내는 방식. Dialog 밖/Print 밖에서 호출 시 undefined 반환하여 겸용 컴포넌트를 지원한다.

**Tech Stack:** SolidJS, solid-js/web (render, Dynamic), TypeScript

---

## Task 1: DialogInstanceContext 생성

**Files:**

- Create: `packages/solid/src/components/disclosure/DialogInstanceContext.ts`

**Step 1: Context 파일 작성**

```typescript
import { createContext, useContext } from "solid-js";

export interface DialogInstance<T> {
  close: (result?: T) => void;
}

export const DialogInstanceContext = createContext<DialogInstance<unknown>>();

export function useDialogInstance<T = undefined>(): DialogInstance<T> | undefined {
  return useContext(DialogInstanceContext) as DialogInstance<T> | undefined;
}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/disclosure/DialogInstanceContext.ts
git commit -m "feat(solid): DialogInstanceContext 추가"
```

---

## Task 2: DialogContext.ts show() 시그니처 변경

**Files:**

- Modify: `packages/solid/src/components/disclosure/DialogContext.ts`

**Step 1: show() 시그니처를 팩토리 함수 방식으로 변경**

`DialogContextValue.show` 시그니처 변경:

```typescript
// before
show<T = undefined>(content: Component<DialogContentProps<T>>, options: DialogShowOptions): Promise<T | undefined>;

// after
show<T = undefined>(factory: () => JSX.Element, options: DialogShowOptions): Promise<T | undefined>;
```

`DialogContentProps` 인터페이스 제거. `Component`, `Accessor` import도 더 이상 불필요하면 제거.

최종 파일:

```typescript
import { createContext, useContext, type JSX } from "solid-js";

export interface DialogDefaults {
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export const DialogDefaultsContext = createContext<() => DialogDefaults>();

export interface DialogShowOptions {
  title: string;
  hideHeader?: boolean;
  closable?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  resizable?: boolean;
  movable?: boolean;
  float?: boolean;
  fill?: boolean;
  widthPx?: number;
  heightPx?: number;
  minWidthPx?: number;
  minHeightPx?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  canDeactivate?: () => boolean;
}

export interface DialogContextValue {
  show<T = undefined>(factory: () => JSX.Element, options: DialogShowOptions): Promise<T | undefined>;
}

export const DialogContext = createContext<DialogContextValue>();

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog는 DialogProvider 내부에서만 사용할 수 있습니다");
  return ctx;
}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/disclosure/DialogContext.ts
git commit -m "refactor(solid): DialogContext show() 시그니처를 팩토리 함수 방식으로 변경"
```

---

## Task 3: DialogProvider.tsx 팩토리 + Context 방식으로 변경

**Files:**

- Modify: `packages/solid/src/components/disclosure/DialogProvider.tsx`

**Step 1: DialogEntry 타입과 렌더링 방식 변경**

핵심 변경사항:

1. `DialogEntry.content`를 `Component` → `() => JSX.Element` (팩토리 함수)로 변경
2. `<Dynamic>` 제거 → `<DialogInstanceContext.Provider>` + `{entry.factory()}` 실행
3. `requestClose`를 `DialogInstanceContext`의 `close` 함수로 제공

```typescript
import { type Accessor, type ParentComponent, createSignal, For, splitProps, type JSX } from "solid-js";
import {
  DialogContext,
  DialogDefaultsContext,
  type DialogContextValue,
  type DialogDefaults,
  type DialogShowOptions,
} from "./DialogContext";
import { DialogInstanceContext, type DialogInstance } from "./DialogInstanceContext";
import { Dialog } from "./Dialog";

interface DialogEntry {
  id: string;
  factory: () => JSX.Element;
  options: DialogShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}

let nextId = 0;

export interface DialogProviderProps extends DialogDefaults {}

export const DialogProvider: ParentComponent<DialogProviderProps> = (props) => {
  const [local, _rest] = splitProps(props, ["closeOnEscape", "closeOnBackdrop", "children"]);

  const defaults = () => ({
    closeOnEscape: local.closeOnEscape,
    closeOnBackdrop: local.closeOnBackdrop,
  });

  const [entries, setEntries] = createSignal<DialogEntry[]>([]);

  const show = <T,>(factory: () => JSX.Element, options: DialogShowOptions): Promise<T | undefined> => {
    return new Promise<T | undefined>((resolve) => {
      const id = String(nextId++);
      const [open, setOpen] = createSignal(true);
      const entry: DialogEntry = {
        id,
        factory,
        options,
        resolve: resolve as (result: unknown) => void,
        open,
        setOpen,
      };
      setEntries((prev) => [...prev, entry]);
    });
  };

  const requestClose = (id: string, result?: unknown) => {
    const entry = entries().find((e) => e.id === id);
    if (entry) {
      entry.pendingResult = result;
      entry.setOpen(false);
    }
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        entry.resolve(entry.pendingResult);
      }
      return prev.filter((e) => e.id !== id);
    });
  };

  const contextValue: DialogContextValue = {
    show,
  };

  return (
    <DialogDefaultsContext.Provider value={defaults}>
      <DialogContext.Provider value={contextValue}>
        {local.children}
        <For each={entries()}>
          {(entry) => {
            const instance: DialogInstance<unknown> = {
              close: (result?: unknown) => requestClose(entry.id, result),
            };

            return (
              <Dialog
                open={entry.open()}
                onOpenChange={(open) => {
                  if (!open) {
                    requestClose(entry.id);
                  }
                }}
                onCloseComplete={() => removeEntry(entry.id)}
                title={entry.options.title}
                hideHeader={entry.options.hideHeader}
                closable={entry.options.closable}
                closeOnBackdrop={entry.options.closeOnBackdrop}
                closeOnEscape={entry.options.closeOnEscape}
                resizable={entry.options.resizable}
                movable={entry.options.movable}
                float={entry.options.float}
                fill={entry.options.fill}
                widthPx={entry.options.widthPx}
                heightPx={entry.options.heightPx}
                minWidthPx={entry.options.minWidthPx}
                minHeightPx={entry.options.minHeightPx}
                position={entry.options.position}
                headerStyle={entry.options.headerStyle}
                canDeactivate={entry.options.canDeactivate}
              >
                <DialogInstanceContext.Provider value={instance}>
                  {entry.factory()}
                </DialogInstanceContext.Provider>
              </Dialog>
            );
          }}
        </For>
      </DialogContext.Provider>
    </DialogDefaultsContext.Provider>
  );
};
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/disclosure/DialogProvider.tsx
git commit -m "refactor(solid): DialogProvider를 팩토리+Context 방식으로 변경"
```

---

## Task 4: DataSheetConfigDialog 마이그레이션

**Files:**

- Modify: `packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`

**Step 1: DataSheetConfigDialog에서 DialogContentProps 제거, useDialogInstance 사용**

```typescript
// DataSheetConfigDialog.tsx
// before
import type { DialogContentProps } from "../../disclosure/DialogContext";
export interface DataSheetConfigDialogProps extends DialogContentProps<DataSheetConfig> {
  columnInfos: DataSheetConfigColumnInfo[];
  currentConfig: DataSheetConfig;
}
// props.close({ columnRecord }) 호출

// after
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
export interface DataSheetConfigDialogProps {
  columnInfos: DataSheetConfigColumnInfo[];
  currentConfig: DataSheetConfig;
}
// const dialog = useDialogInstance<DataSheetConfig>();
// dialog?.close({ columnRecord }) 호출
```

변경점 (DataSheetConfigDialog.tsx):

1. `DialogContentProps` import → `useDialogInstance` import
2. `extends DialogContentProps<DataSheetConfig>` 제거
3. 컴포넌트 최상단에 `const dialog = useDialogInstance<DataSheetConfig>();` 추가
4. `props.close(...)` → `dialog?.close(...)` (3곳)

**Step 2: DataSheet.tsx에서 show() 호출 방식 변경**

```typescript
// before
const result = await modal.show<DataSheetConfig>(
  (modalProps) => {
    const mod = DataSheetConfigDialog;
    return mod({ ...modalProps, columnInfos, currentConfig });
  },
  { title: "시트 설정", closeOnBackdrop: true, closeOnEscape: true },
);

// after
const result = await modal.show<DataSheetConfig>(
  () => <DataSheetConfigDialog columnInfos={columnInfos} currentConfig={currentConfig} />,
  { title: "시트 설정", closeOnBackdrop: true, closeOnEscape: true },
);
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): DataSheetConfigDialog를 useDialogInstance 패턴으로 마이그레이션"
```

---

## Task 5: index.ts export 업데이트

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: 새 export 추가, 기존 export 유지**

```typescript
// disclosure 섹션에 추가
export * from "./components/disclosure/DialogInstanceContext";
```

`DialogContentProps`는 DialogContext.ts에서 이미 제거되었으므로 자동으로 export에서 사라짐.

**Step 2: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): useDialogInstance export 추가"
```

---

## Task 6: Dialog 테스트 업데이트

**Files:**

- Modify: `packages/solid/tests/components/disclosure/DialogProvider.spec.tsx`

**Step 1: 테스트를 새 API로 업데이트**

```typescript
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { DialogProvider } from "../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../src/components/disclosure/DialogContext";
import { useDialogInstance } from "../../../src/components/disclosure/DialogInstanceContext";

// 테스트용 다이얼로그 콘텐츠 컴포넌트
function TestContent() {
  const dialog = useDialogInstance<string>();
  return (
    <div>
      <span data-testid="modal-content">다이얼로그 내용</span>
      <button data-testid="close-btn" onClick={() => dialog?.close("result")}>
        닫기
      </button>
      <button data-testid="close-no-result" onClick={() => dialog?.close()}>
        취소
      </button>
    </div>
  );
}

function TestApp() {
  const dialog = useDialog();

  const openDialog = async () => {
    const result = await dialog.show<string>(() => <TestContent />, { title: "테스트 다이얼로그" });
    document.body.setAttribute("data-modal-result", String(result ?? "undefined"));
  };

  return (
    <button data-testid="open-btn" onClick={openDialog}>
      다이얼로그 열기
    </button>
  );
}

// 나머지 테스트 케이스는 동일 (describe/it 블록은 변경 없음)
```

**Step 2: 테스트 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/dialog-print-unified-pattern
pnpm vitest packages/solid/tests/components/disclosure/DialogProvider.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 3: Commit**

```bash
git add packages/solid/tests/components/disclosure/DialogProvider.spec.tsx
git commit -m "test(solid): Dialog 테스트를 useDialogInstance 패턴으로 업데이트"
```

---

## Task 7: PrintInstanceContext 생성

**Files:**

- Create: `packages/solid/src/components/print/PrintInstanceContext.ts`

**Step 1: Context 파일 작성**

```typescript
import { createContext, useContext } from "solid-js";

export interface PrintInstance {
  ready: () => void;
}

export const PrintInstanceContext = createContext<PrintInstance>();

export function usePrintInstance(): PrintInstance | undefined {
  return useContext(PrintInstanceContext);
}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/print/PrintInstanceContext.ts
git commit -m "feat(solid): PrintInstanceContext 추가"
```

---

## Task 8: usePrint.ts Context 기반으로 변경

**Files:**

- Modify: `packages/solid/src/contexts/usePrint.ts`

**Step 1: renderAndWait를 Context 기반으로 변경**

핵심 변경: `waitForReady()`의 `data-print-ready` 속성 감지를 `PrintInstanceContext` 기반으로 교체.

새로운 `renderAndWait` 구현:

```typescript
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import { useLoading } from "../components/feedback/loading/LoadingContext";
import { PrintInstanceContext, type PrintInstance } from "../components/print/PrintInstanceContext";

// ... (PrintOptions, UsePrintReturn, PAPER_SIZES, parseDimension, parseSize 변경 없음)

function waitForImages(container: HTMLElement): Promise<void> {
  // 변경 없음
}

async function renderAndWait(factory: () => JSX.Element): Promise<{ container: HTMLElement; dispose: () => void }> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  // Context 기반 ready 감지
  let resolveReady: (() => void) | undefined;
  let instanceUsed = false;

  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const instance: PrintInstance = {
    ready: () => resolveReady?.(),
  };

  // usePrintInstance() 호출을 감지하기 위해 Proxy 사용
  const trackedInstance: PrintInstance = {
    ready: () => {
      instanceUsed = true;
      instance.ready();
    },
  };

  // PrintInstanceContext를 제공하면서 factory 실행
  const dispose = render(
    () => (
      <PrintInstanceContext.Provider value={trackedInstance}>
        {factory()}
      </PrintInstanceContext.Provider>
    ),
    container,
  );

  // usePrintInstance()가 호출되었으면 ready() 대기, 아니면 즉시 진행
  // 마이크로태스크 후에 instanceUsed 확인 (컴포넌트 마운트 완료 대기)
  await Promise.resolve();

  if (instanceUsed) {
    await readyPromise;
  }

  await waitForImages(container);

  return { container, dispose };
}
```

주의: `instanceUsed` 체크 로직이 핵심. `usePrintInstance()`를 호출하면 Context 값을 가져오지만, 이것만으로는 감지가 안 됨. 대신 `ready()`가 호출될 때 `instanceUsed`를 true로 설정.

**더 안전한 접근:** `usePrintInstance()`를 호출하지 않은 경우 자동 ready 처리를 위해, 타임아웃이 아닌 **마이크로태스크 후 확인** 방식 사용. SolidJS 컴포넌트는 동기적으로 마운트되므로, `await Promise.resolve()` 후 `instanceUsed`를 확인하면 됨.

**하지만** `instanceUsed`를 `usePrintInstance()` 호출 시점에 감지해야 하므로, Context 값을 직접 추적하는 것은 어렵다. 대안: ready() 호출 여부로만 판단하지 않고, `usePrintInstance()`가 반환한 값의 `ready()`가 호출되는지로 판단.

**최종 접근 (더 단순):** 팩토리 렌더링 후 일정 시간(마이크로태스크) 내에 `ready()`가 호출되지 않으면 즉시 진행.

```typescript
async function renderAndWait(factory: () => JSX.Element): Promise<{ container: HTMLElement; dispose: () => void }> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  let resolveReady: (() => void) | undefined;
  let readyCalled = false;

  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const instance: PrintInstance = {
    ready: () => {
      readyCalled = true;
      resolveReady?.();
    },
  };

  const dispose = render(
    () => (
      <PrintInstanceContext.Provider value={instance}>
        {factory()}
      </PrintInstanceContext.Provider>
    ),
    container,
  );

  // SolidJS 컴포넌트는 동기적으로 마운트됨.
  // ready()가 동기적으로 호출되었으면 이미 readyCalled=true.
  // 비동기 ready (onMount 내 async 등)를 위해 마이크로태스크 대기 후 확인.
  await Promise.resolve();

  if (!readyCalled) {
    // usePrintInstance().ready()가 나중에 호출될 수 있으므로
    // 짧은 대기 후 다시 확인
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        if (readyCalled) {
          // 이미 ready 호출됨 → readyPromise는 이미 resolve됨
          resolve();
        } else {
          // ready()가 아직 안 호출됨 → 자동 ready로 간주
          resolve();
        }
      });
    });

    // 만약 readyCalled가 되었지만 아직 readyPromise가 resolve되지 않았을 수 있으므로
    if (readyCalled) {
      await readyPromise;
    }
  }

  await waitForImages(container);

  return { container, dispose };
}
```

**삭제할 함수:** `waitForReady()` (data-print-ready 속성 기반)

**Step 2: Commit**

```bash
git add packages/solid/src/contexts/usePrint.ts
git commit -m "refactor(solid): usePrint을 PrintInstanceContext 기반으로 변경"
```

---

## Task 9: Print.tsx 간소화

**Files:**

- Modify: `packages/solid/src/components/print/Print.tsx`

**Step 1: data-print-root, data-print-ready 속성 제거, ready prop 제거**

Print 컴포넌트는 이제 단순히 children을 감싸는 래퍼 역할만 함.
`data-print-page`는 유지 (toPdf에서 사용).

```typescript
import type { JSX, ParentProps } from "solid-js";

function PrintPage(props: ParentProps) {
  return <div data-print-page>{props.children}</div>;
}

interface PrintComponent {
  (props: ParentProps): JSX.Element;
  Page: typeof PrintPage;
}

const PrintInner = (props: ParentProps) => {
  return <>{props.children}</>;
};

export const Print = PrintInner as unknown as PrintComponent;
Print.Page = PrintPage;
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/print/Print.tsx
git commit -m "refactor(solid): Print 컴포넌트에서 data-print-ready 속성 제거"
```

---

## Task 10: index.ts에 PrintInstanceContext export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: print 섹션에 추가**

```typescript
// print
export * from "./components/print/Print";
export * from "./components/print/PrintInstanceContext";
export * from "./contexts/usePrint";
```

**Step 2: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): usePrintInstance export 추가"
```

---

## Task 11: Print 테스트 업데이트

**Files:**

- Modify: `packages/solid/tests/print/Print.spec.tsx`
- Modify: `packages/solid/tests/print/usePrint.spec.tsx`

**Step 1: Print.spec.tsx 업데이트**

`data-print-root`, `data-print-ready` 속성 관련 테스트 제거/수정.
`Print.Page`의 `data-print-page` 테스트는 유지.

```typescript
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Print } from "../../src/components/print/Print";

describe("Print 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 렌더링된다", () => {
      const { getByText } = render(() => <Print>테스트 내용</Print>);
      expect(getByText("테스트 내용")).toBeTruthy();
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

**Step 2: usePrint.spec.tsx 업데이트**

`Print ready` 테스트를 `usePrintInstance().ready()` 방식으로 변경:

```typescript
import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { onMount } from "solid-js";
import { LoadingProvider } from "../../src/components/feedback/loading/LoadingProvider";
import { usePrint } from "../../src/contexts/usePrint";
import { Print } from "../../src/components/print/Print";
import { usePrintInstance } from "../../src/components/print/PrintInstanceContext";

vi.stubGlobal("print", vi.fn());

describe("usePrint", () => {
  describe("훅 인터페이스", () => {
    it("toPrinter와 toPdf 함수를 반환한다", () => {
      let result: ReturnType<typeof usePrint> | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            result = usePrint();
            return <div />;
          })()}
        </LoadingProvider>
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
        <LoadingProvider>
          {(() => {
            const { toPrinter } = usePrint();
            printFn = toPrinter;
            return <div />;
          })()}
        </LoadingProvider>
      ));

      await printFn!(() => <div>테스트 내용</div>);
      expect(window.print).toHaveBeenCalled();
    });

    it("usePrintInstance().ready() 대기 후 인쇄한다", async () => {
      let printFn: ReturnType<typeof usePrint>["toPrinter"] | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            const { toPrinter } = usePrint();
            printFn = toPrinter;
            return <div />;
          })()}
        </LoadingProvider>
      ));

      function AsyncContent() {
        const print = usePrintInstance();
        onMount(() => {
          setTimeout(() => print?.ready(), 50);
        });
        return <div>내용</div>;
      }

      await printFn!(() => <AsyncContent />);
      expect(window.print).toHaveBeenCalled();
    });
  });

  describe("toPdf", () => {
    it("Uint8Array를 반환한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            const { toPdf } = usePrint();
            pdfFn = toPdf;
            return <div />;
          })()}
        </LoadingProvider>
      ));

      const result = await pdfFn!(() => <div>PDF 내용</div>);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("Print.Page로 다중 페이지 PDF를 생성한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            const { toPdf } = usePrint();
            pdfFn = toPdf;
            return <div />;
          })()}
        </LoadingProvider>
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

**Step 3: 테스트 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/dialog-print-unified-pattern
pnpm vitest packages/solid/tests/print/ --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 4: Commit**

```bash
git add packages/solid/tests/print/Print.spec.tsx packages/solid/tests/print/usePrint.spec.tsx
git commit -m "test(solid): Print 테스트를 usePrintInstance 패턴으로 업데이트"
```

---

## Task 12: 데모 페이지 업데이트

**Files:**

- Modify: `packages/solid-demo/src/pages/disclosure/ModalPage.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/PrintPage.tsx`

**Step 1: ModalPage.tsx — 프로그래매틱 다이얼로그를 새 API로 변경**

```typescript
// before
import { ..., type DialogContentProps } from "@simplysm/solid";
const SampleDialogContent: Component<DialogContentProps<string>> = (props) => (
  <div class="space-y-4 p-4">
    <Button onClick={() => props.close("확인")}>확인</Button>
    <Button onClick={() => props.close()}>취소</Button>
  </div>
);
const result = await dialog.show(SampleDialogContent, { title: "..." });

// after
import { ..., useDialogInstance } from "@simplysm/solid";
function SampleDialogContent() {
  const dialog = useDialogInstance<string>();
  return (
    <div class="space-y-4 p-4">
      <Button onClick={() => dialog?.close("확인")}>확인</Button>
      <Button onClick={() => dialog?.close()}>취소</Button>
    </div>
  );
}
const result = await dialog.show<string>(() => <SampleDialogContent />, { title: "..." });
```

**Step 2: PrintPage.tsx — 비동기 ready를 usePrintInstance()로 변경**

```typescript
// before (handlePdfWithReady)
const [ready, setReady] = createSignal(false);
setTimeout(() => setReady(true), 1000);
<Print ready={ready()}>

// after
function AsyncPrintContent() {
  const print = usePrintInstance();
  onMount(() => {
    setTimeout(() => print?.ready(), 1000);
  });
  return (
    <Print>
      <Print.Page>
        <div>비동기 데이터 PDF...</div>
      </Print.Page>
    </Print>
  );
}
const buf = await toPdf(() => <AsyncPrintContent />);
```

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/disclosure/ModalPage.tsx packages/solid-demo/src/pages/feedback/PrintPage.tsx
git commit -m "refactor(solid-demo): 데모 페이지를 새 Dialog/Print API로 업데이트"
```

---

## Task 13: usePrint의 data-print-root 참조 제거

**Files:**

- Modify: `packages/solid/src/contexts/usePrint.ts`

**Step 1: toPdf에서 data-print-root 참조 제거**

`usePrint.ts:207` 부근에서 `[data-print-root]`를 사용하는 부분:

```typescript
// before
const target =
  container.querySelector<HTMLElement>("[data-print-root]") ??
  (container.firstElementChild as HTMLElement | null) ??
  container;

// after
const target = (container.firstElementChild as HTMLElement | null) ?? container;
```

**Step 2: Commit**

```bash
git add packages/solid/src/contexts/usePrint.ts
git commit -m "refactor(solid): usePrint에서 data-print-root 참조 제거"
```

---

## Task 14: 타입체크 및 최종 검증

**Step 1: 타입체크**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/dialog-print-unified-pattern
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
```

Expected: 에러 없음

**Step 2: 린트**

```bash
pnpm lint packages/solid
pnpm lint packages/solid-demo
```

Expected: 에러 없음

**Step 3: 전체 테스트 실행**

```bash
pnpm vitest packages/solid --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 4: Commit (필요 시 수정 사항)**

수정이 필요한 경우 수정 후 커밋.
