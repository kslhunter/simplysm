# `SdCheckbox`

> **읽어야 하는 상황**: 체크박스로 boolean 값을 토글할 때. 스위치 형태는 [`SdSwitch`](.$sd-switch.md), 다중 선택 그룹은 [`SdCheckboxGroup`](.$sd-checkbox-group.md) 참조.

체크박스 컴포넌트.

```typescript
@Component({ selector: "sd-checkbox" })
class SdCheckbox {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);
  icon = input(tablerCheck);
  radio = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
  contentStyle = input<string>();
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `value` | model | `boolean` | `false` | 체크 여부 (two-way) |
| `canChangeFn` | input | `(item: boolean) => boolean \| Promise<boolean>` | `() => true` | 값 변경 가능 여부 함수 |
| `icon` | input | `string` | `tablerCheck` | 체크 아이콘 |
| `radio` | input | `boolean` | `false` | 라디오 버튼 스타일 |
| `disabled` | input | `boolean` | `false` | 비활성화 |
| `size` | input | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `inline` | input | `boolean` | `false` | 인라인 표시 |
| `inset` | input | `boolean` | `false` | 삽입 스타일 |
| `theme` | input | `string \| undefined` | `undefined` | 테마 색상 |
| `contentStyle` | input | `string \| undefined` | `undefined` | 라벨 텍스트 인라인 스타일 |

## Related Types

### `SdSwitch`

스위치 토글 컴포넌트.

```typescript
@Component({ selector: "sd-switch" })
class SdSwitch {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input<string>();
}
```

### `SdCheckboxGroup`

체크박스 그룹 컴포넌트.

```typescript
@Component({ selector: "sd-checkbox-group" })
class SdCheckboxGroup<T> {
  value = model<T[]>([]);
  disabled = input(false, { transform: booleanAttribute });
}
```

### `SdCheckboxGroupItem`

체크박스 그룹 항목.

```typescript
@Component({ selector: "sd-checkbox-group-item" })
class SdCheckboxGroupItem<T> {
  value = input.required<T>();
  inline = input(false, { transform: booleanAttribute });
}
```
