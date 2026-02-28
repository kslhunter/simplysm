# Crud Keyboard Shortcut Focus-Free Activation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Make CrudDetail/CrudSheet keyboard shortcuts (Ctrl+S, Ctrl+Alt+L) work without requiring form focus, using a global registry to track the active crud component.

**Architecture:** A new `crudRegistry.ts` module tracks all mounted CrudDetail/CrudSheet instances with activation timestamps. When a shortcut fires, the registry determines which crud should respond based on: (1) Dialog boundary — only cruds inside the topmost Dialog are candidates, (2) most recently interacted component wins. `dialogZIndex.ts` gets a single getter function to expose the topmost Dialog element.

**Tech Stack:** SolidJS, @solid-primitives/event-listener, TypeScript

---

### Task 1: Add `getTopmostDialog()` to `dialogZIndex.ts`

**Files:**
- Modify: `packages/solid/src/components/disclosure/dialogZIndex.ts:46-48`

**Step 1: Write the failing test**

Create test file `packages/solid/tests/components/disclosure/dialogZIndex.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerDialog,
  unregisterDialog,
  getTopmostDialog,
} from "../../../src/components/disclosure/dialogZIndex";

describe("getTopmostDialog", () => {
  let el1: HTMLElement;
  let el2: HTMLElement;

  beforeEach(() => {
    el1 = document.createElement("div");
    el2 = document.createElement("div");
    // Clean up any leftover registrations
    unregisterDialog(el1);
    unregisterDialog(el2);
  });

  it("returns null when no dialogs are registered", () => {
    expect(getTopmostDialog()).toBeNull();
  });

  it("returns the only registered dialog", () => {
    registerDialog(el1);
    expect(getTopmostDialog()).toBe(el1);
    unregisterDialog(el1);
  });

  it("returns the last registered dialog when multiple are open", () => {
    registerDialog(el1);
    registerDialog(el2);
    expect(getTopmostDialog()).toBe(el2);
    unregisterDialog(el2);
    unregisterDialog(el1);
  });

  it("returns previous dialog after topmost is unregistered", () => {
    registerDialog(el1);
    registerDialog(el2);
    unregisterDialog(el2);
    expect(getTopmostDialog()).toBe(el1);
    unregisterDialog(el1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/disclosure/dialogZIndex.spec.ts --project=solid --run`
Expected: FAIL — `getTopmostDialog` is not exported

**Step 3: Implement `getTopmostDialog`**

Add to `packages/solid/src/components/disclosure/dialogZIndex.ts` after line 48:

```typescript
/** Get the topmost (front-most) Dialog element, or null if none are open */
export function getTopmostDialog(): HTMLElement | null {
  return stack.length > 0 ? stack[stack.length - 1] : null;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/disclosure/dialogZIndex.spec.ts --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/disclosure/dialogZIndex.ts packages/solid/tests/components/disclosure/dialogZIndex.spec.ts
git commit -m "feat(solid): add getTopmostDialog to dialogZIndex"
```

---

### Task 2: Create `crudRegistry.ts`

**Files:**
- Create: `packages/solid/src/components/features/crudRegistry.ts`

**Step 1: Write the failing test**

Create test file `packages/solid/tests/components/features/crudRegistry.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerCrud,
  unregisterCrud,
  activateCrud,
  isActiveCrud,
} from "../../../src/components/features/crudRegistry";

// Mock dialogZIndex — we need to control getTopmostDialog
vi.mock("../../src/components/disclosure/dialogZIndex", () => ({
  getTopmostDialog: vi.fn(() => null),
}));

import { getTopmostDialog } from "../../../src/components/disclosure/dialogZIndex";
const mockGetTopmostDialog = vi.mocked(getTopmostDialog);

describe("crudRegistry", () => {
  let form1: HTMLFormElement;
  let form2: HTMLFormElement;

  beforeEach(() => {
    form1 = document.createElement("form");
    form2 = document.createElement("form");
    // Clean state
    unregisterCrud("a");
    unregisterCrud("b");
    mockGetTopmostDialog.mockReturnValue(null);
  });

  it("single registered crud is active", () => {
    registerCrud("a", form1);
    expect(isActiveCrud("a")).toBe(true);
    unregisterCrud("a");
  });

  it("last registered crud is active (auto-activate on register)", () => {
    registerCrud("a", form1);
    registerCrud("b", form2);
    expect(isActiveCrud("a")).toBe(false);
    expect(isActiveCrud("b")).toBe(true);
    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("activateCrud changes which crud is active", () => {
    registerCrud("a", form1);
    registerCrud("b", form2);
    activateCrud("a");
    expect(isActiveCrud("a")).toBe(true);
    expect(isActiveCrud("b")).toBe(false);
    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("unregistered crud is not active", () => {
    registerCrud("a", form1);
    unregisterCrud("a");
    expect(isActiveCrud("a")).toBe(false);
  });

  it("returns false for unknown id", () => {
    expect(isActiveCrud("unknown")).toBe(false);
  });

  it("Dialog boundary: only crud inside topmost Dialog is active", () => {
    const dialogEl = document.createElement("div");
    dialogEl.appendChild(form2);
    mockGetTopmostDialog.mockReturnValue(dialogEl);

    registerCrud("a", form1); // outside dialog
    registerCrud("b", form2); // inside dialog

    // b is inside the topmost dialog, so b should be active
    expect(isActiveCrud("b")).toBe(true);
    // a is outside, so a should not be active even if it was registered
    expect(isActiveCrud("a")).toBe(false);

    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("Dialog boundary: no crud inside topmost Dialog means none active", () => {
    const dialogEl = document.createElement("div");
    // form1 and form2 are NOT inside dialogEl
    mockGetTopmostDialog.mockReturnValue(dialogEl);

    registerCrud("a", form1);
    registerCrud("b", form2);

    expect(isActiveCrud("a")).toBe(false);
    expect(isActiveCrud("b")).toBe(false);

    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("Dialog boundary: most recently activated crud inside dialog wins", () => {
    const dialogEl = document.createElement("div");
    const form3 = document.createElement("form");
    dialogEl.appendChild(form2);
    dialogEl.appendChild(form3);
    mockGetTopmostDialog.mockReturnValue(dialogEl);

    registerCrud("a", form1);  // outside
    registerCrud("b", form2);  // inside
    registerCrud("c", form3);  // inside, last registered

    expect(isActiveCrud("c")).toBe(true);
    expect(isActiveCrud("b")).toBe(false);

    activateCrud("b");
    expect(isActiveCrud("b")).toBe(true);
    expect(isActiveCrud("c")).toBe(false);

    unregisterCrud("a");
    unregisterCrud("b");
    unregisterCrud("c");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/features/crudRegistry.spec.ts --project=solid --run`
Expected: FAIL — module not found

**Step 3: Implement `crudRegistry.ts`**

Create `packages/solid/src/components/features/crudRegistry.ts`:

```typescript
/**
 * Crud activation registry
 *
 * Tracks mounted CrudDetail/CrudSheet instances and determines which one
 * should respond to keyboard shortcuts (Ctrl+S, Ctrl+Alt+L).
 *
 * Priority rules:
 * 1. If a Dialog is open, only cruds inside the topmost Dialog are candidates.
 * 2. Among candidates, the most recently activated (interacted) crud wins.
 * 3. On mount, cruds are auto-activated (last mounted = active).
 */

import { getTopmostDialog } from "../../components/disclosure/dialogZIndex";

interface CrudEntry {
  id: string;
  formEl: HTMLFormElement;
  lastActivatedAt: number;
}

const entries: CrudEntry[] = [];

export function registerCrud(id: string, formEl: HTMLFormElement): void {
  const existing = entries.find((e) => e.id === id);
  if (existing) return;
  entries.push({ id, formEl, lastActivatedAt: Date.now() });
}

export function unregisterCrud(id: string): void {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx >= 0) entries.splice(idx, 1);
}

export function activateCrud(id: string): void {
  const entry = entries.find((e) => e.id === id);
  if (entry) entry.lastActivatedAt = Date.now();
}

export function isActiveCrud(id: string): boolean {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return false;

  const topDialog = getTopmostDialog();

  const candidates = topDialog
    ? entries.filter((e) => topDialog.contains(e.formEl))
    : entries;

  if (candidates.length === 0) return false;

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].lastActivatedAt > best.lastActivatedAt) {
      best = candidates[i];
    }
  }

  return best.id === id;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/features/crudRegistry.spec.ts --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/crudRegistry.ts packages/solid/tests/components/features/crudRegistry.spec.ts
git commit -m "feat(solid): add crudRegistry for keyboard shortcut activation tracking"
```

---

### Task 3: Integrate `crudRegistry` into `CrudDetail.tsx`

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx:1-10,78-89,100-102,178-189`

**Step 1: Add imports**

At the top of `CrudDetail.tsx`, add:
```typescript
import { createUniqueId, onCleanup } from "solid-js"; // add createUniqueId, onCleanup to existing import
import { registerCrud, unregisterCrud, activateCrud, isActiveCrud } from "../crudRegistry";
```

Note: `createUniqueId` and `onCleanup` need to be added to the existing `solid-js` import on line 1-10. `onMount` is already imported.

**Step 2: Add crud ID and registration**

After `let formRef: HTMLFormElement | undefined;` (line 83), add:
```typescript
const crudId = createUniqueId();
```

Modify the existing `onMount` block (line 100-102) from:
```typescript
onMount(() => {
  void doLoad();
});
```
to:
```typescript
onMount(() => {
  registerCrud(crudId, formRef!);
  void doLoad();
});
onCleanup(() => unregisterCrud(crudId));
```

**Step 3: Add interaction tracking**

After the `onCleanup` line, add:
```typescript
createEventListener(() => formRef, "pointerdown", () => activateCrud(crudId));
createEventListener(() => formRef, "focusin", () => activateCrud(crudId));
```

Note: `createEventListener` is already imported from `@solid-primitives/event-listener`. We use the accessor form `() => formRef` because `formRef` is assigned via JSX `ref` and may not be defined yet at call time.

**Step 4: Update keyboard handler**

Replace lines 178-189 (the keyboard shortcuts section):

From:
```typescript
// -- Keyboard Shortcuts --
createEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (!formRef?.contains(document.activeElement)) return;
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    formRef.requestSubmit();
  }
  if (e.ctrlKey && e.altKey && e.key === "l") {
    e.preventDefault();
    void handleRefresh();
  }
});
```

To:
```typescript
// -- Keyboard Shortcuts --
createEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (!isActiveCrud(crudId)) return;
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    e.stopImmediatePropagation();
    formRef!.requestSubmit();
  }
  if (e.ctrlKey && e.altKey && e.key === "l") {
    e.preventDefault();
    e.stopImmediatePropagation();
    void handleRefresh();
  }
});
```

**Step 5: Run existing tests to verify no regressions**

Run: `pnpm vitest packages/solid/tests/components/features/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: PASS (all existing tests still pass)

**Step 6: Commit**

```bash
git add packages/solid/src/components/features/crud-detail/CrudDetail.tsx
git commit -m "feat(solid): integrate crudRegistry into CrudDetail keyboard shortcuts"
```

---

### Task 4: Integrate `crudRegistry` into `CrudSheet.tsx`

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:1-10,88-99,390-402`

**Step 1: Add imports**

At the top of `CrudSheet.tsx`, add:
```typescript
import { createUniqueId, onCleanup, onMount } from "solid-js"; // add createUniqueId, onCleanup, onMount to existing import
import { registerCrud, unregisterCrud, activateCrud, isActiveCrud } from "../crudRegistry";
```

Note: Check the existing `solid-js` import (lines 1-11) — `createUniqueId`, `onCleanup`, and `onMount` may or may not already be there. Add only what's missing.

**Step 2: Add crud ID, registration, and interaction tracking**

Find `let formRef: HTMLFormElement | undefined;` in CrudSheet.tsx. After it, add:
```typescript
const crudId = createUniqueId();
onMount(() => registerCrud(crudId, formRef!));
onCleanup(() => unregisterCrud(crudId));
createEventListener(() => formRef, "pointerdown", () => activateCrud(crudId));
createEventListener(() => formRef, "focusin", () => activateCrud(crudId));
```

Note: `createEventListener` is already imported. If CrudSheet already has an `onMount`, add the `registerCrud` call inside it rather than creating a second `onMount`.

**Step 3: Update keyboard handler**

Replace lines 390-402 (the keyboard shortcuts section):

From:
```typescript
// -- Keyboard Shortcuts --
createEventListener(document, "keydown", async (e: KeyboardEvent) => {
  if (!formRef?.contains(document.activeElement)) return;
  if (e.ctrlKey && e.key === "s" && !isSelectMode()) {
    e.preventDefault();
    formRef.requestSubmit();
  }
  if (e.ctrlKey && e.altKey && e.key === "l") {
    e.preventDefault();
    if (!checkIgnoreChanges()) return;
    await doRefresh();
  }
});
```

To:
```typescript
// -- Keyboard Shortcuts --
createEventListener(document, "keydown", async (e: KeyboardEvent) => {
  if (!isActiveCrud(crudId)) return;
  if (e.ctrlKey && e.key === "s" && !isSelectMode()) {
    e.preventDefault();
    e.stopImmediatePropagation();
    formRef!.requestSubmit();
  }
  if (e.ctrlKey && e.altKey && e.key === "l") {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!checkIgnoreChanges()) return;
    await doRefresh();
  }
});
```

**Step 4: Run existing tests to verify no regressions**

Run: `pnpm vitest packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: PASS (all existing tests still pass)

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "feat(solid): integrate crudRegistry into CrudSheet keyboard shortcuts"
```

---

### Task 5: Final verification

**Step 1: Run all solid tests**

Run: `pnpm vitest --project=solid --run`
Expected: All tests PASS

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors

**Step 3: Run lint**

Run: `pnpm lint packages/solid`
Expected: No errors

**Step 4: Commit (if any fixes needed)**

Only if lint/typecheck required fixes in previous steps.
