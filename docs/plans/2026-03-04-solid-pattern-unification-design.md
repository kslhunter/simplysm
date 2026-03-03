# Solid Package Pattern Unification Design

## Goal

Unify 3 inconsistent patterns across the solid package to achieve consistency and predictability.

## Unified Patterns

### 1. Context: Module-Level Declaration

Declare `createContext()` at the top of the component file (module-level). No separate `*Context.ts` files.

```tsx
// At module level (top of file)
const SelectCtx = createContext<SelectContextValue>();
```

### 2. Compound Component: Object.assign (No Type Assertion)

Use `Object.assign` without type interface or `as` assertion. TypeScript infers the type automatically.

```tsx
// No XxxComponent interface needed
export const Select = Object.assign(SelectInner, {
  Item: SelectItem,
});
```

### 3. Slot: createSlotComponent Unified

All slot sub-components use the `createSlotComponent` helper. No manual Context + onCleanup.

```tsx
const SelectHeader = createSlotComponent(SelectCtx, (ctx) => ctx.setHeader);
```

## File Structure Rules

- **Sub-components and Context merged into the main file** (no separate files)
- **`*.styles.ts`** files remain separate
- **`#region`/`#endregion`** to organize sections within merged files:

```tsx
//#region Types
interface SelectProps<T> { ... }
interface SelectContextValue<T> { ... }
//#endregion

//#region Context
const SelectCtx = createContext<SelectContextValue>();
//#endregion

//#region SelectItem
function SelectItem<T>(props: ...) { ... }
//#endregion

//#region Select
function SelectInner<T>(props: ...) { ... }
//#endregion

//#region Export
export const Select = Object.assign(SelectInner, {
  Item: SelectItem,
});
//#endregion
```

## Reference Pattern

CheckboxGroup / RadioGroup serve as the reference implementation.

## Migration Order (Component-by-Component, Simple → Complex)

### Phase 1: Compound Only (already module-level Context)

| # | Component | Changes |
|---|-----------|---------|
| 1 | Tabs | Compound → Object.assign |
| 2 | FormGroup | Compound → Object.assign |
| 3 | ListItem | Compound → Object.assign |
| 4 | Dropdown | Compound → Object.assign |
| 5 | DataSheet | Compound → Object.assign |
| 6 | CrudSheet | Compound → Object.assign |
| 7 | CrudDetail | Compound → Object.assign |

### Phase 2: Context Merge + Compound

| # | Component | Changes |
|---|-----------|---------|
| 8 | Sidebar | Merge SidebarContext.ts + 3 sub-files → Sidebar.tsx, Compound |
| 9 | Topbar | Merge TopbarContext.ts + 4 sub-files → Topbar.tsx, Compound |
| 10 | Combobox | Merge ComboboxContext.ts + ComboboxItem.tsx → Combobox.tsx, Compound |
| 11 | Kanban | Merge KanbanContext.ts → Kanban.tsx, Compound |
| 12 | Dialog | Merge DialogContext.ts + DialogProvider.tsx → Dialog.tsx, Compound |

### Phase 3: Context Merge + Compound + Slot

| # | Component | Changes |
|---|-----------|---------|
| 13 | Select | Merge SelectContext.ts + SelectItem.tsx → Select.tsx, Compound, Slot → createSlotComponent |

### Phase 4: Provider Context Merge

| # | Provider | Context Files to Merge |
|---|----------|----------------------|
| 14 | BusyProvider | BusyContext.ts |
| 15 | NotificationProvider | NotificationContext.ts |
| 16 | PrintProvider | PrintContext.ts, PrintInstanceContext.ts |
| 17 | ServiceClientProvider | ServiceClientContext.ts |
| 18 | SharedDataProvider | SharedDataContext.ts |
| 19 | SharedDataSelectList | SharedDataSelectListContext.ts |

## Files to Delete After Migration (24 files)

### Component Context Files
- `components/form-control/select/SelectContext.ts`
- `components/form-control/select/SelectItem.tsx`
- `components/form-control/combobox/ComboboxContext.ts`
- `components/form-control/combobox/ComboboxItem.tsx`
- `components/data/kanban/KanbanContext.ts`
- `components/data/list/ListContext.ts`
- `components/layout/sidebar/SidebarContext.ts`
- `components/layout/sidebar/SidebarContainer.tsx`
- `components/layout/sidebar/SidebarMenu.tsx`
- `components/layout/sidebar/SidebarUser.tsx`
- `components/layout/topbar/TopbarContext.ts`
- `components/layout/topbar/TopbarContainer.tsx`
- `components/layout/topbar/TopbarMenu.tsx`
- `components/layout/topbar/TopbarUser.tsx`
- `components/layout/topbar/TopbarActions.tsx`
- `components/disclosure/DialogContext.ts`
- `components/disclosure/DialogProvider.tsx`
- `components/features/shared-data/SharedDataSelectListContext.ts`

### Provider Context Files
- `components/feedback/busy/BusyContext.ts`
- `components/feedback/notification/NotificationContext.ts`
- `components/feedback/print/PrintContext.ts`
- `components/feedback/print/PrintInstanceContext.ts`
- `providers/ServiceClientContext.ts`
- `providers/shared-data/SharedDataContext.ts`

## index.ts Export Updates

All deleted file paths must be updated in `packages/solid/src/index.ts` to point to the merged target file. External consumers use barrel import (`@simplysm/solid`) so no breaking changes.

## Out of Scope

- Complexity reduction (large component splitting, logic simplification) — planned as separate future work
- Validation pattern unification
- Size type unification
- Style extraction consistency
