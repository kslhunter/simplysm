# `SdGap`

레이아웃 간격 컴포넌트. 세로/가로 공백을 삽입한다.

```typescript
@Component({ selector: "sd-gap", ... })
export class SdGap
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `height` | input | `"xxs" \| "xs" \| "sm" \| "default" \| "lg" \| "xl" \| "xxl" \| undefined` | 세로 간격 (CSS 변수 `--gap-*` 기반) |
| `heightPx` | input | `number \| undefined` | 세로 간격 (픽셀) |
| `width` | input | `"xxs" \| "xs" \| "sm" \| "default" \| "lg" \| "xl" \| "xxl" \| undefined` | 가로 간격 (CSS 변수 `--gap-*` 기반) |
| `widthPx` | input | `number \| undefined` | 가로 간격 (픽셀) |
| `widthEm` | input | `number \| undefined` | 가로 간격 (em) |

## Usage

```html
<sd-gap [height]="'lg'" />
<sd-gap [width]="'default'" />
<sd-gap [heightPx]="32" />
```
