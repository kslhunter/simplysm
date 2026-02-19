# Loading → Busy Rename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename all Loading-related components/hooks/types to Busy to align with the `aria-busy` web standard.

**Architecture:** Pure rename refactoring — no behavior changes. Rename files, directories, exported symbols, and update all import references across `solid` and `solid-demo` packages.

**Tech Stack:** SolidJS, TypeScript

---

### Task 1: Rename core files and directory (solid package)

**Files:**
- Rename: `packages/solid/src/components/feedback/loading/` → `packages/solid/src/components/feedback/busy/`
- Rename: `LoadingContext.ts` → `BusyContext.ts`
- Rename: `LoadingContainer.tsx` → `BusyContainer.tsx`
- Rename: `LoadingContainer.css` → `BusyContainer.css`
- Rename: `LoadingProvider.tsx` → `BusyProvider.tsx`

**Step 1: Rename directory and files**

```bash
cd packages/solid/src/components/feedback
mv loading busy
cd busy
mv LoadingContext.ts BusyContext.ts
mv LoadingContainer.tsx BusyContainer.tsx
mv LoadingContainer.css BusyContainer.css
mv LoadingProvider.tsx BusyProvider.tsx
```

**Step 2: Update BusyContext.ts**

Replace full content with:
```typescript
import { createContext, useContext, type Accessor } from "solid-js";

export type BusyVariant = "spinner" | "bar";

export interface BusyContextValue {
  variant: Accessor<BusyVariant>;
  show: (message?: string) => void;
  hide: () => void;
  setProgress: (percent: number | undefined) => void;
}

export const BusyContext = createContext<BusyContextValue>();

export function useBusy(): BusyContextValue {
  const context = useContext(BusyContext);
  if (!context) {
    throw new Error("useBusy는 BusyProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
```

**Step 3: Update BusyContainer.tsx**

All renames inside:
- Import: `./LoadingContext` → `./BusyContext`
- Import: `./LoadingContainer.css` → `./BusyContainer.css`
- `LoadingContainerProps` → `BusyContainerProps`
- `LoadingContext` → `BusyContext`
- `LoadingVariant` → `BusyVariant`
- `LoadingContainer` → `BusyContainer`
- Internal variable `loadingCtx` → `busyCtx`

**Step 4: Update BusyProvider.tsx**

All renames inside:
- Import: `./LoadingContext` → `./BusyContext`
- Import: `./LoadingContainer` → `./BusyContainer`
- `LoadingContextValue` → `BusyContextValue`
- `LoadingVariant` → `BusyVariant`
- `LoadingProviderProps` → `BusyProviderProps`
- `LoadingProvider` → `BusyProvider`
- `LoadingContext` → `BusyContext`
- `LoadingContainer` → `BusyContainer`

**Step 5: Update index.ts exports (lines 99-102)**

Replace:
```typescript
// Loading
export * from "./components/feedback/loading/LoadingContext";
export * from "./components/feedback/loading/LoadingContainer";
export * from "./components/feedback/loading/LoadingProvider";
```
With:
```typescript
// Busy
export * from "./components/feedback/busy/BusyContext";
export * from "./components/feedback/busy/BusyContainer";
export * from "./components/feedback/busy/BusyProvider";
```

### Task 2: Update solid internal references

**Files:**
- Modify: `packages/solid/src/providers/ConfigContext.ts:49` — `loadingVariant` → `busyVariant`
- Modify: `packages/solid/src/providers/InitializeProvider.tsx:8,73` — imports + usage
- Modify: `packages/solid/src/hooks/usePrint.ts:5,132` — `useLoading` → `useBusy`
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx:19,417,449` — `LoadingContainer` → `BusyContainer`

**Step 1: Update ConfigContext.ts**

Line 47-49 — change JSDoc + prop name:
```typescript
  /**
   * 루트 로딩 오버레이 변형 (기본값: "spinner")
   */
  busyVariant?: "spinner" | "bar";
```

**Step 2: Update InitializeProvider.tsx**

Line 8: `import { LoadingProvider } from "../components/feedback/loading/LoadingProvider";`
→ `import { BusyProvider } from "../components/feedback/busy/BusyProvider";`

Line 73: `<LoadingProvider variant={props.config.loadingVariant}>{props.children}</LoadingProvider>`
→ `<BusyProvider variant={props.config.busyVariant}>{props.children}</BusyProvider>`

**Step 3: Update usePrint.ts**

Line 5: `import { useLoading } from "../components/feedback/loading/LoadingContext";`
→ `import { useBusy } from "../components/feedback/busy/BusyContext";`

Line 132: `const busy = useLoading();`
→ `const busy = useBusy();`

**Step 4: Update Kanban.tsx**

Line 19: `import { LoadingContainer } from "../../feedback/loading/LoadingContainer";`
→ `import { BusyContainer } from "../../feedback/busy/BusyContainer";`

Line 417: `<LoadingContainer busy={local.busy} variant="bar">`
→ `<BusyContainer busy={local.busy} variant="bar">`

Line 449: `</LoadingContainer>`
→ `</BusyContainer>`

### Task 3: Update solid-demo references

**Files:**
- Rename: `packages/solid-demo/src/pages/feedback/LoadingPage.tsx` → `BusyPage.tsx`
- Modify: `packages/solid-demo/src/appStructure.ts:142`
- Modify: `packages/solid-demo/src/pages/feedback/PrintPage.tsx:2,302,311`
- Modify: `packages/solid-demo/src/pages/service/SharedDataPage.tsx:13,172,174`

**Step 1: Rename and update LoadingPage.tsx → BusyPage.tsx**

Rename file, then update all content:
- Import: `LoadingProvider, LoadingContainer, useLoading` → `BusyProvider, BusyContainer, useBusy`
- `LoadingDemo` → `BusyDemo`
- `useLoading()` → `useBusy()`
- All `<LoadingContainer>` → `<BusyContainer>`
- `<LoadingProvider>` → `<BusyProvider>`
- UI text: "전역 Loading" → "전역 Busy", "LoadingContainer" → "BusyContainer" etc.

**Step 2: Update appStructure.ts**

Line 142: `{ code: "busy", title: "Loading", component: lazy(() => import("./pages/feedback/LoadingPage")) },`
→ `{ code: "busy", title: "Busy", component: lazy(() => import("./pages/feedback/BusyPage")) },`

**Step 3: Update PrintPage.tsx**

Line 2: `import { LoadingProvider, ... } from "@simplysm/solid";`
→ `import { BusyProvider, ... } from "@simplysm/solid";`

Line 302: `<LoadingProvider>` → `<BusyProvider>`
Line 311: `</LoadingProvider>` → `</BusyProvider>`

**Step 4: Update SharedDataPage.tsx**

Line 13: `LoadingContainer,` → `BusyContainer,`
Line 172: `<LoadingContainer busy={true}>` → `<BusyContainer busy={true}>`
Line 174: `</LoadingContainer>` → `</BusyContainer>`

### Task 4: Update documentation

**Files:**
- Modify: `packages/solid/README.md:150,161`
- Modify: `packages/solid/docs/feedback.md:63-87`
- Modify: `packages/solid/docs/hooks.md:129-131`

**Step 1: Update README.md**

Line 150: `` - [`Loading`](docs/feedback.md#loading) - Loading overlay with spinner/bar variants (`useLoading`) ``
→ `` - [`Busy`](docs/feedback.md#busy) - Busy overlay with spinner/bar variants (`useBusy`) ``

Line 161: `` - [`useLoading`](docs/hooks.md#useloading) - Loading overlay control ``
→ `` - [`useBusy`](docs/hooks.md#usebusy) - Busy overlay control ``

**Step 2: Update docs/feedback.md**

Replace the Loading section (lines 63-87) — rename all `Loading*` → `Busy*`, `useLoading` → `useBusy`, `loadingVariant` → `busyVariant`.

**Step 3: Update docs/hooks.md**

Lines 129-131:
```
## useLoading
Hook to access loading overlay. Must be used inside `InitializeProvider`. See [Loading](feedback.md#loading) for detailed API.
```
→
```
## useBusy
Hook to access busy overlay. Must be used inside `InitializeProvider`. See [Busy](feedback.md#busy) for detailed API.
```

### Task 5: Verify

**Step 1: TypeCheck**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
```
Expected: No errors.

**Step 2: Lint**

```bash
pnpm lint packages/solid
pnpm lint packages/solid-demo
```
Expected: No errors.
