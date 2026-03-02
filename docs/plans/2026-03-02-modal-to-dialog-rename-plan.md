# Modal → Dialog Terminology Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename all `modal` terminology to `dialog` across the solid package and sd-cli templates, except `aria-modal` (W3C standard).

**Architecture:** Pure rename refactor — no behavioral changes. All exported types, props, internal variables, HTML data attributes, Tailwind z-index names, and documentation are updated from "modal" to "dialog". The rename follows the mapping defined in `docs/plans/2026-03-02-modal-to-dialog-rename-design.md`.

**Tech Stack:** TypeScript, SolidJS, Tailwind CSS, Vitest, pnpm

---

### Task 1: Rename exported types and props in DataSelectButton

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`

**Step 1: Rename types and props**

Apply these renames throughout the file:
- `DataSelectModalResult` → `DataSelectDialogResult` (interface name + all references)
- `ModalConfig` → `DialogConfig` (interface name + all references)
- `modal` prop → `dialog` prop (in `DataSelectButtonProps` interface + `splitProps`)
- `handleOpenModal` → `handleOpenDialog` (function name + all call sites)
- Comments: "modal" → "dialog" (except `aria-modal`)

Specific changes:
- Line 31: `export interface DataSelectModalResult<TKey>` → `export interface DataSelectDialogResult<TKey>`
- Line 46: `export interface ModalConfig<TUserProps = any>` → `export interface DialogConfig<TUserProps = any>`
- Line 47: comment `Modal component` → `Dialog component`
- Line 64-65: `modal: ModalConfig` → `dialog: DialogConfig`
- Line 122: `"modal"` → `"dialog"` in splitProps
- Line 150-151: `handleOpenModal` → `handleOpenDialog`
- Line 154: `DataSelectModalResult` → `DataSelectDialogResult`
- Line 156: `DataSelectModalResult` → `DataSelectDialogResult`
- Line 158-159: `local.modal.component` → `local.dialog.component`, `local.modal.props` → `local.dialog.props`
- Line 198-199: same pattern
- Line 208: `local.modal.option` → `local.dialog.option`
- Line 276, 299: `handleOpenModal` → `handleOpenDialog`
- All comments referencing "modal" → "dialog"

**Step 2: Run typecheck to verify**

Run: `pnpm run check packages/solid --type typecheck`
Expected: Type errors in test files and consumer files (expected — will fix in later tasks)

---

### Task 2: Rename types and props in CrudSheet

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/types.ts`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`

**Step 1: Rename types.ts**

- Line 22: `export interface ModalEditConfig<TItem>` → `export interface DialogEditConfig<TItem>`
- Lines 73-75: `modalEdit` → `dialogEdit`, `ModalEditConfig` → `DialogEditConfig`

**Step 2: Rename CrudSheet.tsx**

- Line 88: `"modalEdit"` → `"dialogEdit"` in splitProps
- Line 101: `const isModal` → `const isInDialog`
- Line 103: `isModal &&` → `isInDialog &&`
- Lines 267-299: `local.modalEdit` → `local.dialogEdit` (all occurrences)
- Line 416: `!isModal` → `!isInDialog`
- Lines 478-479: comment + `isModal` → `isInDialog`
- Line 496: `!isModal` → `!isInDialog`
- Line 537: `isModal` → `isInDialog`
- Lines 547-578: `local.modalEdit` → `local.dialogEdit`
- Line 629: `local.modalEdit` → `local.dialogEdit`
- Lines 692-694: `local.modalEdit` → `local.dialogEdit`
- Line 750: `isModal` → `isInDialog`
- All comments: "Modal" → "Dialog"

---

### Task 3: Rename internal variable in CrudDetail

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx`

**Step 1: Rename variables**

- Line 71: `const isModal` → `const isInDialog`
- Line 275-276: comment + `isModal` → `isInDialog`
- Line 290: `!isModal` → `!isInDialog`
- Line 292: `!isModal` → `!isInDialog`
- Line 355-356: comment + `isModal` → `isInDialog`

---

### Task 4: Rename in SharedDataSelect and SharedDataSelectButton

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx`

**Step 1: Rename SharedDataSelect.tsx**

- Line 19: `DataSelectModalResult` → `DataSelectDialogResult`
- Line 20: `ModalConfig` → `DialogConfig`
- Line 91-92: `modal?: ModalConfig` → `dialog?: DialogConfig`
- Line 106: `"modal"` → `"dialog"` in splitProps
- Line 157-158: `handleOpenModal` → `handleOpenDialog`
- Line 159: `local.modal` → `local.dialog`
- Line 161: `const modalConfig = local.modal` → `const dialogConfig = local.dialog`
- Line 162: `DataSelectModalResult` → `DataSelectDialogResult`
- Line 164: `DataSelectModalResult` → `DataSelectDialogResult`
- Line 166-167: `modalConfig.component`, `modalConfig.props` → `dialogConfig.component`, `dialogConfig.props`
- Line 176: `modalConfig.option` → `dialogConfig.option`
- Line 224: `local.modal` → `local.dialog`
- Line 225: `handleOpenModal` → `handleOpenDialog`
- Comments: "modal" → "dialog"

**Step 2: Rename SharedDataSelectButton.tsx**

- Line 6: `ModalConfig` → `DialogConfig`
- Line 30-31: `modal: ModalConfig` → `dialog: DialogConfig`
- Comment: "modal" → "dialog"

---

### Task 5: Rename HTML data attributes in Dialog.tsx

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`

**Step 1: Rename data attributes**

- Line 42: comment `Modal open state` → `Dialog open state`
- Line 482: `data-modal` → `data-dialog`
- Line 485: `data-modal-backdrop` → `data-dialog-backdrop`
- Line 493: `data-modal-dialog` → `data-dialog-panel`
- Line 506: `data-modal-header` → `data-dialog-header`
- Line 521: `data-modal-close` → `data-dialog-close`
- Line 534: `data-modal-content` → `data-dialog-content`

**PRESERVE:** `aria-modal={local.float ? undefined : true}` (line 495) — W3C standard

---

### Task 6: Rename in DataSheet and related files

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`
- Modify: `packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx`
- Modify: `packages/solid/src/components/data/sheet/types.ts`
- Modify: `packages/solid/src/components/disclosure/dialogZIndex.ts`

**Step 1: Rename DataSheet.tsx**

- Line 114: `const modal = useContext(DialogContext)` → `const dialog = useContext(DialogContext)`
- Line 166: `openConfigModal` → `openConfigDialog`
- Line 167: `if (!modal)` → `if (!dialog)`
- Line 188: `const result = await modal.show` → `const result = await dialog.show`
- Line 773: `modal != null` → `dialog != null`
- Line 785: `modal != null` → `dialog != null`
- Line 788: `onClick={openConfigModal}` → `onClick={openConfigDialog}`

**Step 2: Rename DataSheetConfigDialog.tsx comment**

- Line 40: `modal props` → `dialog props` in eslint-disable comment

**Step 3: Rename types.ts comment**

- Line 141: `config modal` → `config dialog` in comment

**Step 4: Rename dialogZIndex.ts comment**

- Line 5: `z-modal` → `z-dialog` in comment

---

### Task 7: Rename Tailwind z-index config

**Files:**
- Modify: `packages/solid/tailwind.config.ts`

**Step 1: Rename z-index keys**

- Line 53: `"modal-backdrop": "1999"` → `"dialog-backdrop": "1999"`
- Line 54: `"modal": "2000"` → `"dialog": "2000"`

---

### Task 8: Update all test files

**Files:**
- Modify: `packages/solid/tests/components/disclosure/Dialog.spec.tsx`
- Modify: `packages/solid/tests/components/disclosure/DialogProvider.spec.tsx`
- Modify: `packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx`
- Modify: `packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx`
- Modify: `packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx`

**Step 1: Dialog.spec.tsx — rename data attribute selectors**

Replace all occurrences:
- `[data-modal]` → `[data-dialog]`
- `[data-modal-backdrop]` → `[data-dialog-backdrop]`
- `[data-modal-dialog]` → `[data-dialog-panel]`
- `[data-modal-header]` → `[data-dialog-header]`
- `[data-modal-close]` → `[data-dialog-close]`
- `[data-modal-content]` → `[data-dialog-content]`
- Test description: `"sets data-modal attribute"` → `"sets data-dialog attribute"`
- Test description: `"sets role=dialog and aria-modal attributes"` → keep (refers to aria-modal)
- Test description: `"does not set aria-modal in float mode"` → keep (refers to aria-modal)

**Step 2: DialogProvider.spec.tsx — rename selectors and test-ids**

- `[data-modal]` → `[data-dialog]`
- `[data-modal-header]` → `[data-dialog-header]`
- `[data-testid="modal-content"]` → `[data-testid="dialog-content"]`
- Variable: `const modal = document.querySelector` → `const dialog = document.querySelector`

**Step 3: CrudSheet.spec.tsx — rename selectors and describe block**

- `[data-modal-content]` → `[data-dialog-content]`
- `describe("CrudSheet modal mode"` → `describe("CrudSheet dialog mode"`
- `modalEdit` prop → `dialogEdit` prop (if any test uses it)

**Step 4: DataSelectButton.spec.tsx — rename props and test helpers**

- `TestModalComponent` → `TestDialogComponent` (function name + all references)
- `[data-testid="modal-content"]` → `[data-testid="dialog-content"]`
- `[data-testid="modal-confirm"]` → `[data-testid="dialog-confirm"]`
- `modal={{ component:` → `dialog={{ component:` (all occurrences)
- Comments: "Modal component" → "Dialog component", "modal" → "dialog"
- Test descriptions: "opens modal" → "opens dialog", "modal is cancelled" → "dialog is cancelled"

**Step 5: SharedDataSelect.spec.tsx — rename props and test helpers**

- `TestModalComponent` → `TestDialogComponent` (function name + all references)
- `[data-testid="modal-content"]` → `[data-testid="dialog-content"]`
- `[data-testid="modal-confirm"]` → `[data-testid="dialog-confirm"]`
- `modal={{` → `dialog={{`
- Test descriptions: "opens modal" → "opens dialog", "modal component" → "dialog component"

**Step 6: Run all tests**

Run: `pnpm run check packages/solid --type test`
Expected: All tests pass

---

### Task 9: Update sd-cli templates

**Files:**
- Modify: `packages/sd-cli/templates/init/packages/client-admin/src/views/home/base/employee/EmployeeSheet.tsx.hbs`
- Modify: `packages/sd-cli/templates/init/packages/client-admin/src/views/home/base/role-permission/RoleSheet.tsx.hbs`
- Modify: `packages/sd-cli/templates/init/tests/e2e/src/employee-crud.ts`

**Step 1: EmployeeSheet.tsx.hbs**

- Line 7: `ModalEditConfig` → `DialogEditConfig`
- Line 76: `const modalEdit: ModalEditConfig` → `const dialogEdit: DialogEditConfig`
- Line 172: `modalEdit={modalEdit}` → `dialogEdit={dialogEdit}`

**Step 2: RoleSheet.tsx.hbs**

- Line 4: `ModalEditConfig` → `DialogEditConfig`
- Line 37: `const modalEdit: ModalEditConfig` → `const dialogEdit: DialogEditConfig`
- Line 93: `modalEdit={modalEdit}` → `dialogEdit={dialogEdit}`

**Step 3: employee-crud.ts e2e**

- Line 13: `[data-modal-dialog]` → `[data-dialog-panel]`
- Line 28: `[data-modal-dialog]` → `[data-dialog-panel]`
- Line 29: `[data-modal-backdrop]` → `[data-dialog-backdrop]`

---

### Task 10: Update documentation

**Files:**
- Modify: `packages/solid/README.md`
- Modify: `packages/solid/docs/features.md`
- Modify: `packages/solid/docs/disclosure.md`

**Step 1: README.md**

- Line 124: `Modal dialog` → `Dialog` (keep if description already says "Dialog")
- Line 220: `selection modal` → `selection dialog`
- Line 221: `inline/modal edit` → `inline/dialog edit`

**Step 2: features.md**

- Line 31: `modal actions` → `dialog actions`
- Line 54: `modal` prop → `dialog` prop
- Line 55: `editModal` → `editDialog` (if applicable)
- Line 71: `modal={() =>` → `dialog={() =>`
- Line 89: `modal` prop → `dialog` prop
- Line 130: `selection modal dialog` → `selection dialog`
- Line 139: `modal={() =>` → `dialog={() =>`
- Line 151: `modal` prop → `dialog` prop
- Line 162: `DataSelectModalResult` → `DataSelectDialogResult`
- Line 168: `modal editing` → `dialog editing`
- Line 197: `modalEdit` → `dialogEdit`
- Line 215: `modalEdit` prop, `ModalEditConfig` → `dialogEdit`, `DialogEditConfig`
- Line 234: `ModalEditConfig` → `DialogEditConfig`
- Line 238: `edit modal` → `edit dialog`
- Line 510: `ModalEditConfig` → `DialogEditConfig`
- Line 519: `DataSelectModalResult` → `DataSelectDialogResult`

**Step 3: disclosure.md**

- Line 63: `Modal dialog` → `Dialog` (if appropriate in context)

---

### Task 11: Final verification

**Step 1: Search for remaining "modal" references (excluding aria-modal)**

Run grep to find any missed occurrences of "modal" (case-insensitive) in `packages/solid/src/`, `packages/solid/tests/`, `packages/solid/docs/`, `packages/solid/README.md`, `packages/solid/tailwind.config.ts`, and `packages/sd-cli/templates/`.

Exclude: `aria-modal`, `docs/plans/`

**Step 2: Run full check**

Run: `pnpm run check packages/solid`
Expected: 0 typecheck errors, 0 lint errors, all tests pass

**Step 3: Commit**

```bash
git add packages/solid/ packages/sd-cli/templates/
git commit -m "refactor(solid): rename modal terminology to dialog

Unify all 'modal' references to 'dialog' across solid package
and sd-cli templates, following W3C and SolidJS ecosystem conventions.

- Types: ModalConfig → DialogConfig, ModalEditConfig → DialogEditConfig,
  DataSelectModalResult → DataSelectDialogResult
- Props: modalEdit → dialogEdit, modal → dialog
- Variables: isModal → isInDialog, handleOpenModal → handleOpenDialog
- HTML: data-modal-* → data-dialog-*, data-modal-dialog → data-dialog-panel
- Tailwind: z-modal → z-dialog, z-modal-backdrop → z-dialog-backdrop
- Preserved: aria-modal (W3C standard attribute)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
