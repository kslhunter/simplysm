# Modal → Dialog Terminology Unification

## Summary

Rename all `modal` terminology to `dialog` in the solid package and sd-cli templates, except for `aria-modal` (W3C standard).

## Motivation

- W3C standard uses `<dialog>` element and `role="dialog"` — component should match
- SolidJS ecosystem (Kobalte, Ark UI) uses `Dialog` as component name
- Current codebase mixes "modal" (props, types, variables) with "dialog" (component names), causing confusion
- Convention: props should follow the component name (`Dialog` → `dialog`-prefixed props)

## Scope

- **In scope**: solid package source, tests, docs, tailwind config, sd-cli templates
- **Out of scope**: `aria-modal` (W3C standard), `docs/plans/` archive documents

## Renaming Map

### Exported Types (Public API)

| Current | New | File |
|---------|-----|------|
| `ModalConfig<T>` | `DialogConfig<T>` | DataSelectButton.tsx |
| `ModalEditConfig<TItem>` | `DialogEditConfig<TItem>` | crud-sheet/types.ts |
| `DataSelectModalResult<TKey>` | `DataSelectDialogResult<TKey>` | DataSelectButton.tsx |

### Props

| Current | New | Component |
|---------|-----|-----------|
| `modalEdit` | `dialogEdit` | CrudSheet |
| `modal` | `dialog` | DataSelectButton, SharedDataSelect, SharedDataSelectButton |

### Internal Variables/Functions

| Current | New | File |
|---------|-----|------|
| `isModal` | `isInDialog` | CrudSheet, CrudDetail |
| `handleOpenModal()` | `handleOpenDialog()` | SharedDataSelect, DataSelectButton |
| `openConfigModal()` | `openConfigDialog()` | DataSheet |
| `const modal = useContext(DialogContext)` | `const dialog = useContext(DialogContext)` | DataSheet |
| `const modalConfig = local.modal` | `const dialogConfig = local.dialog` | SharedDataSelect |

### HTML Data Attributes

| Current | New |
|---------|-----|
| `data-modal` | `data-dialog` |
| `data-modal-backdrop` | `data-dialog-backdrop` |
| `data-modal-dialog` | `data-dialog-panel` |
| `data-modal-header` | `data-dialog-header` |
| `data-modal-close` | `data-dialog-close` |
| `data-modal-content` | `data-dialog-content` |

> `data-modal-dialog` → `data-dialog-panel` to avoid `data-dialog-dialog` (follows Kobalte/Ark UI convention)

### Tailwind z-index

| Current | New |
|---------|-----|
| `"modal-backdrop": "1999"` | `"dialog-backdrop": "1999"` |
| `"modal": "2000"` | `"dialog": "2000"` |

### Preserved (No Change)

| Code | Reason |
|------|--------|
| `aria-modal={...}` | W3C standard attribute |

## Affected Files (22 total)

### Source (8)

- `crud-sheet/types.ts`
- `crud-sheet/CrudSheet.tsx`
- `crud-detail/CrudDetail.tsx`
- `data-select-button/DataSelectButton.tsx`
- `shared-data/SharedDataSelect.tsx`
- `shared-data/SharedDataSelectButton.tsx`
- `disclosure/Dialog.tsx`
- `data/sheet/DataSheet.tsx`

### Config (1)

- `tailwind.config.ts`

### Other Source (3)

- `disclosure/dialogZIndex.ts` (comment)
- `data/sheet/DataSheetConfigDialog.tsx` (eslint comment)
- `data/sheet/types.ts` (comment)

### Tests (5)

- `tests/disclosure/Dialog.spec.tsx`
- `tests/disclosure/DialogProvider.spec.tsx`
- `tests/features/crud-sheet/CrudSheet.spec.tsx`
- `tests/features/data-select-button/DataSelectButton.spec.tsx`
- `tests/features/shared-data/SharedDataSelect.spec.tsx`

### sd-cli Templates (3)

- `EmployeeSheet.tsx.hbs`
- `RoleSheet.tsx.hbs`
- `employee-crud.ts` (e2e)

### Documentation (3)

- `packages/solid/README.md`
- `packages/solid/docs/features.md`
- `packages/solid/docs/disclosure.md`
