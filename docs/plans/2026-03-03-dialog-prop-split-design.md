# SharedDataSelect / DataSelectButton dialog prop → split props API

## Summary

Replace the `dialog: DialogConfig` object prop with split props (`dialog`, `dialogProps`, `dialogOptions`) on SharedDataSelect, DataSelectButton, and SharedDataSelectButton. Remove `InjectedSelectProps` and `onSelect` bridge — dialog components use `props.close?.()` directly.

**Before (DialogConfig object):**
```tsx
<SharedDataSelect
  dialog={{
    component: RoleSheet,
    props: { customProp: v },
    option: { header: "Permission" },
  }}
/>
```

**After (split props):**
```tsx
<SharedDataSelect
  dialog={RoleSheet}
  dialogProps={{ customProp: v }}
  dialogOptions={{ header: "Permission" }}
/>
```

## Motivation

1. **Intellisense**: `DialogConfig<TUserProps>` loses generic when stored as prop → no autocomplete for `props`. Split props allow TypeScript to infer the dialog component's generic independently, enabling full intellisense on `dialogProps`.
2. **Code cleanup**: Remove `onSelect` bridge pattern. With the new `dialog.show(Component, props, options)` API, dialog components use `props.close?.()` directly — no inline component hack needed.
3. **Type safety**: Conditional `dialogProps` optionality — required when dialog component has required user props, optional otherwise.

## Type Changes

### New types (DataSelectButton.tsx)

```typescript
/** Base props for select dialog components (injected by DataSelectButton/SharedDataSelect + DialogProvider) */
export interface SelectDialogBaseProps<TKey = string | number> {
  close?: (result?: DataSelectDialogResult<TKey>) => void;
  selectMode: "single" | "multiple";
  selectedKeys: TKey[];
}

/** Extract user-specific props from dialog component (exclude injected base props) */
type UserDialogProps<P, TKey = string | number> = Omit<P, keyof SelectDialogBaseProps<TKey>>;

/** dialogProps: required when user props have required keys, optional otherwise */
type DialogPropsField<P, TKey = string | number> =
  {} extends UserDialogProps<P, TKey>
    ? { dialogProps?: UserDialogProps<P, TKey> }
    : { dialogProps: UserDialogProps<P, TKey> };
```

### Type behavior

| Dialog component props | dialogProps param | dialogProps required? |
|---|---|---|
| `{ close?; selectMode; selectedKeys; customProp: string }` | `{ customProp: string }` | Yes (customProp is required) |
| `{ close?; selectMode; selectedKeys; hint?: string }` | `{ hint?: string }` | No (all user props optional) |
| `{ close?; selectMode; selectedKeys }` (no user props) | `{}` | No (empty user props) |

### Removed types

- `DialogConfig<TUserProps>` — replaced by split props
- `InjectedSelectProps` — `onSelect` removed; replaced by `SelectDialogBaseProps`

### Kept types

- `DataSelectDialogResult<TKey>` — unchanged

## Props Interface Changes

### DataSelectButton (dialog required)

```typescript
export type DataSelectButtonProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> = {
  value?: TKey | TKey[];
  onValueChange?: (value: TKey | TKey[] | undefined) => void;
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  renderItem: (item: TItem) => JSX.Element;
  dialog: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  validate?: (value: unknown) => string | undefined;
  touchMode?: boolean;
} & DialogPropsField<TDialogProps, TKey>;
```

### SharedDataSelect (dialog optional)

```typescript
export type SharedDataSelectProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> = {
  data: SharedDataAccessor<TItem>;
  value?: unknown;
  onValueChange?: (value: unknown) => void;
  dialog?: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  filterFn?: (item: TItem, index: number) => boolean;
  children: JSX.Element;
} & DialogPropsField<TDialogProps>;
```

### SharedDataSelectButton (dialog required, wraps DataSelectButton)

```typescript
export type SharedDataSelectButtonProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> = {
  data: SharedDataAccessor<TItem>;
  value?: DataSelectButtonProps<TItem>["value"];
  onValueChange?: DataSelectButtonProps<TItem>["onValueChange"];
  dialog: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  children: (item: TItem) => JSX.Element;
} & DialogPropsField<TDialogProps>;
```

## Internal Implementation Changes

### handleOpenDialog (DataSelectButton)

```typescript
// Before — inline component hack
const result = await dialog.show(
  (dlgProps: { close?: (result?: DataSelectDialogResult<TKey>) => void }) => (
    <local.dialog.component
      {...(local.dialog.props ?? {})}
      selectMode={local.multiple ? "multiple" : "single"}
      selectedKeys={normalizeKeys(getValue()) as (string | number)[]}
      onSelect={(r: { keys: (string | number)[] }) =>
        dlgProps.close?.({ selectedKeys: r.keys as TKey[] })
      }
    />
  ),
  {},
  local.dialog.option ?? {},
);

// After — direct dialog.show() call
const result = await dialog.show(
  local.dialog,
  {
    ...(local.dialogProps ?? {}),
    selectMode: local.multiple ? "multiple" : "single",
    selectedKeys: normalizeKeys(getValue()) as (string | number)[],
  },
  local.dialogOptions,
);
```

### handleOpenDialog (SharedDataSelect)

```typescript
// After
const result = await dialog.show(
  local.dialog,
  {
    ...(local.dialogProps ?? {}),
    selectMode: rest.multiple ? "multiple" : "single",
    selectedKeys: normalizeKeys(rest.value),
  },
  local.dialogOptions,
);
```

### SharedDataSelectButton (pass-through)

```typescript
<DataSelectButton
  load={...}
  renderItem={local.children}
  dialog={rest.dialog}
  dialogProps={rest.dialogProps}
  dialogOptions={rest.dialogOptions}
  {...otherRest}
/>
```

## Migration

### Dialog components (consumer-side)

```typescript
// Before
function RoleSheet(props: { customProp: string } & InjectedSelectProps) {
  const handleSelect = (keys: (string | number)[]) => {
    props.onSelect({ keys });
  };
}

// After
function RoleSheet(props: SelectDialogBaseProps & { customProp: string }) {
  const handleSelect = (keys: (string | number)[]) => {
    props.close?.({ selectedKeys: keys });
  };
}
```

### Tests

```typescript
// Before
function TestDialogComponent(props: { confirmKeys: number[] } & InjectedSelectProps) {
  return <button onClick={() => props.onSelect({ keys: props.confirmKeys })}>confirm</button>;
}
// dialog={{ component: TestDialogComponent, props: { confirmKeys: [2] } }}

// After
function TestDialogComponent(props: SelectDialogBaseProps<number> & { confirmKeys: number[] }) {
  return <button onClick={() => props.close?.({ selectedKeys: props.confirmKeys })}>confirm</button>;
}
// dialog={TestDialogComponent} dialogProps={{ confirmKeys: [2] }}
```

## Affected Files

| File | Change |
|------|--------|
| `DataSelectButton.tsx` | Remove `DialogConfig`, `InjectedSelectProps`. Add `SelectDialogBaseProps`, `UserDialogProps`, `DialogPropsField`. Change props type. Simplify `handleOpenDialog`. |
| `SharedDataSelect.tsx` | Change dialog prop type. Simplify `handleOpenDialog`. Remove `useDialog` import (if no longer needed internally). |
| `SharedDataSelectButton.tsx` | Change `DialogConfig` to split props. Pass through to DataSelectButton. |
| `SharedDataSelect.spec.tsx` | Update TestDialogComponent and dialog prop usage. |
| `DataSelectButton.spec.tsx` | Update TestDialogComponent and dialog prop usage. |

## Not Changed

- `DataSelectDialogResult` type — preserved as-is
- Dialog system (`DialogProvider`, `useDialog`, `DialogContext`) — no changes
- `SharedDataSelectList` — independent component
- CLI templates — separate migration

## Design Notes

### Why conditional dialogProps?

`{} extends UserDialogProps<P>` checks if the user-specific props type can be assigned from `{}`. If all user props are optional or there are none, `{}` satisfies the type → dialogProps is optional. If any user prop is required, `{}` doesn't satisfy → dialogProps is required.

### TypeScript multi-generic inference

`TItem` is inferred from `data: SharedDataAccessor<TItem>`, and `TDialogProps` is inferred from `dialog: Component<TDialogProps>`. These are independent constraints — TypeScript can infer both simultaneously from different props.

### SharedDataSelect dialog optionality

When `dialog` prop is not provided, `TDialogProps` defaults to `SelectDialogBaseProps`. `UserDialogProps<SelectDialogBaseProps>` = `{}`, so `{} extends {}` = true → `dialogProps` is automatically optional. No special handling needed.
