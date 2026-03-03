# dialog.show() Component-based API

## Summary

Change `dialog.show()` from factory-based to component-based API, enabling automatic return type inference from the component's `close` prop type.

**Before (factory + useDialogInstance):**
```typescript
const result = await dialog.show<string>(
  () => <MyDialog />,
  { header: "Title" },
);
// Inside MyDialog: useDialogInstance<string>().close("ok")
// T must be manually specified — no compile-time connection
```

**After (component + props + close injection):**
```typescript
const result = await dialog.show(
  MyDialog,
  {},
  { header: "Title" },
);
// result: string | undefined ← auto-inferred from MyDialog's close prop
// Inside MyDialog: props.close?.("ok")
```

## Motivation

1. **Type safety**: T is automatically inferred from the component's `close` prop — no manual `show<T>` annotation, no risk of mismatch with `useDialogInstance<T>`
2. **Explicit data flow**: `close` comes via props, not hidden context
3. **Simpler mental model**: no separate `useDialogInstance` hook to learn

## Type Changes

### New types (DialogContext.ts)

```typescript
/** Extract result type T from component's close prop */
type ExtractCloseResult<P> =
  P extends { close?: (result?: infer T) => void } ? T : undefined;

interface DialogContextValue {
  show<P>(
    component: Component<P>,
    props: "close" extends keyof P ? Omit<P, "close"> : never,
    options?: DialogShowOptions,
  ): Promise<ExtractCloseResult<P> | undefined>;
}
```

### Type behavior

| Component props | props param | Return type | Error? |
|---|---|---|---|
| `{ close?: (result?: number) => void; title: string }` | `{ title: string }` | `Promise<number \| undefined>` | No |
| `{ close?: (result?: string) => void }` | `{}` | `Promise<string \| undefined>` | No |
| `{ title: string }` (no close) | — | — | Yes (`never`) |

### Removed types

- `DialogInstance<TResult>` interface
- `DialogInstanceContext` context
- `useDialogInstance()` hook

## Provider Changes (DialogProvider.tsx)

### DialogEntry

```typescript
// Before
interface DialogEntry {
  id: string;
  factory: () => JSX.Element;
  options: DialogShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}

// After
interface DialogEntry {
  id: string;
  component: Component<any>;
  props: Record<string, any>;
  options: DialogShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}
```

### Rendering

```tsx
// Before
<DialogInstanceContext.Provider value={instance}>
  {entry.factory()}
</DialogInstanceContext.Provider>

// After — close injected as prop
<Dynamic
  component={entry.component}
  {...entry.props}
  close={(result?: unknown) => requestClose(entry.id, result)}
/>
```

## Migration

### Simple: close only

| File | Before | After |
|------|--------|-------|
| `AddressSearch.tsx` | `useDialogInstance<AddressSearchResult>()` → `instance?.close(result)` | `props.close?: (result?: AddressSearchResult) => void` → `props.close?.(result)` |
| `DataSheetConfigDialog.tsx` | `useDialogInstance<DataSheetConfig>()` → `dialog?.close(config)` | `props.close?: (result?: DataSheetConfig) => void` → `props.close?.(config)` |
| `DialogPage.tsx` (demo) | `useDialogInstance<string>()` → `dialog?.close("OK")` | `props.close?: (result?: string) => void` → `props.close?.("OK")` |

### Dual-use: detection + close

| File | Before | After |
|------|--------|-------|
| `CrudDetail.tsx` | `useDialogInstance<boolean>()` → `isInDialog = instance !== undefined` / `instance.close(true)` | `props.close?: (result?: boolean) => void` → `isInDialog = props.close !== undefined` / `props.close?.(true)` |
| `CrudSheet.tsx` | `useDialogInstance()` → `isInDialog = instance !== undefined` (no close call) | `props.close?: () => void` → `isInDialog = props.close !== undefined` |

### Inline component: SharedDataSelect / DataSelectButton

```typescript
// Before
dialog.show<DataSelectDialogResult<string | number>>(
  () => {
    const instance = useDialogInstance<DataSelectDialogResult<string | number>>();
    return (
      <dialogConfig.component
        {...(dialogConfig.props ?? {})}
        selectMode={rest.multiple ? "multiple" : "single"}
        selectedKeys={normalizeKeys(rest.value)}
        onSelect={(r) => instance?.close({ selectedKeys: r.keys })}
      />
    );
  },
  dialogConfig.option ?? {},
);

// After
dialog.show(
  (props: { close?: (result?: DataSelectDialogResult<string | number>) => void }) => (
    <dialogConfig.component
      {...(dialogConfig.props ?? {})}
      selectMode={rest.multiple ? "multiple" : "single"}
      selectedKeys={normalizeKeys(rest.value)}
      onSelect={(r) => props.close?.({ selectedKeys: r.keys })}
    />
  ),
  {},
  dialogConfig.option ?? {},
);
```

Both inline arrow functions and named components are supported.

### Tests: DialogProvider.spec.tsx

Update all test components from `useDialogInstance()` to `props.close`.

### Deletion

- Delete `DialogInstanceContext.ts`
- Remove `DialogInstanceContext` export from `index.ts`

## Out of Scope

- CLI templates (`sd-cli/templates/`) — separate migration
- SharedDataSelect/DataSelectButton `DialogConfig` refactoring (separate: split into `dialogComponent`/`dialogProps`/`dialogOptions` props)
- UI/animation behavior changes — none

## Design Notes

### Why `"close" extends keyof P` conditional type?

Optional properties (`close?`) are still included in `keyof`. This allows:
- `{ close?: F; title: string }` → `"close" extends keyof` = true → accepted
- `{ title: string }` → `"close" extends keyof` = false → `never` → type error

### Future: SharedDataSelect DialogConfig intellisense

Current `DialogConfig<TUserProps>` loses generic in `dialog?: DialogConfig`. Two solutions identified:
1. **Helper function** `dialogConfig({...})` — rejected (unwanted API)
2. **Split props**: `dialogComponent` + `dialogProps` + `dialogOptions` with additional generic parameter — preferred, separate work
