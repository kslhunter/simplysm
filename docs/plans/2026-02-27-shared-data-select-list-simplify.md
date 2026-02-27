# SharedDataSelectList Simplification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Remove the `modal` prop from SharedDataSelectList and change `header` from `string` to `JSX.Element`.

**Architecture:** Remove modal-related code (imports, props, handler, rendering) and widen header type. Since `string` is valid `JSX.Element`, existing `header="text"` usage works unchanged.

**Tech Stack:** SolidJS, Vitest + @solidjs/testing-library

---

### Task 1: Remove modal test and update header test section

**Files:**
- Modify: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx:433-462`

**Step 1: Update test describe and remove modal test**

Replace the `describe("header / modal")` block (lines 433-462) with:

```tsx
  // ─── header ────────────────────────────────────────────

  describe("header", () => {
    it("header text is displayed when header is provided", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} header="과일 목록" required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.getByText("과일 목록")).toBeTruthy();
    });
  });
```

The `header="과일 목록"` test stays unchanged — `string` is valid `JSX.Element`.
The modal test (lines 448-461) is deleted entirely since the prop is removed.

**Step 2: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx --run --project=solid`
Expected: PASS (modal test removed, header test still passes)

**Step 3: Commit**

```bash
git add packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx
git commit -m "test(solid): remove modal test from SharedDataSelectList"
```

---

### Task 2: Remove modal prop and change header type to JSX.Element

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx:1-221`

**Step 1: Remove modal-related imports**

Remove these imports (lines 2, 8, 9, 11):
- `import { IconExternalLink } from "@tabler/icons-solidjs";` (line 2)
- `import { Button } from "../../form-control/Button";` (line 8)
- `import { Icon } from "../../display/Icon";` (line 9)
- `import { useDialog } from "../../disclosure/DialogContext";` (line 11)

**Step 2: Change header type and remove modal prop**

In `SharedDataSelectListProps` interface (lines 42-45), change:

```typescript
// Before
  /** Header text */
  header?: string;
  /** Management modal component factory */
  modal?: () => JSX.Element;

// After
  /** Header content */
  header?: JSX.Element;
```

**Step 3: Remove modal from splitProps**

In the `splitProps` call (line 84), remove `"modal"` from the array.

**Step 4: Remove useDialog and handleOpenModal**

Remove:
- `const dialog = useDialog();` (line 87)
- The `handleOpenModal` function (lines 195-198)

**Step 5: Simplify header rendering**

Replace the header section (lines 213-222):

```tsx
// Before
<Show when={local.header != null || local.modal != null}>
  <div class={clsx("flex items-center gap-1 px-2 py-1 text-sm font-bold text-base-400")}>
    <Show when={local.header != null}>{local.header}</Show>
    <Show when={local.modal != null}>
      <Button size="sm" onClick={() => void handleOpenModal()}>
        <Icon icon={IconExternalLink} />
      </Button>
    </Show>
  </div>
</Show>

// After
<Show when={local.header != null}>{local.header}</Show>
```

**Step 6: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx --run --project=solid`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx
git commit -m "refactor(solid): remove modal prop from SharedDataSelectList, change header to JSX.Element"
```
