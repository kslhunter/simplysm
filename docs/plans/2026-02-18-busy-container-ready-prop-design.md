# BusyContainer `ready` Prop Design

## Goal

Add a `ready` prop to `BusyContainer` that controls whether children are rendered.
When `ready` is false, children are removed from the DOM and the loading overlay is shown.

## Changes

### Props

```typescript
export interface BusyContainerProps {
  busy?: boolean;
  ready?: boolean;  // NEW
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}
```

### Behavior Matrix

| ready       | busy    | Children | Loading Overlay |
|-------------|---------|----------|-----------------|
| `undefined` | `false` | Rendered | Hidden          |
| `undefined` | `true`  | Rendered | Shown           |
| `true`      | `false` | Rendered | Hidden          |
| `true`      | `true`  | Rendered | Shown           |
| `false`     | `false` | Removed  | Shown           |
| `false`     | `true`  | Removed  | Shown           |

### Logic Changes

1. **Loading overlay trigger**: `!!local.busy` -> `local.ready === false || !!local.busy`
2. **Children rendering**: `{local.children}` -> `<Show when={local.ready !== false}>{local.children}</Show>`
3. **Keyboard blocking**: `local.busy` -> `local.ready === false || local.busy`

## Files to Modify

- `packages/solid/src/components/feedback/busy/BusyContainer.tsx`
