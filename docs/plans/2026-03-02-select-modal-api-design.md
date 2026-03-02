# Select Modal API Redesign

## Problem

- `SharedDataSelect`의 `modal` prop이 `dialog.show()`와 상호작용 없음 (return값 미사용, 현재 선택값 미전달)
- `DataSelectButton`의 `modal`이 `() => JSX.Element` factory로, 현재 선택값을 전달받지 못함
- 사용자가 modal 내부에서 `useDialogInstance` + `close()` boilerplate를 매번 작성해야 함

## Design

### 1. InjectedSelectProps

Selection modal 컴포넌트에 자동 주입되는 props 계약:

```tsx
interface InjectedSelectProps {
  selectMode: "single" | "multiple";
  selectedKeys: (string | number)[];
  onSelect: (result: { keys: (string | number)[] }) => void;
}
```

- `selectMode`: 부모 컴포넌트의 `multiple` prop에서 결정
- `selectedKeys`: 현재 선택된 값을 key 배열로 정규화
- `onSelect`: 호출 시 자동으로 `dialogInstance.close({ selectedKeys })` 처리

### 2. ModalConfig Type

```tsx
type ModalConfig<TUserProps = Record<string, any>> = {
  component: Component<TUserProps & InjectedSelectProps>;
  props?: TUserProps;
  option?: DialogShowOptions;
};
```

사용 예:

```tsx
modal={{
  component: RoleSheet,
  props: { roleGroupId: 3 },
  option: { header: '역할선택' }
}}
```

### 3. DataSelectButton Changes

Before:

```tsx
interface DataSelectButtonProps<TItem, TKey> {
  modal: () => JSX.Element;
  dialogOptions?: DialogShowOptions;
}
```

After:

```tsx
interface DataSelectButtonProps<TItem, TKey> {
  modal: ModalConfig;
  // dialogOptions removed (merged into modal.option)
}
```

Internal logic:

```tsx
const handleOpenModal = async () => {
  const result = await dialog.show<DataSelectModalResult<TKey>>(
    () => {
      const instance = useDialogInstance<DataSelectModalResult<TKey>>();
      return (
        <local.modal.component
          {...local.modal.props}
          selectMode={local.multiple ? "multiple" : "single"}
          selectedKeys={normalizeKeys(getValue())}
          onSelect={(r) => instance?.close({ selectedKeys: r.keys as TKey[] })}
        />
      );
    },
    local.modal.option ?? {},
  );
  if (result) { /* update value */ }
};
```

### 4. SharedDataSelect Changes

Before:

```tsx
interface SharedDataSelectProps<TItem> {
  modal?: () => JSX.Element;
  editModal?: () => JSX.Element;
  children: (item: TItem, index: number, depth: number) => JSX.Element;
}
```

After:

```tsx
interface SharedDataSelectProps<TItem> {
  modal?: ModalConfig;
  // editModal removed
  children: JSX.Element;  // compound children
}
```

Compound components:

- `SharedDataSelect.ItemTemplate` — item render function (replaces children)
- `SharedDataSelect.Action` — custom action buttons (replaces editModal)

Usage:

```tsx
<SharedDataSelect
  data={sharedData.roles}
  value={selectedId()}
  onValueChange={setSelectedId}
  modal={{
    component: RoleCrudSheet,
    props: { groupId: 3 },
    option: { header: '역할 선택' }
  }}
>
  <SharedDataSelect.ItemTemplate>
    {(role) => <>{role.name}</>}
  </SharedDataSelect.ItemTemplate>
  <SharedDataSelect.Action onClick={() => void openEditDialog()}>
    <Icon icon={IconEdit} />
  </SharedDataSelect.Action>
</SharedDataSelect>
```

### 5. SharedDataSelectButton

Wraps DataSelectButton — inherits modal API change automatically.

## Breaking Changes

- `DataSelectButton`: `modal` prop type changed from `() => JSX.Element` to `ModalConfig`
- `DataSelectButton`: `dialogOptions` removed (use `modal.option`)
- `SharedDataSelect`: `children` changed from render function to compound children
- `SharedDataSelect`: `editModal` removed (use `SharedDataSelect.Action`)
- `SharedDataSelectButton`: `modal` prop type changed (inherits from DataSelectButton)

## Type Safety

- `ModalConfig.component` must accept `InjectedSelectProps`
- API changes detectable via typecheck alone
- IDE intellisense works for `props` field
- Implementation phase: verify TypeScript inference without helper function; add helper if needed
