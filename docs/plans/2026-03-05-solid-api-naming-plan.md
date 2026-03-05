# Solid API Naming Standardization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename 17 public API identifiers in `@simplysm/solid` to align with industry standards, with zero behavioral changes.

**Architecture:** Mechanical rename-only refactoring. Each task modifies type definitions, component implementations, and all usage sites (including tests and demos). No logic changes.

**Tech Stack:** SolidJS, TypeScript, Vitest (Playwright browser environment)

---

### Task 1: Rename Provider files and update index.ts

**Files:**
- Rename: `packages/solid/src/providers/SyncStorageContext.tsx` → `SyncStorageProvider.tsx`
- Rename: `packages/solid/src/providers/LoggerContext.tsx` → `LoggerProvider.tsx`
- Rename: `packages/solid/src/providers/i18n/I18nContext.tsx` → `I18nProvider.tsx`
- Rename: `packages/solid/src/providers/i18n/I18nContext.types.ts` → `I18nProvider.types.ts`
- Modify: `packages/solid/src/index.ts:107-128`
- Modify: `packages/solid/src/hooks/useLogger.ts:1` (import path)
- Modify: `packages/solid/src/providers/SystemProvider.tsx` (import paths if any)

**Step 1: Rename files using git mv**

```bash
cd packages/solid/src/providers
git mv SyncStorageContext.tsx SyncStorageProvider.tsx
git mv LoggerContext.tsx LoggerProvider.tsx
cd i18n
git mv I18nContext.tsx I18nProvider.tsx
git mv I18nContext.types.ts I18nProvider.types.ts
```

**Step 2: Update index.ts export paths**

In `packages/solid/src/index.ts`, update:
- Line 108: `"./providers/SyncStorageContext"` → `"./providers/SyncStorageProvider"`
- Line 111: `"./providers/LoggerContext"` → `"./providers/LoggerProvider"`
- Line 127: `"./providers/i18n/I18nContext"` → `"./providers/i18n/I18nProvider"`
- Line 128: `"./providers/i18n/I18nContext.types"` → `"./providers/i18n/I18nProvider.types"`

**Step 3: Update internal import paths**

- `packages/solid/src/hooks/useLogger.ts:1` — update import from `"../providers/LoggerContext"` to `"../providers/LoggerProvider"`
- Any other internal files importing from the old paths (check `useSyncConfig.ts`, `SystemProvider.tsx`)
- `packages/solid/src/providers/i18n/I18nProvider.tsx` — update self-reference import from `"./I18nContext.types"` to `"./I18nProvider.types"` (if applicable)

**Step 4: Run typecheck to verify**

```bash
pnpm typecheck packages/solid
```
Expected: PASS (no type errors)

**Step 5: Commit**

```bash
git add -A packages/solid/src/providers/ packages/solid/src/index.ts packages/solid/src/hooks/useLogger.ts
git commit -m "refactor(solid): rename *Context files to *Provider"
```

---

### Task 2: Restructure useSidebar hook

**Files:**
- Modify: `packages/solid/src/components/layout/sidebar/Sidebar.tsx:59-75` (hook definitions)
- Modify: `packages/solid/src/components/layout/sidebar/Sidebar.tsx:480` (internal usage)
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx:21,124` (import + usage)
- Modify: `packages/solid/src/index.ts:43` (if Sidebar re-exports hooks individually)

`useSidebarContext()` and `useSidebarContextOptional()` are currently standalone exported functions. `useSidebar` will be a function with an `.optional` property, using the same `Object.assign` pattern already used for compound components like `Table = Object.assign(TableBase, { Tr, Th, Td })`.

**Step 1: Rewrite hook definitions in Sidebar.tsx**

Replace the two function declarations (lines ~59-75) with:

```typescript
function _useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used inside SidebarContainer");
  }
  return context;
}

function _useSidebarOptional(): SidebarContextValue | undefined {
  return useContext(SidebarContext);
}

export const useSidebar = Object.assign(_useSidebar, {
  optional: _useSidebarOptional,
});
```

Remove the old `export function useSidebarContext` and `export function useSidebarContextOptional`.

**Step 2: Update internal usage in Sidebar.tsx**

Line ~480: `const { toggle } = useSidebarContext();` → `const { toggle } = useSidebar();`

**Step 3: Update Topbar.tsx import and usage**

- Line 21: import `{ useSidebar }` instead of `{ useSidebarContextOptional }`
- Line 124: `const sidebarContext = useSidebarContextOptional();` → `const sidebarContext = useSidebar.optional();`

**Step 4: Run typecheck**

```bash
pnpm typecheck packages/solid
```
Expected: PASS

**Step 5: Run Sidebar-related tests**

```bash
pnpm vitest packages/solid/tests --project=solid --run
```
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/components/layout/sidebar/Sidebar.tsx packages/solid/src/components/layout/topbar/Topbar.tsx
git commit -m "refactor(solid): rename useSidebarContext to useSidebar with .optional()"
```

---

### Task 3: Rename Select getter props (getIsHidden, getSearchText, getChildren)

These three Select props are renamed to the `item*` pattern: `isItemHidden`, `itemSearchText`, `itemChildren`.

Note: `getChildren` is also used in DataSheet types, sheetUtils, hooks, and PermissionTable — all need renaming.

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx` (props interface + splitProps + all references)
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:26,51,271-272` (type + usage)
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx:144`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx:181-184`
- Modify: `packages/solid/src/components/data/sheet/types.ts:34` (`getChildren` prop)
- Modify: `packages/solid/src/components/data/sheet/sheetUtils.ts:105` (`getChildren` parameter)
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx` (`getChildren` references)
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.ts` (`getChildren` references)
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.ts` (`getChildren` references)
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetReorder.ts` (`getChildren` references)
- Modify: `packages/solid/src/components/features/permission-table/PermissionTable.tsx:183,224,262`
- Test: `packages/solid/tests/components/form-control/select/Select.spec.tsx`
- Test: `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx`
- Test: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`
- Test: `packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx`
- Test: `packages/solid/tests/components/data/sheet/DataSheet.spec.tsx`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetExpansion.spec.ts`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetFixedColumns.spec.ts`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetReorder.spec.ts`

**Step 1: Rename in Select.tsx**

Replace all occurrences in props interfaces and implementation:
- `getIsHidden` → `isItemHidden` (type definition at ~267, splitProps at ~382, usages at ~509,513,514,550,558,560)
- `getSearchText` → `itemSearchText` (type definition at ~264, splitProps at ~381, usages at ~484,491,651)
- `getChildren` → `itemChildren` (type definitions at ~315,323, splitProps at ~377, usages at ~495-497,554,558)

**Step 2: Rename in DataSheet types and sheetUtils**

- `packages/solid/src/components/data/sheet/types.ts:34`: `getChildren` → `itemChildren`
- `packages/solid/src/components/data/sheet/sheetUtils.ts:105`: parameter `getChildren` → `itemChildren`
- Update all references in sheetUtils.ts

**Step 3: Rename in DataSheet.tsx and hooks**

- DataSheet.tsx: all `getChildren` references → `itemChildren`
- `hooks/useDataSheetExpansion.ts`: all `getChildren` references → `itemChildren`
- `hooks/useDataSheetFixedColumns.ts`: all `getChildren` references → `itemChildren`
- `hooks/useDataSheetReorder.ts`: all `getChildren` references → `itemChildren`

**Step 4: Rename in SharedData and PermissionTable**

- `SharedDataProvider.tsx:26,51,271-272`: `getIsHidden` → `isItemHidden`, `getSearchText` → `itemSearchText`
- `SharedDataSelectList.tsx:144`: `getSearchText` → `itemSearchText`
- `SharedDataSelect.tsx:181-184`: `getChildren` → `itemChildren`
- `PermissionTable.tsx:183,224,262`: `getChildren` → `itemChildren`

**Step 5: Update all test files**

Update variable names and prop references in:
- `Select.spec.tsx`: `getIsHidden` → `isItemHidden`, `getSearchText` → `itemSearchText`
- `SharedDataProvider.spec.tsx`: `getIsHidden` → `isItemHidden`, `getSearchText` → `itemSearchText`
- `SharedDataSelectList.spec.tsx`: same
- `SharedDataSelect.spec.tsx`: same
- `DataSheet.spec.tsx`: `getChildren` → `itemChildren`
- `useDataSheetExpansion.spec.ts`: `getChildren` → `itemChildren`
- `useDataSheetFixedColumns.spec.ts`: `getChildren` → `itemChildren`
- `useDataSheetReorder.spec.ts`: `getChildren` → `itemChildren`

**Step 6: Run tests**

```bash
pnpm vitest packages/solid/tests --project=solid --run
```
Expected: PASS

**Step 7: Commit**

```bash
git add packages/solid/
git commit -m "refactor(solid): rename Select/DataSheet getter props to item* pattern"
```

---

### Task 4: Rename Table sub-components (Tr/Th/Td → Row/HeaderCell/Cell)

**Files:**
- Modify: `packages/solid/src/components/data/Table.tsx:76` (Object.assign keys)
- Modify: `packages/solid-demo/src/pages/data/TablePage.tsx` (all JSX usage)

**Step 1: Update Object.assign in Table.tsx**

Line 76: `{ Tr: TableTr, Th: TableTh, Td: TableTd }` → `{ Row: TableTr, HeaderCell: TableTh, Cell: TableTd }`

Internal component names (`TableTr`, `TableTh`, `TableTd`) remain unchanged — only the compound property keys change.

**Step 2: Update TablePage.tsx in solid-demo**

Replace all occurrences:
- `Table.Tr` → `Table.Row`
- `Table.Th` → `Table.HeaderCell`
- `Table.Td` → `Table.Cell`

**Step 3: Run typecheck**

```bash
pnpm typecheck packages/solid packages/solid-demo
```
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/Table.tsx packages/solid-demo/
git commit -m "refactor(solid): rename Table.Tr/Th/Td to Table.Row/HeaderCell/Cell"
```

---

### Task 5: Rename Dialog props (movable → draggable, closeOnBackdrop → closeOnInteractOutside)

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx` (DialogShowOptions, DialogDefaults, implementation)
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:211` (closeOnBackdrop usage)
- Modify: `packages/sd-cli/templates/init/packages/client-admin/src/views/home/base/role-permission/RolePermissionView.tsx:27`
- Test: `packages/solid/tests/components/disclosure/Dialog.spec.tsx:125-142`

**Step 1: Rename in Dialog.tsx**

- `DialogDefaults` interface: `closeOnBackdrop` → `closeOnInteractOutside`
- `DialogShowOptions` interface: `movable` → `draggable`, `closeOnBackdrop` → `closeOnInteractOutside`
- Line ~282-283: computed accessor rename
- Line ~349: `local.movable` → `local.draggable`
- Line ~670: `closeOnBackdrop:` → `closeOnInteractOutside:`
- Line ~735: `closeOnBackdrop=` → `closeOnInteractOutside=`
- Line ~738: `movable=` → `draggable=`

**Step 2: Rename in consumers**

- `DataSheet.tsx:211`: `closeOnBackdrop: true` → `closeOnInteractOutside: true`
- `RolePermissionView.tsx:27`: `closeOnBackdrop: true` → `closeOnInteractOutside: true`

**Step 3: Update Dialog tests**

- `Dialog.spec.tsx:125`: test description "closeOnBackdrop" → "closeOnInteractOutside"
- `Dialog.spec.tsx:129`: prop `closeOnBackdrop` → `closeOnInteractOutside`
- `Dialog.spec.tsx:142`: test description update

**Step 4: Run tests**

```bash
pnpm vitest packages/solid/tests/components/disclosure/Dialog.spec.tsx --project=solid --run
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/ packages/sd-cli/
git commit -m "refactor(solid): rename movable→draggable, closeOnBackdrop→closeOnInteractOutside"
```

---

### Task 6: Rename NumberInput props (comma → useGrouping, minDigits → minimumFractionDigits)

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx` (props + implementation)
- Modify: `packages/solid/src/components/form-control/numpad/Numpad.tsx:143` (`comma={false}`)
- Test: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`

**Step 1: Rename in NumberInput.tsx**

- Props interface: `comma?: boolean` → `useGrouping?: boolean`, `minDigits?: number` → `minimumFractionDigits?: number`
- splitProps: update property names
- Implementation: all `local.comma` → `local.useGrouping`, `local.minDigits` → `local.minimumFractionDigits`
- JSDoc examples: update prop names

**Step 2: Rename in Numpad.tsx**

Line 143: `comma={false}` → `useGrouping={false}`

**Step 3: Update NumberInput tests**

- `NumberInput.spec.tsx`: all `comma=` → `useGrouping=`, `minDigits` → `minimumFractionDigits`
- Update test descriptions to use new names

**Step 4: Run tests**

```bash
pnpm vitest packages/solid/tests/components/form-control/field/NumberInput.spec.tsx --project=solid --run
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/
git commit -m "refactor(solid): rename comma→useGrouping, minDigits→minimumFractionDigits"
```

---

### Task 7: Rename readonly → readOnly

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx` (prop + implementation)
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx` (prop + implementation)
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx` (prop + implementation)
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx:357` (JSX usage)
- Modify: `packages/solid/src/components/form-control/numpad/Numpad.tsx:140` (JSX usage)
- Test: `packages/solid/tests/components/form-control/field/TextInput.spec.tsx`
- Test: `packages/solid/tests/components/form-control/field/Textarea.spec.tsx`
- Test: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`
- Test: `packages/solid/tests/components/form-control/field/DatePicker.spec.tsx`
- Test: `packages/solid/tests/components/form-control/field/DateTimePicker.spec.tsx`
- Test: `packages/solid/tests/components/form-control/field/TimePicker.spec.tsx`
- Test: `packages/solid/tests/components/form-control/field/FieldShell.spec.tsx`
- Test: `packages/solid/tests/components/data/List.spec.tsx`

**Step 1: Rename in source components**

In TextInput.tsx, Textarea.tsx, NumberInput.tsx:
- Props interface: `readonly?: boolean` → `readOnly?: boolean`
- splitProps: `"readonly"` → `"readOnly"`
- Implementation: `local.readonly` → `local.readOnly`

**Step 2: Rename in consumer components**

- `Topbar.tsx:357`: `readonly=` → `readOnly=`
- `Numpad.tsx:140`: `readonly=` → `readOnly=`

**Step 3: Update all test files**

In all test files listed above, replace `readonly` prop usage with `readOnly`.

**Step 4: Run tests**

```bash
pnpm vitest packages/solid/tests --project=solid --run
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/
git commit -m "refactor(solid): rename readonly prop to readOnly (camelCase)"
```

---

### Task 8: Rename CrudSheet/DataSheet props (isItemSelectable → itemSelectable, onSubmitted → onSubmitComplete)

**Files:**
- Modify: `packages/solid/src/components/data/sheet/types.ts:29`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:110,395`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts:9,38-39`
- Modify: `packages/solid/src/components/features/crud-sheet/types.ts:89,98`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:77,80,243,620`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts`

**Step 1: Rename isItemSelectable in DataSheet types/hooks**

- `types.ts:29`: `isItemSelectable` → `itemSelectable`
- `DataSheet.tsx:110,395`: update splitProps and context references
- `useDataSheetSelection.ts:9,38-39`: update prop type and condition checks

**Step 2: Rename in CrudSheet types and implementation**

- `types.ts:89`: `isItemSelectable` → `itemSelectable`
- `types.ts:98`: `onSubmitted` → `onSubmitComplete`
- `CrudSheet.tsx:77,80`: update splitProps
- `CrudSheet.tsx:243`: `local.onSubmitted?.()` → `local.onSubmitComplete?.()`
- `CrudSheet.tsx:620`: `isItemSelectable=` → `itemSelectable=`

**Step 3: Update tests**

- `useDataSheetSelection.spec.ts`: all `isItemSelectable` → `itemSelectable`

**Step 4: Run tests**

```bash
pnpm vitest packages/solid/tests/components/data/sheet --project=solid --run
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/
git commit -m "refactor(solid): rename isItemSelectable→itemSelectable, onSubmitted→onSubmitComplete"
```

---

### Task 9: Rename Combobox allowCustomValue → allowsCustomValue

**Files:**
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:154,232,344`
- Test: `packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx:134-166`

**Step 1: Rename in Combobox.tsx**

- Props interface line ~154: `allowCustomValue` → `allowsCustomValue`
- splitProps line ~232: update property name
- Implementation line ~344: `local.allowCustomValue` → `local.allowsCustomValue`

**Step 2: Update Combobox tests**

- `Combobox.spec.tsx:134-166`: all `allowCustomValue` → `allowsCustomValue` (test descriptions + JSX props)

**Step 3: Run tests**

```bash
pnpm vitest packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx --project=solid --run
```
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/
git commit -m "refactor(solid): rename allowCustomValue to allowsCustomValue"
```

---

### Task 10: Add boolean default convention to code conventions

**Files:**
- Modify: `.claude/refs/sd-code-conventions.md`

**Step 1: Add convention**

Add the following section after the existing conventions:

```markdown
## Boolean Prop Defaults

- Name boolean props so their default value is `false`
- Prefer `hide*`, `disable*` patterns where the feature is ON by default
- This avoids double-negation in JSX: `hideX={false}` is clearer than `showX={true}` when both mean "show X"
- Exception: inherent HTML attributes like `draggable` may default to `true`
```

**Step 2: Commit**

```bash
git add .claude/refs/sd-code-conventions.md
git commit -m "docs: add boolean prop default convention to code conventions"
```

---

### Task 11: Final verification

**Step 1: Full typecheck**

```bash
pnpm typecheck packages/solid
```
Expected: PASS

**Step 2: Full test suite**

```bash
pnpm vitest packages/solid/tests --project=solid --run
```
Expected: ALL PASS

**Step 3: Verify no leftover old names**

Search for any remaining old identifiers:

```bash
# These should return NO matches in packages/solid/src/ (excluding .back/):
grep -rn "useSidebarContext\b\|getIsHidden\|getSearchText\|closeOnBackdrop\|allowCustomValue\b\|onSubmitted\b\|isItemSelectable\b" packages/solid/src/ --include="*.ts" --include="*.tsx" || echo "Clean"
grep -rn "\"readonly\"" packages/solid/src/ --include="*.ts" --include="*.tsx" || echo "Clean"
grep -rn "\.Tr\b\|\.Th\b\|\.Td\b" packages/solid/src/ --include="*.ts" --include="*.tsx" || echo "Clean"
grep -rn "\bcomma\b.*boolean\|\bminDigits\b\|\bmovable\b.*boolean" packages/solid/src/ --include="*.ts" --include="*.tsx" || echo "Clean"
```
Expected: "Clean" for all
