# `SdProgress`

> **읽어야 하는 상황**: 진행률 바를 표시할 때.

진행률 바 컴포넌트. `value`(0~1 범위)에 따라 바 너비를 계산하고 퍼센트를 표시한다.

```typescript
@Component({ selector: "sd-progress", ... })
export class SdProgress
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | input (required) | `number` | 진행률 (0~1 범위) |
| `theme` | input (required) | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | 색상 테마 |
| `inset` | input | `boolean` | 인셋 스타일 (기본값: `false`) |
| `size` | input | `"sm" \| "lg" \| undefined` | 크기 |

## Usage

```html
<sd-progress [value]="progress() / 100" [theme]="'primary'" />
```
