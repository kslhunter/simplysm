# Icon Button Style Unification Design

## Problem

Icon button-style controls across the `solid` package use inconsistent hover backgrounds, text colors, and focus ring styles. Components like `NotificationBell`, `ThemeToggle`, `EditorToolbar`, `SidebarUser`, `Kanban`, and `StatePreset` each define their own ad-hoc styles for similar UI patterns.

## Decision

Add a shared `iconButtonBase` class constant to `patterns.styles.ts` and replace inline styles in all icon button components.

## Shared Token

```typescript
// patterns.styles.ts
export const iconButtonBase = clsx(
  "inline-flex items-center justify-center",
  "cursor-pointer",
  "rounded",
  "transition-colors",
  "text-base-600 dark:text-base-300",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "focus:outline-none",
  "focus-visible:ring-2",
);
```

### Design Choices

| Property | Value | Rationale |
|----------|-------|-----------|
| Hover background (light) | `base-200` | Mid-range contrast, already used by ThemeToggle |
| Hover background (dark) | `base-700` | Consistent across most existing usages |
| Text color | `base-600 / dark:base-300` | Slightly stronger than muted, good icon visibility |
| Focus ring | `ring-2` (Tailwind default color) | Simple, no explicit color override needed |

## Affected Components

| Component | File | Current Style | Override Needed |
|-----------|------|---------------|-----------------|
| NotificationBell | `feedback/notification/NotificationBell.tsx` | `hover:bg-base-100`, no text color, `ring-primary-500` | `rounded-full p-2` |
| ThemeToggle | `form-control/ThemeToggle.tsx` | `hover:bg-base-200`, `text-base-500/400`, `ring-2` | `p-1.5`, size variants |
| EditorToolbar | `form-control/editor/EditorToolbar.tsx` | `hover:bg-base-100 dark:bg-base-800` | Per-button layout |
| SidebarUser | `layout/sidebar/SidebarUser.tsx` | `hover:bg-base-500/10 dark:bg-base-800` | Sidebar-specific layout |
| Kanban | `data/kanban/Kanban.tsx` | `hover:bg-base-200 dark:bg-base-800` | Card button context |
| StatePreset | `form-control/state-preset/StatePreset.tsx` | `hover:bg-base-300 dark:bg-base-600` | Form control context |

Each component uses `twMerge(iconButtonBase, ...)` to apply component-specific overrides (shape, padding, size) on top of the shared base.

## Notes

- Visual change only; verify with typecheck + lint
- Demo page visual check recommended after implementation
