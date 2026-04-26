# `SdPermissionTable`

> **읽어야 하는 상황**: 권한 매트릭스 테이블을 표시할 때.

권한 매트릭스 테이블. `SdPermission` 트리를 테이블로 렌더링하여 use/edit 체크박스를 표시한다.

```typescript
@Component({ selector: "sd-permission-table" })
class SdPermissionTable<TModule = unknown> {
  value = model<Record<string, boolean>>({});
  items = input<SdPermission<TModule>[]>([]);
  disabled = input(false, { transform: booleanAttribute });
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `value` | model | `Record<string, boolean>` | `{}` | 권한 레코드 (two-way). 키는 `codeChain.join(".") + ".use"` 또는 `".edit"` 형태 |
| `items` | input | `SdPermission<TModule>[]` | `[]` | 권한 트리 |
| `disabled` | input | `boolean` | `false` | 비활성화 |
