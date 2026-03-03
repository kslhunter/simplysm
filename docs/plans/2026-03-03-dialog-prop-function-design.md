# SharedDataSelect / DataSelectButton dialog prop -> function-based API

## Summary

SharedDataSelect, DataSelectButton, SharedDataSelectButton 3 components' `dialog` prop to function-based API.

**Before (declarative object):**
```tsx
<SharedDataSelect
  dialog={{
    component: RoleSheet,
    props: { customProp: v },
    option: { header: "Permission" },
  }}
/>
```

**After (function-based):**
```tsx
function MyView() {
  const dialog = useDialog();
  return (
    <SharedDataSelect
      dialog={(params) =>
        dialog.show<DataSelectDialogResult<string | number>>(
          () => <RoleSheet selectMode={params.selectMode} selectedKeys={params.selectedKeys} customProp={v} />,
          { header: "Permission" },
        )
      }
    />
  );
}
```

## Motivation

1. **JSX visibility**: `() => <Component />` is more readable than `{ component: X, props: Y }`
2. **useDialog pattern unification**: consistent with app-wide `useDialog().show()` usage
3. **Type inference improvement**: removes complex `DialogConfig<TUserProps>` generic

## Type Changes

### New types

```typescript
/** Parameters passed to dialog function */
export interface SelectDialogParams {
  selectMode: "single" | "multiple";
  selectedKeys: (string | number)[];
}

/** Dialog result (unchanged) */
export interface DataSelectDialogResult<TKey> {
  selectedKeys: TKey[];
}
```

### Removed types

- `DialogConfig<TUserProps>` - replaced by function type
- `InjectedSelectProps` - `onSelect` removed, replaced by `SelectDialogParams`

### dialog prop type

```typescript
// SharedDataSelect (optional)
dialog?: (params: SelectDialogParams) => Promise<DataSelectDialogResult<string | number> | undefined>;

// DataSelectButton (required)
dialog: (params: SelectDialogParams) => Promise<DataSelectDialogResult<TKey> | undefined>;
```

## Component Internal Changes

### handleOpenDialog (SharedDataSelect, DataSelectButton)

```tsx
// Before
const dialog = useDialog();
const handleOpenDialog = async () => {
  const result = await dialog.show<DataSelectDialogResult>(
    () => {
      const instance = useDialogInstance();
      return (
        <dialogConfig.component
          {...dialogConfig.props}
          selectMode={...}
          selectedKeys={...}
          onSelect={(r) => instance?.close({ selectedKeys: r.keys })}
        />
      );
    },
    dialogConfig.option ?? {},
  );
  // handle result...
};

// After
const handleOpenDialog = async () => {
  if (!local.dialog) return;
  const result = await local.dialog({
    selectMode: rest.multiple ? "multiple" : "single",
    selectedKeys: normalizeKeys(rest.value),
  });
  if (result) {
    // handle result (same as before)
  }
};
```

- `useDialog()` and `useDialogInstance` imports removed from SharedDataSelect
- `useDialog()` and `useDialogInstance` imports removed from DataSelectButton

### Dialog components (consumer-side, e.g. RoleSheet)

```tsx
function RoleSheet(props: { selectMode: "single" | "multiple"; selectedKeys: (string | number)[] }) {
  const instance = useDialogInstance<DataSelectDialogResult<string | number>>();

  const handleSelect = (keys: (string | number)[]) => {
    instance?.close({ selectedKeys: keys });
  };
  // ...
}
```

## Affected Files

| File | Change |
|------|--------|
| `DataSelectButton.tsx` | Remove `DialogConfig`, `InjectedSelectProps`. Add `SelectDialogParams`. Change dialog prop type. Simplify `handleOpenDialog`. |
| `SharedDataSelect.tsx` | Change dialog prop type. Simplify `handleOpenDialog`. Remove `useDialog`/`useDialogInstance` imports. |
| `SharedDataSelectButton.tsx` | Update `DialogConfig` import to new function type. |
| `SharedDataSelect.spec.tsx` | Update dialog prop in tests to function-based. |
| (DataSelectButton tests if exist) | Same. |

## Not Changed

- `SharedDataSelectList` - independent component using `value`/`onValueChange` pattern
- `DataSelectDialogResult` type - preserved as-is
- Dialog system (`DialogProvider`, `useDialog`, `useDialogInstance`) - no changes

## Breaking Changes

- `DialogConfig` type removed
- `InjectedSelectProps` type removed
- `dialog` prop type changed from object to function on all 3 components
