# Solid Package Pattern Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Unify Context, Compound, and Slot patterns across 19 solid components and 5 providers for consistency and predictability.

**Architecture:** Migrate components incrementally from simple (compound only) to complex (context merge + compound + slot). Each component: merge sub-component/context files into main file, apply Object.assign pattern, update index.ts exports, delete old files. Use `#region`/`#endregion` for IDE folding.

**Tech Stack:** SolidJS, TypeScript, Object.assign pattern, createSlotComponent helper

---

## Phase 1: Compound Only (7 components)

### Task 1: Tabs Component

**Files:**
- Modify: `packages/solid/src/components/disclosure/Tabs.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. In Tabs.tsx, find the export at line 151: `Tabs.Tab = TabsTabInner;`
2. Wrap entire Tabs component with `#region`/`#endregion` sections
3. Replace direct assignment with Object.assign:
   ```tsx
   //#region Export
   export const Tabs = Object.assign(TabsInner, {
     Tab: TabsTabInner,
   });
   //#endregion
   ```
4. In `index.ts`, export path remains unchanged (Tabs.tsx already exists)

**Commit:**
```bash
git add packages/solid/src/components/disclosure/Tabs.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): apply Object.assign pattern to Tabs compound component"
```

### Task 2: FormGroup Component

**Files:**
- Modify: `packages/solid/src/components/layout/FormGroup.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. In FormGroup.tsx, find the export at line 72: `FormGroup.Item = FormGroupItem;`
2. Wrap with `#region`/`#endregion` sections
3. Replace with Object.assign:
   ```tsx
   //#region Export
   export const FormGroup = Object.assign(FormGroupInner, {
     Item: FormGroupItem,
   });
   //#endregion
   ```

**Commit:**
```bash
git add packages/solid/src/components/layout/FormGroup.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): apply Object.assign pattern to FormGroup compound component"
```

### Task 3: ListItem Component

**Files:**
- Modify: `packages/solid/src/components/data/list/ListItem.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. In ListItem.tsx, line 217: `ListItem.Children = ListItemChildren;`
2. Wrap with `#region`/`#endregion` sections
3. Replace with Object.assign:
   ```tsx
   //#region Export
   export const ListItem = Object.assign(ListItemInner, {
     Children: ListItemChildren,
   });
   //#endregion
   ```

**Commit:**
```bash
git add packages/solid/src/components/data/list/ListItem.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): apply Object.assign pattern to ListItem compound component"
```

### Task 4: Dropdown Component

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. In Dropdown.tsx, lines 492-493: `Dropdown.Trigger = DropdownTrigger;` and `Dropdown.Content = DropdownContent;`
2. Wrap with `#region`/`#endregion` sections
3. Replace with Object.assign:
   ```tsx
   //#region Export
   export const Dropdown = Object.assign(DropdownInner, {
     Trigger: DropdownTrigger,
     Content: DropdownContent,
   });
   //#endregion
   ```

**Commit:**
```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): apply Object.assign pattern to Dropdown compound component"
```

### Task 5: DataSheet Component

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read DataSheet.tsx to find sub-component assignments (Column, ConfigDialog)
2. Locate the export and current pattern
3. Wrap with `#region`/`#endregion` sections
4. Convert to Object.assign pattern
5. Update index.ts export if needed

**Commit:**
```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): apply Object.assign pattern to DataSheet compound component"
```

### Task 6: CrudSheet Component

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. In CrudSheet.tsx, lines 771-774: multiple sub-component assignments
2. Wrap with `#region`/`#endregion` sections
3. Replace with Object.assign:
   ```tsx
   //#region Export
   export const CrudSheet = Object.assign(CrudSheetInner, {
     Column: CrudSheetColumn,
     Filter: CrudSheetFilter,
     Tools: CrudSheetTools,
     Header: CrudSheetHeader,
   });
   //#endregion
   ```

**Commit:**
```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheet.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): apply Object.assign pattern to CrudSheet compound component"
```

### Task 7: CrudDetail Component

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read CrudDetail.tsx to identify sub-component pattern
2. Wrap with `#region`/`#endregion` sections
3. Apply Object.assign pattern
4. Update index.ts export if needed

**Commit:**
```bash
git add packages/solid/src/components/features/crud-detail/CrudDetail.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): apply Object.assign pattern to CrudDetail compound component"
```

---

## Phase 2: Context Merge + Compound (5 components)

### Task 8: Sidebar Component

**Files:**
- Modify: `packages/solid/src/components/layout/sidebar/Sidebar.tsx`
- Delete: `packages/solid/src/components/layout/sidebar/SidebarContext.ts`
- Delete: `packages/solid/src/components/layout/sidebar/SidebarContainer.tsx`
- Delete: `packages/solid/src/components/layout/sidebar/SidebarMenu.tsx`
- Delete: `packages/solid/src/components/layout/sidebar/SidebarUser.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read all 4 files to understand structure
2. Merge SidebarContext.ts exports and types into Sidebar.tsx (after imports)
3. Merge SidebarContainer, SidebarMenu, SidebarUser functions into Sidebar.tsx with `#region` sections
4. Apply Object.assign for compound export:
   ```tsx
   //#region Export
   export const Sidebar = Object.assign(SidebarInner, {
     Container: SidebarContainer,
     Menu: SidebarMenu,
     User: SidebarUser,
   });
   //#endregion
   ```
5. Delete 4 old files via git
6. Update index.ts exports to point to Sidebar.tsx only

**Commit:**
```bash
git add packages/solid/src/components/layout/sidebar/Sidebar.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/layout/sidebar/SidebarContext.ts
git rm packages/solid/src/components/layout/sidebar/SidebarContainer.tsx
git rm packages/solid/src/components/layout/sidebar/SidebarMenu.tsx
git rm packages/solid/src/components/layout/sidebar/SidebarUser.tsx
git commit -m "refactor(solid): merge Sidebar context and sub-components, apply Object.assign"
```

### Task 9: Topbar Component

**Files:**
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx`
- Delete: `packages/solid/src/components/layout/topbar/TopbarContext.ts`
- Delete: `packages/solid/src/components/layout/topbar/TopbarContainer.tsx`
- Delete: `packages/solid/src/components/layout/topbar/TopbarMenu.tsx`
- Delete: `packages/solid/src/components/layout/topbar/TopbarUser.tsx`
- Delete: `packages/solid/src/components/layout/topbar/TopbarActions.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read all 5 files to understand structure
2. Merge TopbarContext.ts into Topbar.tsx (after imports)
3. Merge TopbarContainer, TopbarMenu, TopbarUser, TopbarActions functions with `#region` sections
4. Apply Object.assign:
   ```tsx
   //#region Export
   export const Topbar = Object.assign(TopbarInner, {
     Container: TopbarContainer,
     Menu: TopbarMenu,
     User: TopbarUser,
     Actions: TopbarActions,
   });
   //#endregion
   ```
5. Delete 5 old files via git
6. Update index.ts exports

**Commit:**
```bash
git add packages/solid/src/components/layout/topbar/Topbar.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/layout/topbar/TopbarContext.ts
git rm packages/solid/src/components/layout/topbar/TopbarContainer.tsx
git rm packages/solid/src/components/layout/topbar/TopbarMenu.tsx
git rm packages/solid/src/components/layout/topbar/TopbarUser.tsx
git rm packages/solid/src/components/layout/topbar/TopbarActions.tsx
git commit -m "refactor(solid): merge Topbar context and sub-components, apply Object.assign"
```

### Task 10: Combobox Component

**Files:**
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx`
- Delete: `packages/solid/src/components/form-control/combobox/ComboboxContext.ts`
- Delete: `packages/solid/src/components/form-control/combobox/ComboboxItem.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read ComboboxContext.ts and ComboboxItem.tsx
2. Merge ComboboxContext.ts types and context into Combobox.tsx
3. Merge ComboboxItem function with `#region` sections
4. Apply Object.assign:
   ```tsx
   //#region Export
   export const Combobox = Object.assign(ComboboxInner, {
     Item: ComboboxItem,
     ItemTemplate: ComboboxItemTemplate,
   });
   //#endregion
   ```
5. Delete 2 old files via git
6. Update index.ts exports

**Commit:**
```bash
git add packages/solid/src/components/form-control/combobox/Combobox.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/form-control/combobox/ComboboxContext.ts
git rm packages/solid/src/components/form-control/combobox/ComboboxItem.tsx
git commit -m "refactor(solid): merge Combobox context and sub-components, apply Object.assign"
```

### Task 11: Kanban Component

**Files:**
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx`
- Delete: `packages/solid/src/components/data/kanban/KanbanContext.ts`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read KanbanContext.ts
2. Merge KanbanContext.ts types into Kanban.tsx
3. Merge KanbanLaneContext (internal) into module-level context
4. Apply Object.assign:
   ```tsx
   //#region Export
   export const Kanban = Object.assign(KanbanInner, {
     Lane: KanbanLane,
     Card: KanbanCard,
     LaneTitle: KanbanLaneTitle,
     LaneTools: KanbanLaneTools,
   });
   //#endregion
   ```
5. Delete KanbanContext.ts via git
6. Update index.ts exports

**Commit:**
```bash
git add packages/solid/src/components/data/kanban/Kanban.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/data/kanban/KanbanContext.ts
git commit -m "refactor(solid): merge Kanban context, apply Object.assign"
```

### Task 12: Dialog Component

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`
- Delete: `packages/solid/src/components/disclosure/DialogContext.ts`
- Delete: `packages/solid/src/components/disclosure/DialogProvider.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read DialogContext.ts and DialogProvider.tsx
2. Extract both contexts (DialogContext + DialogSlotsContext)
3. Merge both into Dialog.tsx as module-level contexts
4. Keep DialogProvider as wrapper (or merge into Dialog if not used separately)
5. Apply Object.assign:
   ```tsx
   //#region Export
   export const Dialog = Object.assign(DialogInner, {
     Header: DialogHeader,
     Action: DialogAction,
   });
   //#endregion
   ```
6. Update DialogProvider if kept separate
7. Delete old files via git
8. Update index.ts exports

**Commit:**
```bash
git add packages/solid/src/components/disclosure/Dialog.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/disclosure/DialogContext.ts
git rm packages/solid/src/components/disclosure/DialogProvider.tsx
git commit -m "refactor(solid): merge Dialog context and provider, apply Object.assign"
```

---

## Phase 3: Context Merge + Compound + Slot (1 component)

### Task 13: Select Component

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Delete: `packages/solid/src/components/form-control/select/SelectContext.ts`
- Delete: `packages/solid/src/components/form-control/select/SelectItem.tsx`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read SelectContext.ts and SelectItem.tsx
2. Merge SelectContext.ts types and context into Select.tsx
3. Merge SelectItem function with `#region` sections
4. Convert SelectHeader and SelectAction to use createSlotComponent:
   ```tsx
   const SelectHeader = createSlotComponent(SelectCtx, (ctx) => ctx.setHeader);
   const SelectAction = createSlotComponent(SelectCtx, (ctx) => ctx.setAction);
   ```
   (These are currently manual - find where they're defined and replace with createSlotComponent calls)
5. Apply Object.assign:
   ```tsx
   //#region Export
   export const Select = Object.assign(SelectInner, {
     Item: SelectItem,
     Header: SelectHeader,
     Action: SelectAction,
     ItemTemplate: SelectItemTemplate,
   });
   //#endregion
   ```
6. Delete 2 old files via git
7. Update index.ts exports

**Commit:**
```bash
git add packages/solid/src/components/form-control/select/Select.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/form-control/select/SelectContext.ts
git rm packages/solid/src/components/form-control/select/SelectItem.tsx
git commit -m "refactor(solid): merge Select context and sub-components, unify slot pattern"
```

---

## Phase 4: Provider Context Merge (6 providers)

### Task 14: BusyProvider

**Files:**
- Modify: `packages/solid/src/components/feedback/busy/BusyProvider.tsx`
- Delete: `packages/solid/src/components/feedback/busy/BusyContext.ts`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read BusyContext.ts
2. Merge context type and createContext into BusyProvider.tsx (before Provider component)
3. Update hook to use merged context
4. Delete BusyContext.ts via git
5. Update index.ts export to point to BusyProvider.tsx

**Commit:**
```bash
git add packages/solid/src/components/feedback/busy/BusyProvider.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/feedback/busy/BusyContext.ts
git commit -m "refactor(solid): merge BusyContext into BusyProvider"
```

### Task 15: NotificationProvider

**Files:**
- Modify: `packages/solid/src/components/feedback/notification/NotificationProvider.tsx`
- Delete: `packages/solid/src/components/feedback/notification/NotificationContext.ts`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read NotificationContext.ts
2. Merge into NotificationProvider.tsx
3. Delete old file via git
4. Update index.ts export

**Commit:**
```bash
git add packages/solid/src/components/feedback/notification/NotificationProvider.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/feedback/notification/NotificationContext.ts
git commit -m "refactor(solid): merge NotificationContext into NotificationProvider"
```

### Task 16: PrintProvider

**Files:**
- Modify: `packages/solid/src/components/feedback/print/PrintProvider.tsx`
- Delete: `packages/solid/src/components/feedback/print/PrintContext.ts`
- Delete: `packages/solid/src/components/feedback/print/PrintInstanceContext.ts`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read both context files
2. Merge both into PrintProvider.tsx
3. Delete 2 old files via git
4. Update index.ts exports

**Commit:**
```bash
git add packages/solid/src/components/feedback/print/PrintProvider.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/feedback/print/PrintContext.ts
git rm packages/solid/src/components/feedback/print/PrintInstanceContext.ts
git commit -m "refactor(solid): merge PrintContext and PrintInstanceContext into PrintProvider"
```

### Task 17: ServiceClientProvider

**Files:**
- Modify: `packages/solid/src/providers/ServiceClientProvider.tsx`
- Delete: `packages/solid/src/providers/ServiceClientContext.ts`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read ServiceClientContext.ts
2. Merge into ServiceClientProvider.tsx
3. Delete old file via git
4. Update index.ts export

**Commit:**
```bash
git add packages/solid/src/providers/ServiceClientProvider.tsx packages/solid/src/index.ts
git rm packages/solid/src/providers/ServiceClientContext.ts
git commit -m "refactor(solid): merge ServiceClientContext into ServiceClientProvider"
```

### Task 18: SharedDataProvider

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`
- Delete: `packages/solid/src/providers/shared-data/SharedDataContext.ts`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read SharedDataContext.ts
2. Merge into SharedDataProvider.tsx
3. Delete old file via git
4. Update index.ts export

**Commit:**
```bash
git add packages/solid/src/providers/shared-data/SharedDataProvider.tsx packages/solid/src/index.ts
git rm packages/solid/src/providers/shared-data/SharedDataContext.ts
git commit -m "refactor(solid): merge SharedDataContext into SharedDataProvider"
```

### Task 19: SharedDataSelectList

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx`
- Delete: `packages/solid/src/components/features/shared-data/SharedDataSelectListContext.ts`
- Modify: `packages/solid/src/index.ts`

**Changes:**
1. Read SharedDataSelectListContext.ts
2. Merge into SharedDataSelectList.tsx
3. Delete old file via git
4. Update index.ts export

**Commit:**
```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx packages/solid/src/index.ts
git rm packages/solid/src/components/features/shared-data/SharedDataSelectListContext.ts
git commit -m "refactor(solid): merge SharedDataSelectListContext into SharedDataSelectList"
```

---

## Phase 5: Verification & Cleanup

### Task 20: Verify All Exports in index.ts

**Files:**
- Read: `packages/solid/src/index.ts`

**Changes:**
1. Scan index.ts for any remaining imports from deleted files
2. Verify all export paths point to existing files
3. Run type check: `pnpm run typecheck --filter="@simplysm/solid"`

**Expected Output:**
```
ESLint and TypeScript checks passed
```

**Commit:**
Not needed - verification only

### Task 21: Run Tests

**Files:**
- Test: All test files in `packages/solid/src/**/*.spec.ts`

**Changes:**
1. Run solid package tests: `pnpm run vitest --filter="@simplysm/solid" --run`
2. Verify all tests pass
3. Check demo build: `pnpm run build --filter="solid-demo"`

**Expected Output:**
```
PASS  all tests
Build successful
```

**Commit:**
Not needed - verification only

---

## Notes

- Each file merge should preserve all logic, just reorganize structure
- Use `#region`/`#endregion` for IDE folding (consistent spacing, no nested regions)
- Always run typecheck after phase completion
- Test demo app after all phases complete
- All changes are non-breaking for external consumers (barrel import pattern maintained)
