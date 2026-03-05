# Solid API Naming Refactoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename 5 public API names in the solid package to improve consistency and industry alignment.

**Architecture:** Pure rename refactoring — no logic changes. Each task covers one rename across all affected files (types, components, tests, demos, templates). Since existing tests cover all behavior, the test strategy is to rename props in tests and verify they still pass.

**Tech Stack:** TypeScript, SolidJS, Vitest

---

### Task 1: Dialog `float`/`fill` → `mode` enum

This task replaces two boolean props (`float`, `fill`) with a single `mode?: "float" | "fill"` enum prop. Both `DialogShowOptions` and `DialogProps` interfaces are affected, plus internal logic that checks `local.float`/`local.fill`.

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:59,61,75,127,129,143,222-223,230,316,453,502-503,526,529,533,548,559,739-740,747`
- Modify: `packages/solid/tests/components/disclosure/Dialog.spec.tsx:214,267,286,304`
- Modify: `packages/solid-demo/src/pages/disclosure/DialogPage.tsx:121,141`

**Step 1: Rename in Dialog source**

In `Dialog.tsx`:

1. `DialogShowOptions` interface (around line 59-75):
   - Remove `float?: boolean;` (line 59) and `fill?: boolean;` (line 61)
   - Add `mode?: "float" | "fill";`
   - Remove `canDeactivate?: () => boolean;` (line 75), add `beforeClose?: () => boolean;`

2. `DialogProps` interface (around line 127-143):
   - Remove `float?: boolean;` (line 127) and `fill?: boolean;` (line 129)
   - Add `mode?: "float" | "fill";`
   - Remove `canDeactivate?: () => boolean;` (line 143), add `beforeClose?: () => boolean;`

3. `splitProps` array (around line 220-230):
   - Remove `"float"`, `"fill"` → add `"mode"`
   - Replace `"canDeactivate"` → `"beforeClose"`

4. Internal logic replacements:
   - `local.float` → `local.mode === "float"` (lines 503, 526, 533, 548, 559)
   - `local.fill` → `local.mode === "fill"` (lines 453, 502, 529)
   - `local.canDeactivate && !local.canDeactivate()` → `local.beforeClose && !local.beforeClose()` (line 316)

5. DialogProvider JSX (around line 739-747):
   - `float={entry.options.float}` → `mode={entry.options.mode}`
   - Remove `fill={entry.options.fill}`
   - `canDeactivate={entry.options.canDeactivate}` → `beforeClose={entry.options.beforeClose}`

**Step 2: Rename in Dialog tests**

In `Dialog.spec.tsx`:
- Line 214: `canDeactivate={() => false}` → `beforeClose={() => false}`
- Line 267: `<Dialog open={true} float>` → `<Dialog open={true} mode="float">`
- Line 286: `<Dialog open={true} float>` → `<Dialog open={true} mode="float">`
- Line 304: `<Dialog open={true} fill>` → `<Dialog open={true} mode="fill">`

**Step 3: Rename in demo page**

In `DialogPage.tsx`:
- Line 121: `float width={320}` → `mode="float" width={320}`
- Line 141: `fill closeOnEscape` → `mode="fill" closeOnEscape`

**Step 4: Run Dialog tests**

Run: `pnpm -F @simplysm/solid vitest packages/solid/tests/components/disclosure/Dialog.spec.tsx --run`
Expected: ALL PASS

**Step 5: Commit**

```
refactor(solid): rename Dialog float/fill to mode enum, canDeactivate to beforeClose
```

---

### Task 2: Item predicate `is*` prefix unification

Rename `itemEditable`, `itemDeletable`, `itemDeleted`, `itemSelectable` to `isItemEditable`, `isItemDeletable`, `isItemDeleted`, `isItemSelectable`. (`isItemHidden` already has `is` prefix — no change.)

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/types.ts:86-89`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:74-77,210,461,564-565,581,620,651,692`
- Modify: `packages/solid/src/components/data/sheet/types.ts:29`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:110,395`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts:9,38-39`
- Modify: `packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx:177,199,208,224-225`
- Modify: `packages/solid/tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts` (multiple lines)
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx:515`
- Modify: `packages/solid-demo/src/pages/data/CrudSheetPage.tsx:37`
- Modify: `packages/sd-cli/templates/init/packages/client-admin/src/views/home/base/employee/EmployeeSheet.tsx.hbs:167`
- Modify: `packages/sd-cli/templates/init/packages/client-admin/src/views/home/base/role-permission/RoleSheet.tsx.hbs:88`

**Step 1: Rename in type definitions**

In `packages/solid/src/components/features/crud-sheet/types.ts`:
- `itemEditable` → `isItemEditable` (line 86)
- `itemDeletable` → `isItemDeletable` (line 87)
- `itemDeleted` → `isItemDeleted` (line 88)
- `itemSelectable` → `isItemSelectable` (line 89)

In `packages/solid/src/components/data/sheet/types.ts`:
- `itemSelectable` → `isItemSelectable` (line 29)

In `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts`:
- `itemSelectable` → `isItemSelectable` (lines 9, 38, 39)

**Step 2: Rename in component implementations**

In `CrudSheet.tsx`:
- splitProps array: `"itemEditable"` → `"isItemEditable"`, `"itemDeletable"` → `"isItemDeletable"`, `"itemDeleted"` → `"isItemDeleted"`, `"itemSelectable"` → `"isItemSelectable"` (lines 74-77)
- All `local.itemEditable` → `local.isItemEditable` (line 692)
- All `local.itemDeletable` → `local.isItemDeletable` (lines 210, 564, 651)
- All `local.itemDeleted` → `local.isItemDeleted` (lines 461, 565, 581)
- All `local.itemSelectable` → `local.isItemSelectable` (line 620)

In `DataSheet.tsx`:
- splitProps: `"itemSelectable"` → `"isItemSelectable"` (line 110)
- Context getter: `local.itemSelectable` → `local.isItemSelectable` (line 395)

**Step 3: Rename in tests**

In `CrudSheet.spec.tsx`:
- `itemDeleted=` → `isItemDeleted=` (line 177)
- `itemDeletable` → `isItemDeletable` (lines 199, 208, 224)
- `itemDeleted=` → `isItemDeleted=` (line 225)

In `useDataSheetSelection.spec.ts`:
- All `itemSelectable` → `isItemSelectable` (appears in multiple lines: 61, 63, 73, 75, 137, 139, 177, 179, 192, 195, 207, 209, 287, 289)

**Step 4: Rename in demo pages and templates**

In `packages/solid-demo/src/pages/data/SheetPage.tsx`:
- `itemSelectable=` → `isItemSelectable=` (line 515)

In `packages/solid-demo/src/pages/data/CrudSheetPage.tsx`:
- `itemDeleted=` → `isItemDeleted=` (line 37)

In `packages/sd-cli/templates/.../EmployeeSheet.tsx.hbs`:
- `itemDeleted=` → `isItemDeleted=` (line 167)
- `isItemSelectable` — already has `is` prefix, no change needed (line 168)

In `packages/sd-cli/templates/.../RoleSheet.tsx.hbs`:
- `itemDeleted=` → `isItemDeleted=` (line 88)
- `isItemSelectable` — already has `is` prefix, no change needed (line 89)

**Step 5: Run affected tests**

Run: `pnpm -F @simplysm/solid vitest packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx packages/solid/tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts --run`
Expected: ALL PASS

**Step 6: Commit**

```
refactor(solid): add is* prefix to item predicate props
```

---

### Task 3: `touchMode` → `lazyValidation`

Rename the `touchMode` prop to `lazyValidation` across all form-control components. This is a straightforward find-replace in prop definitions, splitProps arrays, JSX prop passing, and internal logic.

**Files (source — 18 files):**
- Modify: `packages/solid/src/components/form-control/Invalid.tsx:11,59,66,107`
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx:68`
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx:83`
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx:53`
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx:54`
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx:54`
- Modify: `packages/solid/src/components/form-control/field/TimePicker.tsx:54`
- Modify: `packages/solid/src/components/form-control/field/FieldShell.tsx:12`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:261,380,709`
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:172,241,430`
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx:44,71,107`
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx:16`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx:14`
- Modify: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx:27`
- Modify: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx:27`
- Modify: `packages/solid/src/components/form-control/checkbox/SelectionGroupBase.tsx:13,37`
- Modify: `packages/solid/src/components/form-control/checkbox/SelectableBase.tsx:30`
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx:83,130,253`

**Files (tests):**
- Modify: `packages/solid/tests/components/form-control/Invalid.spec.tsx` (all `touchMode` occurrences)

**Files (demo — 8 files):**
- Modify: `packages/solid-demo/src/pages/LoginPage.tsx:36,52`
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx:316`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx:142`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioGroupPage.tsx:100`
- Modify: `packages/solid-demo/src/pages/form-control/ColorPickerPage.tsx:47`
- Modify: `packages/solid-demo/src/pages/form-control/ComboboxPage.tsx:283`
- Modify: `packages/solid-demo/src/pages/form-control/SelectPage.tsx:203`

**Files (templates):**
- Modify: `packages/sd-cli/templates/init/packages/client-admin/src/views/auth/LoginView.tsx:84,98`

**Step 1: Rename in Invalid component (core)**

In `Invalid.tsx`, rename all occurrences of `touchMode` → `lazyValidation`:
- Prop definition (line 11)
- `props.touchMode` → `props.lazyValidation` (lines 59, 107)
- Variable/logic comments (line 30, 66, 105)

**Step 2: Rename in all form-control components**

For each of the 17 remaining source files listed above, replace:
- `touchMode?: boolean` → `lazyValidation?: boolean` (prop definition)
- `"touchMode"` → `"lazyValidation"` (in splitProps arrays)
- `local.touchMode` → `local.lazyValidation` (prop passing to Invalid)

**Step 3: Rename in tests**

In `Invalid.spec.tsx`:
- All `touchMode` → `lazyValidation`

**Step 4: Rename in demo pages and templates**

In all 8 demo files and 1 template file listed above:
- `touchMode` → `lazyValidation`

**Step 5: Run Invalid tests**

Run: `pnpm -F @simplysm/solid vitest packages/solid/tests/components/form-control/Invalid.spec.tsx --run`
Expected: ALL PASS

**Step 6: Commit**

```
refactor(solid): rename touchMode to lazyValidation
```

---

### Task 4: `multiDisplayDirection` → `tagDirection`

Rename the `multiDisplayDirection` prop to `tagDirection` in Select component.

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:288,306,374,601`

**Step 1: Rename in Select source**

In `Select.tsx`:
- `multiDisplayDirection?: never` → `tagDirection?: never` (line 288, SingleBaseProps)
- `multiDisplayDirection?: "horizontal" | "vertical"` → `tagDirection?: "horizontal" | "vertical"` (line 306, MultipleBaseProps)
- `"multiDisplayDirection"` → `"tagDirection"` (line 374, splitProps)
- `local.multiDisplayDirection` → `local.tagDirection` (line 601)

**Step 2: Run Select tests**

Run: `pnpm -F @simplysm/solid vitest packages/solid/tests/components/form-control/select/Select.spec.tsx --run`
Expected: ALL PASS (no test directly references `multiDisplayDirection`)

**Step 3: Commit**

```
refactor(solid): rename multiDisplayDirection to tagDirection
```

---

### Task 5: Full test suite verification

Run all solid package tests to catch any missed references.

**Step 1: Run full test suite**

Run: `pnpm -F @simplysm/solid vitest --run`
Expected: ALL PASS

**Step 2: TypeScript type check**

Run: `pnpm -F @simplysm/solid tsc --noEmit`
Expected: No errors
