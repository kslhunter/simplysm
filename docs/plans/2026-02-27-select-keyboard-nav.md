# Select Keyboard Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Replace Dropdown's hardcoded focusable selector with `tabbable()` so that all tabbable elements (including search TextInput) participate in arrow key navigation.

**Architecture:** Modify Dropdown's two keyboard handlers (`handleTriggerKeyDown`, `handlePopupKeyDown`) to use `tabbable()` from the `tabbable` library. The popup handler changes from "always go to trigger" to "navigate to prev/next tabbable, then trigger at boundaries". List's internal arrow key navigation is unaffected (uses `stopPropagation`).

**Tech Stack:** `tabbable` ^6.4.0, SolidJS, Vitest + @solidjs/testing-library

---

### Task 1: Add `tabbable` dependency

**Files:**
- Modify: `packages/solid/package.json:25-56` (dependencies section)

**Step 1: Add tabbable to dependencies**

In `packages/solid/package.json`, add `"tabbable": "^6.4.0"` to the `dependencies` object (alphabetical order, after `tailwindcss`):

```json
    "tailwind-merge": "^3.5.0",
    "tailwindcss": "^3.4.19",
    "tabbable": "^6.4.0"
```

**Step 2: Install**

Run: `pnpm install`
Expected: lockfile updated, no errors

**Step 3: Commit**

```bash
git add packages/solid/package.json pnpm-lock.yaml
git commit -m "chore(solid): add tabbable dependency for keyboard navigation"
```

---

### Task 2: Write failing tests for tabbable-based keyboard navigation

**Files:**
- Modify: `packages/solid/tests/components/disclosure/Dropdown.spec.tsx`

**Reference:** Design doc `docs/plans/2026-02-27-select-keyboard-nav-design.md` — Focus Flow section

**Step 1: Write failing tests**

Add a new `describe("keyboardNav tabbable navigation")` block at the end of the existing test file. Tests use a Dropdown with `keyboardNav` containing an `<input>` and `<button>` before a `[data-list-item]` element to verify the full tabbable flow.

```tsx
describe("keyboardNav tabbable navigation", () => {
  it("ArrowDown from trigger focuses first tabbable in popup (input, not list item)", async () => {
    const [open, setOpen] = createSignal(true);

    render(() => (
      <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
        <Dropdown.Trigger>
          <button data-testid="trigger">trigger</button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <input data-testid="search" />
          <button data-testid="action-btn" type="button">action</button>
          <button data-list-item data-testid="item1" type="button">item1</button>
        </Dropdown.Content>
      </Dropdown>
    ));

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const triggerWrapper = document.querySelector("[data-dropdown-trigger]") as HTMLElement;
    triggerWrapper.focus();

    fireEvent.keyDown(triggerWrapper, { key: "ArrowDown" });

    const search = document.querySelector('[data-testid="search"]') as HTMLElement;
    expect(document.activeElement).toBe(search);
  });

  it("ArrowDown from input focuses next tabbable (button)", async () => {
    const [open, setOpen] = createSignal(true);

    render(() => (
      <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
        <Dropdown.Trigger>
          <button data-testid="trigger">trigger</button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <input data-testid="search" />
          <button data-testid="action-btn" type="button">action</button>
          <button data-list-item data-testid="item1" type="button">item1</button>
        </Dropdown.Content>
      </Dropdown>
    ));

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const search = document.querySelector('[data-testid="search"]') as HTMLElement;
    search.focus();

    const popup = document.querySelector("[data-dropdown]") as HTMLElement;
    fireEvent.keyDown(popup, { key: "ArrowDown" });

    const actionBtn = document.querySelector('[data-testid="action-btn"]') as HTMLElement;
    expect(document.activeElement).toBe(actionBtn);
  });

  it("ArrowUp from input focuses trigger (no prev tabbable, dir=down)", async () => {
    const [open, setOpen] = createSignal(true);

    render(() => (
      <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
        <Dropdown.Trigger>
          <button data-testid="trigger">trigger</button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <input data-testid="search" />
          <button data-list-item data-testid="item1" type="button">item1</button>
        </Dropdown.Content>
      </Dropdown>
    ));

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const search = document.querySelector('[data-testid="search"]') as HTMLElement;
    search.focus();

    const popup = document.querySelector("[data-dropdown]") as HTMLElement;
    fireEvent.keyDown(popup, { key: "ArrowUp" });

    const triggerWrapper = document.querySelector("[data-dropdown-trigger]") as HTMLElement;
    expect(document.activeElement).toBe(triggerWrapper);
  });

  it("ArrowUp from action button focuses prev tabbable (input)", async () => {
    const [open, setOpen] = createSignal(true);

    render(() => (
      <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
        <Dropdown.Trigger>
          <button data-testid="trigger">trigger</button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <input data-testid="search" />
          <button data-testid="action-btn" type="button">action</button>
          <button data-list-item data-testid="item1" type="button">item1</button>
        </Dropdown.Content>
      </Dropdown>
    ));

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const actionBtn = document.querySelector('[data-testid="action-btn"]') as HTMLElement;
    actionBtn.focus();

    const popup = document.querySelector("[data-dropdown]") as HTMLElement;
    fireEvent.keyDown(popup, { key: "ArrowUp" });

    const search = document.querySelector('[data-testid="search"]') as HTMLElement;
    expect(document.activeElement).toBe(search);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dropdown.spec.tsx --run --project=solid`
Expected: FAIL — ArrowDown from trigger focuses `[data-list-item]` instead of `<input>`

**Step 3: Commit failing tests**

```bash
git add packages/solid/tests/components/disclosure/Dropdown.spec.tsx
git commit -m "test(solid): add failing tests for tabbable keyboard navigation in Dropdown"
```

---

### Task 3: Implement tabbable-based keyboard navigation

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:1` (add import)
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:321-326` (handleTriggerKeyDown)
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:349-368` (handlePopupKeyDown)

**Reference:** Design doc `docs/plans/2026-02-27-select-keyboard-nav-design.md` — Changes section

**Step 1: Add tabbable import**

At the top of `Dropdown.tsx`, add:

```typescript
import { tabbable } from "tabbable";
```

**Step 2: Replace focusable selector in handleTriggerKeyDown**

Replace lines 322-326:

```typescript
// Before
const focusables = [
  ...popup.querySelectorAll<HTMLElement>(
    '[tabindex]:not([tabindex="-1"]), button, [data-list-item]',
  ),
];

// After
const focusables = tabbable(popup);
```

**Step 3: Replace handlePopupKeyDown with tabbable-aware navigation**

Replace the entire `handlePopupKeyDown` function (lines 349-368):

```typescript
const handlePopupKeyDown = (e: KeyboardEvent) => {
  if (!local.keyboardNav) return;
  if (e.defaultPrevented) return;
  if (!triggerRef) return;

  const popup = popupRef();
  if (!popup) return;

  const dir = direction();
  const allTabbable = tabbable(popup);
  const current = e.target as HTMLElement;
  const currentIdx = allTabbable.indexOf(current);

  if (e.key === "ArrowUp") {
    if (currentIdx > 0) {
      e.preventDefault();
      allTabbable[currentIdx - 1]!.focus();
    } else if (dir === "down") {
      e.preventDefault();
      triggerRef.focus();
    }
  } else if (e.key === "ArrowDown") {
    if (currentIdx >= 0 && currentIdx < allTabbable.length - 1) {
      e.preventDefault();
      allTabbable[currentIdx + 1]!.focus();
    } else if (dir === "up") {
      e.preventDefault();
      triggerRef.focus();
    }
  }
};
```

**Step 4: Update JSDoc for keyboardNav prop**

Update the comment at lines 70-82 to reflect the new behavior:

```typescript
/**
 * Enable keyboard navigation (used in Select, etc)
 *
 * When direction=down:
 * - ArrowDown from trigger -> focus first tabbable item in popup
 * - ArrowUp/ArrowDown within popup -> navigate between tabbable items
 * - ArrowUp from first tabbable -> focus trigger
 * - ArrowUp from trigger -> close
 *
 * When direction=up:
 * - ArrowUp from trigger -> focus last tabbable item in popup
 * - ArrowUp/ArrowDown within popup -> navigate between tabbable items
 * - ArrowDown from last tabbable -> focus trigger
 * - ArrowDown from trigger -> close
 */
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dropdown.spec.tsx --run --project=solid`
Expected: ALL PASS (including existing tests + new tabbable tests)

**Step 6: Run full Select tests to verify no regressions**

Run: `pnpm vitest packages/solid/tests/components/form-control/select/Select.spec.tsx --run --project=solid`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx
git commit -m "fix(solid): use tabbable() for Dropdown keyboard navigation

Replace hardcoded focusable selector with tabbable() library so that
all tabbable elements (input, button, etc.) participate in arrow key
navigation. Update popup handler to navigate sequentially through
tabbable elements instead of always jumping to trigger."
```
