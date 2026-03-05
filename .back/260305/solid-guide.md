# SolidJS Guide

## `solid` Package Directory Structure (`packages/solid/src/`)

Classification is based on how the user perceives each unit.

| Directory | Role | Examples |
|-----------|------|----------|
| `components/` | Pure UI building blocks | Button, Sheet, Select, Dialog, Calendar |
| `components/features/` | Wrapper components combining multiple pure components | CrudSheet, CrudDetail, SharedDataSelect, PermissionTable |
| `directives/` | DOM behavior attachment | ripple |
| `hooks/` | Reusable logic | createPointerDrag, useLocalStorage |
| `providers/` | App-wide state/service injection | ThemeContext, ServiceClient, SharedDataProvider |
| `helpers/` | Utility functions | createAppStructure, mergeStyles |
| `styles/` | Shared style tokens/patterns | tokens.styles, patterns.styles |

- **components vs features**: Standalone UI units go in `components/`. Pre-built wrappers that combine multiple components for common patterns go in `components/features/`.
- Place new files in the directory matching the criteria above.

## Demo Page Rules

- No raw HTML elements → use `@simplysm/solid` components
- Read existing demos before writing new ones
