# Solid Package API Naming Standardization

## Overview

`@simplysm/solid` package public API naming review based on industry standard comparison (Radix UI, Ark UI, Kobalte, React Aria, MUI, shadcn/ui, Headless UI).

All changes are name-only — no behavioral changes.

## Scope

- Consumer: monorepo internal only (no deprecation needed)
- Approach: batch rename in a single pass
- Convention: add "boolean default false" rule to code conventions

## Changes (17 items)

### P1 — Internal Inconsistency (6 items)

| # | Current | New | Location | Rationale |
|---|---------|-----|----------|-----------|
| 1 | `SyncStorageContext.tsx` (filename) | `SyncStorageProvider.tsx` | `providers/` | Align with `*Provider` convention |
| 2 | `LoggerContext.tsx` (filename) | `LoggerProvider.tsx` | `providers/` | Same |
| 3 | `i18n/I18nContext.tsx` (filename) | `i18n/I18nProvider.tsx` | `providers/i18n/` | Same |
| 4 | `useSidebarContext()` | `useSidebar()` | `Sidebar.tsx` + consumers | Align with `useTheme()`, `useConfig()` etc. |
| 5 | `useSidebarContextOptional()` | `useSidebar.optional()` | `Sidebar.tsx` + consumers | Object.assign pattern (same as compound components) |
| 6 | `isItemSelectable` | `itemSelectable` | CrudSheet types + consumers | Remove `is*` prefix inconsistency |

### P2 — Better Industry Term (11 items)

| # | Current | New | Location | Rationale |
|---|---------|-----|----------|-----------|
| 7 | `readonly` | `readOnly` | TextInput, Textarea + consumers | Industry standard camelCase (Kobalte, Ark UI, MUI) |
| 8 | `getIsHidden` | `isItemHidden` | Select + consumers | Remove awkward double prefix; align with item* pattern |
| 9 | `getSearchText` | `itemSearchText` | Select + consumers | Align with item* pattern |
| 10 | `getChildren` | `itemChildren` | Select + consumers | Align with item* pattern |
| 11 | `Table.Tr` / `Table.Th` / `Table.Td` | `Table.Row` / `Table.HeaderCell` / `Table.Cell` | Table.tsx + consumers | Descriptive names (MUI/Tanstack style) |
| 12 | `movable` | `draggable` | Dialog + consumers | HTML standard attribute name; MUI convention |
| 13 | `comma` | `useGrouping` | NumberInput + consumers | Intl.NumberFormat API alignment |
| 14 | `minDigits` | `minimumFractionDigits` | NumberInput + consumers | Intl.NumberFormat API alignment |
| 15 | `onSubmitted` | `onSubmitComplete` | CrudSheet + consumers | Standard tense; Chakra UI `onCloseComplete` pattern |
| 16 | `closeOnBackdrop` | `closeOnInteractOutside` | Dialog + DialogProvider + consumers | Ark UI/Kobalte convention (name only, behavior unchanged) |
| 17 | `allowCustomValue` | `allowsCustomValue` | Combobox + consumers | React Aria convention (3rd person singular) |

### Convention Addition

Add to `sd-code-conventions.md`:

> **Boolean prop defaults**: Name boolean props so their default value is `false`. Prefer `hide*`, `disable*` patterns where the feature is ON by default. Exception: inherent HTML attributes like `draggable` may default to `true`.

## Implementation

### File renames (#1-3)

- `git mv` to rename files
- Update `src/index.ts` re-export paths
- Context object export names unchanged

### useSidebar.optional() (#4-5)

```typescript
function _useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside SidebarContainer");
  return context;
}

function _useSidebarOptional(): SidebarContextValue | undefined {
  return useContext(SidebarContext);
}

export const useSidebar = Object.assign(_useSidebar, {
  optional: _useSidebarOptional,
});
```

### Prop renames (#6-17)

For each prop:
1. Update Props interface (type definition)
2. Update component implementation (splitProps, internal references)
3. Update all consumer usage (JSX prop names in client-* packages)
