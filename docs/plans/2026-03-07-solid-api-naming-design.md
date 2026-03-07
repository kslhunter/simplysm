# Solid API Naming Standardization

## Goal

Standardize `@simplysm/solid` public API naming to align with industry conventions (Radix UI, Ark UI, Kobalte, Mantine) and internal project conventions.

## Changes

### 1. ComponentSize `"default"` → `"md"` (P0)

**Rationale**: All styled UI libraries use `xs/sm/md/lg/xl` scale. `"default"` is non-standard.

**Type change** (`packages/solid/src/styles/control.styles.ts`):
```ts
// Before
export type ComponentSize = "default" | "xs" | "sm" | "lg" | "xl";
// After
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";
```

**Scope**:
- Type definition: `control.styles.ts`
- All `Record<ComponentSize, string>` mappings: rename `default:` key → `md:`
  - `pad`, `gap` in `control.styles.ts`
  - Size class records in: `Checkbox.styles.ts`, `Field.styles.ts`, `DropdownTrigger.styles.ts`, `ListItem.styles.ts`, `Button.tsx`, `Tabs.tsx`, `Progress.tsx`, `ThemeToggle.tsx`, `ColorPicker.tsx`, `RichTextEditor.tsx`, `StatePreset.tsx`, `Pagination.tsx`, `DataSelectButton.tsx`
- All `?? "default"` fallbacks → `?? "md"` (~24 locations)

### 2. Checkbox/Radio `value` → `checked` (P0)

**Rationale**: All 4 surveyed libraries use `checked`/`onCheckedChange` for boolean toggle state. Within this project, `CheckboxGroup.Item` already uses `value: TValue` with a different meaning.

**Files**:
- `SelectableBase.tsx`: `value` → `checked`, `onValueChange` → `onCheckedChange`, `validate?: (value: boolean)` → `validate?: (checked: boolean)`
- `Checkbox.tsx`: `CheckboxProps` — same renames
- `Radio.tsx`: `RadioProps` — same renames

**Internal logic** in `SelectableBase.tsx`:
- `local.value` → `local.checked`
- `local.onValueChange` → `local.onCheckedChange`
- `const [value, setValue]` → `const [checked, setChecked]`
- `splitProps` key list update

**NOT changed**: `CheckboxGroup`/`RadioGroup` keep `value: TValue[]`/`onValueChange` (different type, different semantic).

### 3. DataSheet hooks `useDataSheet*` → `createDataSheet*` (P1)

**Rationale**: Project convention — `create*` for reactive hooks wrapping SolidJS primitives, `use*` for Context-dependent hooks. These 7 hooks have zero Context dependency.

**File renames**:
| Before | After |
|---|---|
| `hooks/useDataSheetExpansion.ts` | `hooks/createDataSheetExpansion.ts` |
| `hooks/useDataSheetFixedColumns.ts` | `hooks/createDataSheetFixedColumns.ts` |
| `hooks/useDataSheetHeaderCell.tsx` | `hooks/createDataSheetHeaderCell.tsx` |
| `hooks/useDataSheetPaging.ts` | `hooks/createDataSheetPaging.ts` |
| `hooks/useDataSheetReorder.ts` | `hooks/createDataSheetReorder.ts` |
| `hooks/useDataSheetSelection.ts` | `hooks/createDataSheetSelection.ts` |
| `hooks/useDataSheetSorting.ts` | `hooks/createDataSheetSorting.ts` |

**Identifier renames** (per file):
- Function: `useDataSheet*` → `createDataSheet*`
- Interfaces: `UseDataSheet*Props` → `CreateDataSheet*Props`, `UseDataSheet*Return` → `CreateDataSheet*Return`, `UseDataSheet*Options` → `CreateDataSheet*Options`

**Consumer update**: `DataSheet.tsx` — 7 import paths + 7 function call sites.

### 4. Numpad `useEnterButton`/`useMinusButton` → `withEnterButton`/`withMinusButton` (P1)

**Rationale**: `use*` prefix conflicts with hook naming convention. Mantine uses `with*` for additive features.

**File**: `packages/solid/src/components/form-control/numpad/Numpad.tsx`

**Changes**:
- `NumpadProps`: `useEnterButton` → `withEnterButton`, `useMinusButton` → `withMinusButton`
- Internal refs: `props.useEnterButton` → `props.withEnterButton`, `props.useMinusButton` → `props.withMinusButton`

### 5. Dialog `closable` → `withCloseButton` (P2)

**Rationale**: More explicit about what the prop controls (close button visibility). Aligns with Mantine convention.

**Files**: `packages/solid/src/components/disclosure/Dialog.tsx`

**Changes**:
- `DialogShowOptions.closable` → `DialogShowOptions.withCloseButton`
- `DialogProps.closable` → `DialogProps.withCloseButton`
- Internal: `local.closable` → `local.withCloseButton`, `entry.options.closable` → `entry.options.withCloseButton`
- `splitProps` key list update
- JSDoc update: already says "Show close button" — fits the new name

## Approach

Single batch rename with one commit. All changes are mechanical find-replace with no logic modifications. Typecheck validates completeness.

## Verification

- `pnpm -F @simplysm/solid run build` (typecheck + build)
- Grep for old names to ensure no remnants
