# `SdCheckboxGroup`

> **읽어야 하는 상황**: 체크박스 그룹으로 다중 선택을 관리할 때. 단일 체크박스는 [`SdCheckbox`](.$sd-checkbox.md) 참조.

체크박스 그룹 컴포넌트. `SdCheckboxGroupItem`과 함께 사용하여 다중 선택을 관리한다.

```typescript
@Component({ selector: "sd-checkbox-group", ... })
export class SdCheckboxGroup<T>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | model | `T[]` | 선택된 값 배열 (기본값: `[]`) |
| `disabled` | input | `boolean` | 비활성화 (기본값: `false`) |

## Related Types

### `SdCheckboxGroupItem`

```typescript
@Component({ selector: "sd-checkbox-group-item", ... })
export class SdCheckboxGroupItem<T>
```

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | input (required) | `T` | 이 항목의 값 |
| `inline` | input | `boolean` | 인라인 표시 (기본값: `false`) |

## Usage

```html
<sd-checkbox-group [(value)]="selectedRoles">
  <sd-checkbox-group-item [value]="'admin'">관리자<$sd-checkbox-group-item>
  <sd-checkbox-group-item [value]="'user'">사용자<$sd-checkbox-group-item>
  <sd-checkbox-group-item [value]="'viewer'">조회<$sd-checkbox-group-item>
<$sd-checkbox-group>
```
