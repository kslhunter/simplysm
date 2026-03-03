# dialog.show() Component-based API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Change `dialog.show()` from factory-based to component-based API with automatic return type inference from `close` prop.

**Architecture:** Replace factory `() => JSX.Element` parameter with `Component<P>` + `props` + `options`. Remove `useDialogInstance` context — inject `close` via props instead. Use `"close" extends keyof P` conditional type for type safety.

**Tech Stack:** TypeScript, SolidJS, Vitest

---

### Task 1: Update DialogContext types

**Files:**
- Modify: `packages/solid/src/components/disclosure/DialogContext.ts:1-70`

**Step 1: Update DialogContext.ts with new show() signature**

Replace the entire `DialogContextValue` interface and add `ExtractCloseResult` helper type:

```typescript
import { createContext, useContext, type Accessor, type Component, type JSX } from "solid-js";

/** Dialog default configuration */
export interface DialogDefaults {
  /** Allow closing via ESC key */
  closeOnEscape?: boolean;
  /** Allow closing via backdrop click */
  closeOnBackdrop?: boolean;
}

/** Dialog default configuration Context */
export const DialogDefaultsContext = createContext<Accessor<DialogDefaults>>();

/** Programmatic dialog options */
export interface DialogShowOptions {
  /** Dialog header */
  header?: JSX.Element;
  /** Show close button */
  closable?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on ESC key */
  closeOnEscape?: boolean;
  /** Resizable */
  resizable?: boolean;
  /** Draggable */
  movable?: boolean;
  /** Floating mode (fixed to bottom-right) */
  float?: boolean;
  /** Fill full screen */
  fill?: boolean;
  /** Initial width (px) */
  width?: number;
  /** Initial height (px) */
  height?: number;
  /** Minimum width (px) */
  minWidth?: number;
  /** Minimum height (px) */
  minHeight?: number;
  /** Floating position */
  position?: "bottom-right" | "top-right";
  /** Custom header style */
  headerStyle?: JSX.CSSProperties | string;
  /** Confirmation function before closing (return false to cancel) */
  canDeactivate?: () => boolean;
}

/** Extract result type from component's close prop */
export type ExtractCloseResult<P> =
  P extends { close?: (result?: infer T) => void } ? T : undefined;

/** Programmatic dialog Context value */
export interface DialogContextValue {
  /** Open dialog and wait until closing, returns result */
  show<P>(
    component: Component<P>,
    props: "close" extends keyof P ? Omit<P, "close"> : never,
    options?: DialogShowOptions,
  ): Promise<ExtractCloseResult<P> | undefined>;
}

/** Programmatic dialog Context */
export const DialogContext = createContext<DialogContextValue>();

/**
 * Hook to access programmatic dialogs
 *
 * @throws Throws error if DialogProvider is not present
 */
export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog can only be used inside DialogProvider");
  return ctx;
}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/disclosure/DialogContext.ts
git commit -m "refactor(solid): update DialogContextValue show() to component-based signature"
```

---

### Task 2: Update DialogProvider implementation

**Files:**
- Modify: `packages/solid/src/components/disclosure/DialogProvider.tsx:1-148`

**Step 1: Rewrite DialogProvider to use component + props instead of factory**

```typescript
import {
  type Accessor,
  type Component,
  type ParentComponent,
  createSignal,
  Dynamic,
  For,
  Show,
  splitProps,
  type JSX,
} from "solid-js";
import {
  DialogContext,
  DialogDefaultsContext,
  type DialogContextValue,
  type DialogDefaults,
  type DialogShowOptions,
} from "./DialogContext";
import { Dialog } from "./Dialog";

interface DialogEntry {
  id: string;
  component: Component<any>;
  props: Record<string, any>;
  options: DialogShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}

let nextId = 0;

/**
 * Programmatic dialog Provider
 *
 * Open dialogs with `useDialog().show(component, props, options)`,
 * and close them with `props.close(result)` to resolve the Promise.
 *
 * @example
 * ```tsx
 * <DialogProvider>
 *   <App />
 * </DialogProvider>
 * ```
 */
export interface DialogProviderProps extends DialogDefaults {}

export const DialogProvider: ParentComponent<DialogProviderProps> = (props) => {
  const [local, _rest] = splitProps(props, ["closeOnEscape", "closeOnBackdrop", "children"]);

  const defaults = () => ({
    closeOnEscape: local.closeOnEscape,
    closeOnBackdrop: local.closeOnBackdrop,
  });

  const [entries, setEntries] = createSignal<DialogEntry[]>([]);

  const show = <P,>(
    component: Component<P>,
    componentProps: Record<string, any>,
    options?: DialogShowOptions,
  ): Promise<any> => {
    return new Promise((resolve) => {
      const id = String(nextId++);
      const [open, setOpen] = createSignal(true);
      const entry: DialogEntry = {
        id,
        component,
        props: componentProps,
        options: options ?? {},
        resolve,
        open,
        setOpen,
      };
      setEntries((prev) => [...prev, entry]);
    });
  };

  // Start close animation (set open to false)
  const requestClose = (id: string, result?: unknown) => {
    const entry = entries().find((e) => e.id === id);
    if (entry) {
      entry.pendingResult = result;
      entry.setOpen(false);
    }
  };

  // Actually remove after animation completes
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
          {(entry) => (
            <Dialog
              open={entry.open()}
              onOpenChange={(open) => {
                if (!open && entry.pendingResult === undefined) {
                  requestClose(entry.id);
                }
              }}
              onCloseComplete={() => removeEntry(entry.id)}
              closable={entry.options.closable}
              closeOnBackdrop={entry.options.closeOnBackdrop}
              closeOnEscape={entry.options.closeOnEscape}
              resizable={entry.options.resizable}
              movable={entry.options.movable}
              float={entry.options.float}
              fill={entry.options.fill}
              width={entry.options.width}
              height={entry.options.height}
              minWidth={entry.options.minWidth}
              minHeight={entry.options.minHeight}
              position={entry.options.position}
              headerStyle={entry.options.headerStyle}
              canDeactivate={entry.options.canDeactivate}
            >
              <Show when={entry.options.header !== undefined}>
                <Dialog.Header>{entry.options.header}</Dialog.Header>
              </Show>
              <Dynamic
                component={entry.component}
                {...entry.props}
                close={(result?: unknown) => requestClose(entry.id, result)}
              />
            </Dialog>
          )}
        </For>
      </DialogContext.Provider>
    </DialogDefaultsContext.Provider>
  );
};
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/disclosure/DialogProvider.tsx
git commit -m "refactor(solid): rewrite DialogProvider to inject close via props"
```

---

### Task 3: Delete DialogInstanceContext and update exports

**Files:**
- Delete: `packages/solid/src/components/disclosure/DialogInstanceContext.ts`
- Modify: `packages/solid/src/index.ts:84`

**Step 1: Delete DialogInstanceContext.ts**

Remove the file entirely.

**Step 2: Remove export from index.ts**

In `packages/solid/src/index.ts`, remove line 84:

```typescript
// DELETE this line:
export * from "./components/disclosure/DialogInstanceContext";
```

**Step 3: Commit**

```bash
git rm packages/solid/src/components/disclosure/DialogInstanceContext.ts
git add packages/solid/src/index.ts
git commit -m "refactor(solid): remove DialogInstanceContext"
```

---

### Task 4: Migrate AddressSearch

**Files:**
- Modify: `packages/solid/src/components/features/address/AddressSearch.tsx:1-76`

**Step 1: Replace useDialogInstance with close prop**

Changes:
- Remove import of `useDialogInstance`
- Change `Component` to `Component<{ close?: (result?: AddressSearchResult) => void }>`
- Replace `dialogInstance` variable with `props.close`

```typescript
import { type Component, createSignal, onMount } from "solid-js";
import { BusyContainer } from "../../feedback/busy/BusyContainer";

export interface AddressSearchResult {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}

export const AddressSearchContent: Component<{
  close?: (result?: AddressSearchResult) => void;
}> = (props) => {
  const [initialized, setInitialized] = createSignal(false);
  let contentEl!: HTMLDivElement;

  onMount(async () => {
    if (!document.getElementById("daum_address")) {
      await new Promise<void>((resolve) => {
        const scriptEl = document.createElement("script");
        scriptEl.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        scriptEl.setAttribute("id", "daum_address");

        scriptEl.onload = (): void => {
          // @ts-expect-error -- Daum Postcode global API
          daum.postcode.load(() => {
            resolve();
          });
        };
        document.head.appendChild(scriptEl);
      });
    }

    // @ts-expect-error -- Daum Postcode global API
    new daum.Postcode({
      oncomplete: (data: any): void => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

        let extraAddr = "";
        if (data.userSelectedType === "R") {
          if (data.bname !== "" && /[동로가]$/g.test(data.bname)) {
            extraAddr += data.bname;
          }

          if (data.buildingName !== "" && data.apartment === "Y") {
            extraAddr += extraAddr !== "" ? ", " + data.buildingName : data.buildingName;
          }

          if (extraAddr !== "") {
            extraAddr = " (" + extraAddr + ")";
          }
        }

        props.close?.({
          postNumber: data.zonecode,
          address: addr + extraAddr,
          buildingName: data.buildingName,
        });
      },
      onresize: (size: any): void => {
        contentEl.style.height = size.height + "px";
      },
      width: "100%",
      height: "100%",
    }).embed(contentEl, { autoClose: false });

    setInitialized(true);
  });

  return (
    <BusyContainer busy={!initialized()}>
      <div ref={contentEl} data-address-content style={{ "min-height": "100px" }} />
    </BusyContainer>
  );
};
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/features/address/AddressSearch.tsx
git commit -m "refactor(solid): migrate AddressSearch to close prop"
```

---

### Task 5: Migrate DataSheetConfigDialog

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx:1-170`

**Step 1: Replace useDialogInstance with close prop**

Changes:
- Remove import of `useDialogInstance` (line 4)
- Add `close?` to `DataSheetConfigDialogProps` interface
- Replace `const dialog = useDialogInstance<DataSheetConfig>()` with `props.close`
- Replace all `dialog?.close(...)` with `props.close?.(...)`

Specific edits:

1. Remove line 4: `import { useDialogInstance } from "../../disclosure/DialogInstanceContext";`

2. Update `DataSheetConfigDialogProps` (line 31-34):
```typescript
export interface DataSheetConfigDialogProps {
  columnInfos: DataSheetConfigColumnInfo[];
  currentConfig: DataSheetConfig;
  close?: (result?: DataSheetConfig) => void;
}
```

3. Remove line 37: `const dialog = useDialogInstance<DataSheetConfig>();`

4. Replace `dialog?.close(...)` occurrences:
- Line 106: `dialog?.close({ columnRecord });` → `props.close?.({ columnRecord });`
- Line 111: `dialog?.close({ columnRecord: {} });` → `props.close?.({ columnRecord: {} });`
- Line 162: `dialog?.close(undefined)` → `props.close?.(undefined)`

**Step 2: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx
git commit -m "refactor(solid): migrate DataSheetConfigDialog to close prop"
```

---

### Task 6: Migrate CrudDetail (dual-use)

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/types.ts:28-42`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx`

**Step 1: Add close prop to CrudDetailProps in types.ts**

```typescript
export interface CrudDetailProps<TData extends object> {
  load: () => Promise<{ data: TData; info: CrudDetailInfo }>;
  children: (ctx: CrudDetailContext<TData>) => JSX.Element;

  submit?: (data: TData) => Promise<boolean | undefined>;
  toggleDelete?: (del: boolean) => Promise<boolean | undefined>;
  editable?: boolean;
  deletable?: boolean;

  data?: TData;
  onDataChange?: (data: TData) => void;

  /** Close dialog with result (injected by DialogProvider when in dialog mode) */
  close?: (result?: boolean) => void;

  class?: string;
}
```

**Step 2: Update CrudDetail.tsx**

Changes:
- Remove import of `useDialogInstance` (line 22)
- Remove `const dialogInstance = useDialogInstance<boolean>();` (line 69)
- Replace `const isInDialog = dialogInstance !== undefined;` (line 71) with:
  `const isInDialog = local.close !== undefined;`
- Update splitProps to include `"close"` in the local array
- Replace `dialogInstance.close(true)` (lines 143-144, 175-176) with `local.close?.(true)`
- Replace `if (dialogInstance)` (lines 143, 175) with `if (local.close)`

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/crud-detail/types.ts
git add packages/solid/src/components/features/crud-detail/CrudDetail.tsx
git commit -m "refactor(solid): migrate CrudDetail to close prop (dual-use)"
```

---

### Task 7: Migrate CrudSheet (dual-use, detection only)

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`

**Step 1: Update CrudSheet**

Changes:
- Remove import of `useDialogInstance` (line 29)
- Add `close?: () => void` to `CrudSheetBaseProps` interface
- Remove `const dialogInstance = useDialogInstance();` (line 100)
- Replace `const isInDialog = dialogInstance !== undefined;` (line 101) with:
  `const isInDialog = local.close !== undefined;`
- Update splitProps to include `"close"` in the local array

**Step 2: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "refactor(solid): migrate CrudSheet to close prop (dual-use detection)"
```

---

### Task 8: Migrate SharedDataSelect and DataSelectButton

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`

**Step 1: Update SharedDataSelect handleOpenDialog**

Remove import of `useDialogInstance` (line 15). Change `handleOpenDialog`:

```typescript
const handleOpenDialog = async () => {
  if (!local.dialog) return;

  const dialogConfig = local.dialog;
  const result = await dialog.show(
    (props: { close?: (result?: DataSelectDialogResult<string | number>) => void }) => (
      <dialogConfig.component
        {...(dialogConfig.props ?? {})}
        selectMode={rest.multiple ? "multiple" : "single"}
        selectedKeys={normalizeKeys(rest.value)}
        onSelect={(r: { keys: (string | number)[] }) =>
          props.close?.({ selectedKeys: r.keys })
        }
      />
    ),
    {},
    dialogConfig.option ?? {},
  );

  if (result) {
    const newKeys = result.selectedKeys;
    if (rest.multiple) {
      rest.onValueChange?.(newKeys);
    } else {
      rest.onValueChange?.(newKeys.length > 0 ? newKeys[0] : undefined);
    }
  }
};
```

**Step 2: Update DataSelectButton handleOpenDialog**

Remove import of `useDialogInstance` (line 19). Change `handleOpenDialog`:

```typescript
const handleOpenDialog = async () => {
  if (local.disabled) return;

  const result = await dialog.show(
    (props: { close?: (result?: DataSelectDialogResult<TKey>) => void }) => (
      <local.dialog.component
        {...(local.dialog.props ?? {})}
        selectMode={local.multiple ? "multiple" : "single"}
        selectedKeys={normalizeKeys(getValue()) as (string | number)[]}
        onSelect={(r: { keys: (string | number)[] }) =>
          props.close?.({ selectedKeys: r.keys as TKey[] })
        }
      />
    ),
    {},
    local.dialog.option ?? {},
  );

  if (result) {
    const newKeys = result.selectedKeys;
    if (local.multiple) {
      setValue(newKeys);
    } else {
      setValue(newKeys.length > 0 ? newKeys[0] : undefined);
    }
  }
};
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelect.tsx
git add packages/solid/src/components/features/data-select-button/DataSelectButton.tsx
git commit -m "refactor(solid): migrate SharedDataSelect and DataSelectButton to new show() API"
```

---

### Task 9: Migrate DialogPage demo

**Files:**
- Modify: `packages/solid-demo/src/pages/disclosure/DialogPage.tsx`

**Step 1: Update SampleDialogContent and dialog.show call**

Replace `SampleDialogContent`:

```typescript
function SampleDialogContent(props: { close?: (result?: string) => void }) {
  return (
    <div class="space-y-4 p-4">
      <p class="text-sm">This dialog was opened programmatically.</p>
      <div class="flex gap-2">
        <Button theme="primary" variant="solid" onClick={() => props.close?.("OK")}>
          OK
        </Button>
        <Button onClick={() => props.close?.()}>Cancel</Button>
      </div>
    </div>
  );
}
```

Replace `handleProgrammaticOpen`:

```typescript
const handleProgrammaticOpen = async () => {
  const result = await dialog.show(SampleDialogContent, {}, {
    header: "Programmatic Dialog",
    closeOnBackdrop: true,
    closeOnEscape: true,
  });
  setProgrammaticResult(result);
};
```

Remove `useDialogInstance` import.

**Step 2: Commit**

```bash
git add packages/solid-demo/src/pages/disclosure/DialogPage.tsx
git commit -m "refactor(solid-demo): migrate DialogPage to new dialog.show() API"
```

---

### Task 10: Update tests

**Files:**
- Modify: `packages/solid/tests/components/disclosure/DialogProvider.spec.tsx`

**Step 1: Rewrite test components and assertions**

```typescript
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import { DialogProvider } from "../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../src/components/disclosure/DialogContext";
import { I18nProvider } from "../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../src/providers/ConfigContext";

// dialog content component for testing
function TestContent(props: { close?: (result?: string) => void }) {
  return (
    <div>
      <span data-testid="dialog-content">다이얼로그 내용</span>
      <button data-testid="close-btn" onClick={() => props.close?.("result")}>
        닫기
      </button>
      <button data-testid="close-no-result" onClick={() => props.close?.()}>
        취소
      </button>
    </div>
  );
}

// test component that calls useDialog
function TestApp() {
  const dialog = useDialog();

  return (
    <button
      data-testid="open-btn"
      onClick={() => {
        void dialog.show(TestContent, {}, { header: "테스트 다이얼로그" });
      }}
    >
      다이얼로그 열기
    </button>
  );
}

// test component that opens without a header
function TestAppNoHeader() {
  const dialog = useDialog();

  return (
    <button
      data-testid="open-btn"
      onClick={() => {
        void dialog.show(TestContent, {}, {});
      }}
    >
      다이얼로그 열기
    </button>
  );
}

describe("DialogProvider", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  it("displays dialog via show()", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).not.toBeNull();
    });
  });

  it("closes dialog when close is called via props", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-btn"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-btn"]')!);

    // dialog content is removed after close animation fallback timer (200ms)
    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).toBeNull();
    });
  });

  it("closes dialog when close() is called without result", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-no-result"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-no-result"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).toBeNull();
    });
  });

  it("displays dialog header", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      const dialog = document.querySelector("[data-dialog]");
      expect(dialog).not.toBeNull();
      expect(dialog!.textContent).toContain("테스트 다이얼로그");
    });
  });

  it("does not render header when header is not provided", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestAppNoHeader />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).not.toBeNull();
    });
    const header = document.querySelector("[data-dialog-header]");
    expect(header).toBeNull();
  });
});
```

**Step 2: Run tests**

```bash
pnpm vitest packages/solid/tests/components/disclosure/DialogProvider.spec.tsx --project=solid --run
```

Expected: All 5 tests PASS.

**Step 3: Commit**

```bash
git add packages/solid/tests/components/disclosure/DialogProvider.spec.tsx
git commit -m "test(solid): update DialogProvider tests for component-based show() API"
```

---

### Task 11: Typecheck and lint

**Step 1: Run typecheck on solid package**

```bash
pnpm typecheck packages/solid
```

Expected: No errors.

**Step 2: Run typecheck on solid-demo**

```bash
pnpm typecheck packages/solid-demo
```

Expected: No errors.

**Step 3: Run lint**

```bash
pnpm lint packages/solid --fix
pnpm lint packages/solid-demo --fix
```

Expected: No errors (or auto-fixed).

**Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix(solid): resolve typecheck and lint issues"
```

Only create this commit if there were actual fixes needed.
