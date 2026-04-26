# `SdSwitch`

> **읽어야 하는 상황**: 스위치 형태로 on/off를 토글할 때. 체크박스 형태는 [`SdCheckbox`](./sd-checkbox.md) 참조.

토글 스위치 컴포넌트. `value` model로 on/off 상태를 관리한다.

```typescript
@Component({ selector: "sd-switch", ... })
export class SdSwitch
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | model | `boolean` | on/off 상태 (기본값: `false`) |
| `canChangeFn` | input | `(item: boolean) => boolean \| Promise<boolean>` | 변경 가드 함수 (기본값: 항상 `true`) |
| `disabled` | input | `boolean` | 비활성화 (기본값: `false`) |
| `inline` | input | `boolean` | 인라인 표시 (기본값: `false`) |
| `inset` | input | `boolean` | 인셋 스타일 (기본값: `false`) |
| `size` | input | `"sm" \| "lg" \| undefined` | 크기 |
| `theme` | input | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray" \| undefined` | 색상 테마 |

## Usage

```html
<sd-switch [(value)]="isActive" [theme]="'primary'" />
<sd-switch [(value)]="isEnabled" [canChangeFn]="canChangeActiveAsync" />
```
