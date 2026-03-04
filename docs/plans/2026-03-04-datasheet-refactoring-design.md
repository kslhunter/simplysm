# DataSheet Refactoring Design

## Background

`packages/solid/src/components/data/sheet` directory review identified 7 actionable improvements across correctness, type safety, maintainability, and code structure.

## Decisions

| # | Item | Decision | Reason |
|---|------|----------|--------|
| 1 | Pagination negative index bug | `Math.max(1, page)` clamping | Prevents `slice(-ipp, 0)` returning wrong items |
| 2 | `as unknown as JSX.Element` cast | Create `createDefComponent` helper + apply project-wide | Centralizes casting logic for 10+ definition components |
| 3 | Circular dependency (DataSheet <-> ConfigDialog) | Keep current structure | Dynamic import works; established pattern |
| 4 | `isDescendant` stack overflow risk | Add visited Set | Prevents infinite recursion on circular tree data |
| 5 | ConfigDialog non-null assertion | Null-safe handling with `continue` | Defensive coding against stale data |
| 6 | DataSheet.tsx complexity (1288 lines) | Extract 6 hooks | Functions are independently separable with unidirectional data flow |
| 7 | Fixed column calculation scattered | Merge into hook #6 | Naturally consolidated during hook extraction |
| 8 | Naming convention inconsistency | No change needed | Already consistent: arrays=plural, scalars=singular |
| 9 | CSS width injection | Strip semicolons | Minimal defense against CSS injection via config dialog |
| 10 | Feature column position scattered | Merge into hook #6 | Naturally consolidated during hook extraction |

## Work Items

### 1. Pagination clamping

**File**: `DataSheet.tsx`

In `pagedItems` memo:
```typescript
const page = Math.max(1, currentPage());
```

### 2. `createDefComponent` helper

**New file**: `helpers/createDefComponent.ts`

Generic factory function:
- Input: props-to-definition-object transformer
- Output: Component function with `as unknown as JSX.Element` cast encapsulated
- Apply to all 10+ locations:
  - `DataSheetColumn`
  - `CrudSheetColumn`, `CrudSheetTools`, `CrudSheetHeader`, `CrudSheetFilter`
  - `CrudDetailAfter`, `CrudDetailBefore`, `CrudDetailTools`
  - `SharedDataSelect.ItemTemplate`, `SharedDataSelect.Action`

### 3. `isDescendant` visited Set

**File**: `DataSheet.tsx` (later moved into `useDataSheetReorder`)

```typescript
function isDescendant(parent: T, child: T, visited = new Set<T>()): boolean {
  if (visited.has(parent)) return false;
  visited.add(parent);
  // ... existing logic
}
```

### 4. ConfigDialog null-safe handling

**File**: `DataSheetConfigDialog.tsx`

```typescript
const info = props.columnInfos.find((c) => c.key === item.key);
if (!info) continue;
```

### 5. Hook extraction (6 hooks)

**New directory**: `components/data/sheet/hooks/`

Data flow: `items -> sortedItems -> pagedItems -> flatItems -> displayItems`

| Hook | Input | Output |
|------|-------|--------|
| `useDataSheetSorting` | props | `{ sorts, toggleSort, sortIndex, sortedItems }` |
| `useDataSheetPaging` | props, sortedItems | `{ currentPage, pageCount, pagedItems }` |
| `useDataSheetExpansion` | props, pagedItems | `{ expandedItems, flatItems, toggleExpand, isAllExpanded }` |
| `useDataSheetSelection` | props, displayItems | `{ selectedItems, toggleSelect, toggleSelectAll, rangeSelect }` |
| `useDataSheetReorder` | props, displayItems | `{ dragState, onReorderPointerDown, isDescendant }` |
| `useDataSheetFixedColumns` | props, effectiveColumns | `{ fixedLeftMap, lastFixedIndex, featureColTotalWidth, columnWidths, getFixedStyle }` |

### 6. CSS width semicolon stripping

**File**: `DataSheet.tsx`

Where `col.width` is applied to styles:
```typescript
const safeWidth = col.width?.replace(/;/g, "");
```

### 7. Test verification

Existing `DataSheet.spec.tsx` must pass without modifications.

## File Structure (After)

```
packages/solid/src/
├── helpers/
│   ├── createSlotComponent.ts         (existing)
│   └── createDefComponent.ts          (NEW)
└── components/data/sheet/
    ├── DataSheet.tsx                   (refactored — uses hooks)
    ├── DataSheetColumn.tsx             (uses createDefComponent)
    ├── DataSheetConfigDialog.tsx       (null-safe fix)
    ├── hooks/                          (NEW)
    │   ├── useDataSheetSorting.ts
    │   ├── useDataSheetPaging.ts
    │   ├── useDataSheetSelection.ts
    │   ├── useDataSheetExpansion.ts
    │   ├── useDataSheetReorder.ts
    │   └── useDataSheetFixedColumns.ts
    ├── sheetUtils.ts                   (unchanged)
    ├── types.ts                        (unchanged)
    └── DataSheet.styles.ts             (unchanged)
```

## Skipped Items

- **Circular dependency**: Kept as-is (runtime works, established pattern)
- **Naming convention**: Already consistent (arrays=plural, scalars=singular)
- **`isItemSelectable` type**: Intentional design — string is used as tooltip on disabled checkbox
