# Solid Package Directory Structure Refactoring

## Overview

Refactor `packages/solid/src/` directory structure to separate pure UI components from composite wrapper components (features).

## Classification Criteria

Based on how users perceive each unit:

| Directory | Role |
|-----------|------|
| `components/` | Pure UI building blocks |
| `components/features/` | Wrapper components combining multiple pure components |
| `directives/` | DOM behavior attachment |
| `hooks/` | Reusable logic |
| `providers/` | App-wide state/service injection |
| `helpers/` | Utility functions |
| `styles/` | Shared style tokens/patterns |

## File Moves (6 directories)

| From | To |
|------|-----|
| `components/form-control/shared-data/` | `components/features/shared-data/` |
| `components/data/crud-detail/` | `components/features/crud-detail/` |
| `components/data/crud-sheet/` | `components/features/crud-sheet/` |
| `components/data/permission-table/` | `components/features/permission-table/` |
| `components/form-control/data-select-button/` | `components/features/data-select-button/` |
| `features/address/` | `components/features/address/` |

## No Changes

- `providers/shared-data/` — stays as is
- `components/data/` remaining: sheet, list, calendar, kanban, Table, Pagination
- `components/form-control/` remaining: checkbox, combobox, select, etc.
- All other directories

## Impact

- **File content**: No changes to file internals (logic untouched)
- **`index.ts`**: Export paths updated to new locations
- **Internal imports**: Relative import paths in moved files adjusted for new depth
- **External packages**: No impact (all external imports go through `@simplysm/solid` via `index.ts`)
- **Tests/demos**: Fix any direct relative-path imports in `packages/solid/tests/`
- **Cleanup**: Delete empty `features/` (top-level) directory after move

## Execution Order

1. Create `components/features/` and move 6 directories
2. Fix relative import paths inside moved files
3. Update `index.ts` export paths
4. Fix test imports if any
5. Delete empty `features/` directory
6. Verify: typecheck, lint, tests
