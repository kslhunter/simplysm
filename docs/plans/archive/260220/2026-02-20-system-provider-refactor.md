# SystemProvider Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Split `InitializeProvider` into `SystemProvider` (infrastructure) + standalone `DialogProvider` / `PrintProvider` (user-positioned) so that programmatic dialog/print factory content can access user-defined Provider contexts.

**Architecture:** `InitializeProvider` is renamed to `SystemProvider` and no longer nests `DialogProvider`. `DialogProvider` becomes a standalone export that users place wherever they want (typically below their own Providers). `usePrint` is converted from a hook-with-`render()` to a `PrintProvider` pattern that renders factory content within its own tree, enabling context access. Users compose: `<SystemProvider> → <UserProviders> → <DialogProvider> → <PrintProvider> → <App>`.

**Tech Stack:** SolidJS, TypeScript, Vitest

---

### Task 1: Rename InitializeProvider to SystemProvider and remove DialogProvider

**Files:**
- Modify: `packages/solid/src/providers/InitializeProvider.tsx` → rename to `SystemProvider.tsx`
- Modify: `packages/solid/src/index.ts`

**Step 1: Rename file and component**

Rename `packages/solid/src/providers/InitializeProvider.tsx` to `packages/solid/src/providers/SystemProvider.tsx`.

Update the component inside:

```typescript
// packages/solid/src/providers/SystemProvider.tsx
import { type ParentComponent } from "solid-js";
import { ConfigProvider } from "./ConfigContext";
import { SyncStorageProvider } from "./SyncStorageContext";
import { LoggerProvider } from "./LoggerContext";
import { NotificationProvider } from "../components/feedback/notification/NotificationProvider";
import { NotificationBanner } from "../components/feedback/notification/NotificationBanner";
import { ErrorLoggerProvider } from "./ErrorLoggerProvider";
import { PwaUpdateProvider } from "./PwaUpdateProvider";
import { ClipboardProvider } from "./ClipboardProvider";
import { ThemeProvider } from "./ThemeContext";
import { ServiceClientProvider } from "./ServiceClientProvider";
import { SharedDataProvider } from "./shared-data/SharedDataProvider";
import { BusyProvider } from "../components/feedback/busy/BusyProvider";
import type { BusyVariant } from "../components/feedback/busy/BusyContext";

export type { BusyVariant };

export const SystemProvider: ParentComponent<{
  clientName: string;
  busyVariant?: BusyVariant;
}> = (props) => {
  return (
    <ConfigProvider clientName={props.clientName}>
      <SyncStorageProvider>
        <LoggerProvider>
          <NotificationProvider>
            <NotificationBanner />
            <ErrorLoggerProvider>
              <PwaUpdateProvider>
                <ClipboardProvider>
                  <ThemeProvider>
                    <ServiceClientProvider>
                      <SharedDataProvider>
                        <BusyProvider variant={props.busyVariant}>
                          {props.children}
                        </BusyProvider>
                      </SharedDataProvider>
                    </ServiceClientProvider>
                  </ThemeProvider>
                </ClipboardProvider>
              </PwaUpdateProvider>
            </ErrorLoggerProvider>
          </NotificationProvider>
        </LoggerProvider>
      </SyncStorageProvider>
    </ConfigProvider>
  );
};
```

Key change: `DialogProvider` is removed from the nesting. `{props.children}` is now directly inside `BusyProvider`.

**Step 2: Update index.ts exports**

In `packages/solid/src/index.ts`, replace:

```typescript
// InitializeProvider (only exported provider)
export * from "./providers/InitializeProvider";
```

with:

```typescript
// SystemProvider
export * from "./providers/SystemProvider";
```

Also add `DialogProvider` export under the Disclosure section. Currently only `DialogContext` and `DialogInstanceContext` are exported. Add:

```typescript
// Dialog
export * from "./components/disclosure/DialogProvider";
```

**Step 3: Verify typecheck passes**

Run: `pnpm typecheck packages/solid`

**Step 4: Commit**

```
feat(solid): rename InitializeProvider to SystemProvider, extract DialogProvider
```

---

### Task 2: Create PrintProvider (convert usePrint to Provider pattern)

**Files:**
- Create: `packages/solid/src/components/feedback/print/PrintContext.ts`
- Create: `packages/solid/src/components/feedback/print/PrintProvider.tsx`
- Modify: `packages/solid/src/hooks/usePrint.ts` (keep as thin re-export for the hook)
- Modify: `packages/solid/src/index.ts`

**Step 1: Create PrintContext**

```typescript
// packages/solid/src/components/feedback/print/PrintContext.ts
import { createContext, useContext } from "solid-js";
import type { JSX } from "solid-js";

export interface PrintOptions {
  size?: string;
  margin?: string;
}

export interface PrintContextValue {
  toPrinter: (factory: () => JSX.Element, options?: PrintOptions) => Promise<void>;
  toPdf: (factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>;
}

export const PrintContext = createContext<PrintContextValue>();

export function usePrint(): PrintContextValue {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error("usePrint must be used inside <PrintProvider>");
  return ctx;
}
```

**Step 2: Create PrintProvider**

The key design change: instead of `render()` (new SolidJS root = no context), render the factory content **within the Provider's own reactive tree** using a signal + `<Show>`. This way factory content inherits all contexts above `PrintProvider`.

```typescript
// packages/solid/src/components/feedback/print/PrintProvider.tsx
import { type ParentComponent, createSignal, Show } from "solid-js";
import { PrintContext, type PrintContextValue, type PrintOptions } from "./PrintContext";
import { PrintInstanceContext, type PrintInstance } from "./PrintInstanceContext";
import { useBusy } from "../busy/BusyContext";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";

// --- Paper size constants (pt) --- (move from usePrint.ts)
// ... PAPER_SIZES, parseDimension, parseSize, waitForImages (same as current usePrint.ts)

interface RenderJob {
  factory: () => JSX.Element;
  instance: PrintInstance;
}

export const PrintProvider: ParentComponent = (props) => {
  const busy = useBusy();
  const [currentJob, setCurrentJob] = createSignal<RenderJob | null>(null);
  let hiddenRef: HTMLDivElement | undefined;

  const renderAndWait = (
    factory: () => JSX.Element,
  ): Promise<{ container: HTMLDivElement; cleanup: () => void }> => {
    return new Promise<{ container: HTMLDivElement; cleanup: () => void }>((resolve) => {
      let readyCalled = false;

      const instance: PrintInstance = {
        ready: () => {
          readyCalled = true;
          resolveWhenReady();
        },
      };

      const resolveWhenReady = () => {
        resolve({
          container: hiddenRef!,
          cleanup: () => setCurrentJob(null),
        });
      };

      setCurrentJob({ factory, instance });

      // SolidJS renders synchronously. Check after microtask + rAF.
      queueMicrotask(() => {
        if (readyCalled) return; // already resolved
        requestAnimationFrame(() => {
          if (!readyCalled) resolveWhenReady();
        });
      });
    });
  };

  // toPrinter and toPdf: same logic as current usePrint.ts,
  // but use renderAndWait() above instead of the old render()-based approach.
  // Key difference: cleanup calls job.cleanup() instead of dispose()+container.remove().

  const toPrinter = async (factory: () => JSX.Element, options?: PrintOptions): Promise<void> => {
    busy.show();
    try {
      const { container, cleanup } = await renderAndWait(factory);
      await waitForImages(container);

      container.style.position = "static";
      container.style.left = "auto";
      container.classList.add("_sd-print-target");

      const styleEl = document.createElement("style");
      styleEl.textContent = `
        @page { size: ${options?.size ?? "A4"}; margin: ${options?.margin ?? "0"}; }
        body > ._sd-print-target { display: none; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; background: white; }
          body > * { display: none !important; }
          body > ._sd-print-target { display: block !important; }
        }
      `;
      document.head.appendChild(styleEl);

      await new Promise<void>((r) => requestAnimationFrame(() => { window.print(); r(); }));

      styleEl.remove();
      cleanup();
    } finally {
      busy.hide();
    }
  };

  const toPdf = async (factory: () => JSX.Element, options?: PrintOptions): Promise<Uint8Array> => {
    busy.show();
    try {
      const { container, cleanup } = await renderAndWait(factory);
      await waitForImages(container);

      // ... same PDF generation logic as current usePrint.ts ...
      // Use container instead of the old render()-created container

      cleanup();
      return pdfBytes;
    } finally {
      busy.hide();
    }
  };

  const contextValue: PrintContextValue = { toPrinter, toPdf };

  return (
    <PrintContext.Provider value={contextValue}>
      {props.children}
      <Show when={currentJob()}>
        {(job) => (
          <div ref={hiddenRef} style={{ position: "fixed", left: "-9999px", top: "0" }}>
            <PrintInstanceContext.Provider value={job().instance}>
              {job().factory()}
            </PrintInstanceContext.Provider>
          </div>
        )}
      </Show>
    </PrintContext.Provider>
  );
};
```

**Step 3: Update usePrint.ts to re-export from PrintContext**

Replace entire `packages/solid/src/hooks/usePrint.ts` with a thin re-export:

```typescript
// packages/solid/src/hooks/usePrint.ts
// Re-export for backward compatibility
export { usePrint } from "../components/feedback/print/PrintContext";
export type { PrintOptions, PrintContextValue } from "../components/feedback/print/PrintContext";
```

**Step 4: Update index.ts**

Add under Feedback section:

```typescript
// Print
export * from "./components/feedback/print/PrintContext";
export * from "./components/feedback/print/PrintProvider";
export * from "./components/feedback/print/Print";
export * from "./components/feedback/print/PrintInstanceContext";
```

Remove the old `usePrint` hook export (now re-exported from PrintContext via the hooks file, which is still exported).

**Step 5: Verify typecheck passes**

Run: `pnpm typecheck packages/solid`

**Step 6: Commit**

```
feat(solid): convert usePrint to PrintProvider pattern
```

---

### Task 3: Update solid-demo to use new provider structure

**Files:**
- Modify: `packages/solid-demo/src/App.tsx`

**Step 1: Update App.tsx**

```tsx
// packages/solid-demo/src/App.tsx
import { SystemProvider, DialogProvider, PrintProvider } from "@simplysm/solid";
import type { RouteSectionProps } from "@solidjs/router";

export function App(props: RouteSectionProps) {
  return (
    <SystemProvider clientName="solid-demo">
      <DialogProvider>
        <PrintProvider>
          {props.children}
        </PrintProvider>
      </DialogProvider>
    </SystemProvider>
  );
}
```

Since solid-demo has no user-defined Providers, `DialogProvider` and `PrintProvider` go directly inside `SystemProvider`.

**Step 2: Verify dev server starts**

Run: `pnpm dev`
Expected: Vite dev server starts without errors.

**Step 3: Commit**

```
refactor(solid-demo): use SystemProvider + DialogProvider + PrintProvider
```

---

### Task 4: Update tests

**Files:**
- Modify: `packages/solid/tests/components/disclosure/DialogProvider.spec.tsx`
- Modify: `packages/solid/tests/hooks/usePrint.spec.tsx`

**Step 1: DialogProvider tests -- no change needed**

Current tests already use `<DialogProvider>` standalone (not wrapped in InitializeProvider). Verify they still pass.

Run: `pnpm vitest packages/solid/tests/components/disclosure/DialogProvider.spec.tsx --run --project=solid`

**Step 2: Update usePrint tests**

Current tests wrap with `<BusyProvider>` only. Update to wrap with `<BusyProvider>` + `<PrintProvider>`:

```tsx
import { PrintProvider } from "../../../src/components/feedback/print/PrintProvider";

// Replace all:
//   <BusyProvider>
//     {(() => { result = usePrint(); ... })()}
//   </BusyProvider>
// With:
//   <BusyProvider>
//     <PrintProvider>
//       {(() => { result = usePrint(); ... })()}
//     </PrintProvider>
//   </BusyProvider>
```

Run: `pnpm vitest packages/solid/tests/hooks/usePrint.spec.tsx --run --project=solid`
Expected: All tests pass.

**Step 3: Run all solid tests**

Run: `pnpm vitest --run --project=solid`
Expected: All pass.

**Step 4: Commit**

```
test(solid): update tests for PrintProvider pattern
```

---

### Task 5: Run typecheck and lint on entire project

**Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: No errors.

**Step 2: Lint**

Run: `pnpm lint packages/solid`
Expected: No errors.

**Step 3: Fix any issues found, then commit**

```
fix(solid): resolve typecheck/lint issues from SystemProvider refactor
```

---

### Task 6: Update documentation

**Files:**
- Modify: `packages/solid/README.md`
- Modify: `packages/solid/docs/providers.md`
- Modify: `packages/solid/docs/feedback.md`
- Modify: `packages/solid/docs/hooks.md`
- Modify: `packages/solid/docs/disclosure.md`

**Step 1: Update README.md Provider Setup section**

Replace the current "Provider Setup" section (lines 38-69) with:

```markdown
### Provider Setup

Use `SystemProvider` to wrap your app. It provides all infrastructure providers (config, theme, logger, notification, service client, etc.).

For programmatic dialogs and printing, add `DialogProvider` and/or `PrintProvider` separately. Place them **below your own Providers** if your dialog/print content needs access to them.

```tsx
import { SystemProvider, DialogProvider, PrintProvider } from "@simplysm/solid";

function App() {
  return (
    <SystemProvider clientName="my-app">
      {/* Your Providers can go here */}
      <DialogProvider>
        <PrintProvider>
          <AppRoot />
        </PrintProvider>
      </DialogProvider>
    </SystemProvider>
  );
}
```

> **Why separate?** `DialogProvider` and `PrintProvider` render user-provided components (via `dialog.show(factory)` / `print.toPrinter(factory)`). By placing them below your Providers, the factory content can access your contexts (e.g., auth, data stores). `SystemProvider` provides infrastructure that doesn't render user components.

| Provider | Required | Must be inside | Description |
|----------|----------|----------------|-------------|
| `SystemProvider` | Yes | (root) | Infrastructure: config, theme, logger, notification, busy, service client, shared data |
| `DialogProvider` | If using `useDialog()` | `SystemProvider` | Programmatic dialog management |
| `PrintProvider` | If using `usePrint()` | `SystemProvider` | Printing and PDF generation |
```

Also update the `| Prop |` table -- it stays the same (clientName, busyVariant), just under SystemProvider name.

**Step 2: Update docs/providers.md**

- Rename `InitializeProvider` → `SystemProvider` throughout
- Remove `DialogProvider` from internal nesting order
- Remove `useDialog` from the exported hooks table (it's now documented under DialogProvider)
- Add new sections for `DialogProvider` and `PrintProvider`
- Add "Provider Placement Guide" section explaining the architecture:

```markdown
## Provider Placement Guide

`SystemProvider` provides all infrastructure. `DialogProvider` and `PrintProvider` are standalone and should be placed where their factory content needs context access.

**Recommended structure:**

```
<SystemProvider>          ← Infrastructure (config, theme, logger, etc.)
  <YourAuthProvider>      ← Your providers
    <YourDataProvider>
      <DialogProvider>    ← Dialog factories can access Auth + Data
        <PrintProvider>   ← Print factories can access Auth + Data
          <App />
        </PrintProvider>
      </DialogProvider>
    </YourDataProvider>
  </YourAuthProvider>
</SystemProvider>
```

**Why this order?**

- `DialogProvider` and `PrintProvider` accept user components as factory functions (`dialog.show(() => <Form />)`, `print.toPrinter(() => <Report />)`)
- These factories are rendered inside the Provider's tree, not at the call site
- To access your app's contexts (auth, data, etc.), place `DialogProvider`/`PrintProvider` **below** those contexts
- `SystemProvider` must be outermost because `DialogProvider`/`PrintProvider` depend on `useBusy()` and other system hooks
```

**Step 3: Update docs/disclosure.md Dialog section**

Update the "Dialog Defaults" note at the bottom:

Replace:
```
`InitializeProvider` already sets up the dialog system internally — most apps do not need these directly.
```

With:
```
Add `<DialogProvider>` to your provider tree to enable `useDialog()`. See [Provider Placement Guide](providers.md#provider-placement-guide).
```

**Step 4: Update docs/feedback.md Print section**

Update the Print / usePrint section to mention `PrintProvider` requirement:

```markdown
## Print / usePrint

Browser printing and PDF generation. Requires `<PrintProvider>` in the component tree.

```tsx
import { PrintProvider, Print, usePrint } from "@simplysm/solid";

// In your provider tree:
<SystemProvider clientName="my-app">
  <PrintProvider>
    <App />
  </PrintProvider>
</SystemProvider>
```

(Rest of the existing examples remain the same)
```

**Step 5: Update docs/hooks.md**

Update usePrint entry:

```markdown
## usePrint

Hook for printing and PDF generation. Must be used inside `<PrintProvider>`. See [Print / usePrint](feedback.md#print--useprint) for detailed API.
```

**Step 6: Update README.md Providers section**

Replace:
```markdown
## Providers

- [`InitializeProvider`](docs/providers.md#initializeprovider) - Main provider wrapping all providers (the only exported provider component)
```

With:
```markdown
## Providers

- [`SystemProvider`](docs/providers.md#systemprovider) - Infrastructure provider (config, theme, logger, notification, busy, service client, shared data)
- [`DialogProvider`](docs/providers.md#dialogprovider) - Programmatic dialog provider (`useDialog`)
- [`PrintProvider`](docs/providers.md#printprovider) - Printing and PDF generation provider (`usePrint`)
```

**Step 7: Commit**

```
docs(solid): update documentation for SystemProvider refactor
```

---

### Task 7: Final verification

**Step 1: Full typecheck**

Run: `pnpm typecheck`

**Step 2: Full lint**

Run: `pnpm lint packages/solid packages/solid-demo`

**Step 3: All tests**

Run: `pnpm vitest --run --project=solid`

**Step 4: Dev server smoke test**

Run: `pnpm dev`
Verify: App loads, dialogs work, no console errors.

---

## Summary of Breaking Changes

| Before | After |
|--------|-------|
| `<InitializeProvider>` | `<SystemProvider>` |
| Dialog included in InitializeProvider | `<DialogProvider>` added separately |
| `usePrint()` works inside InitializeProvider | `<PrintProvider>` added separately, `usePrint()` requires it |
| Single provider wraps everything | Three providers: `SystemProvider` → (user providers) → `DialogProvider` + `PrintProvider` |
