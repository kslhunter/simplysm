# `SdLabel`

인라인 라벨 컴포넌트. 테마 색상 또는 커스텀 배경색을 적용한다.

```typescript
@Component({ selector: "sd-label", ... })
export class SdLabel
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `theme` | input | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray" \| undefined` | 색상 테마 (미지정 시 `gray-darker`) |
| `color` | input | `string \| undefined` | 커스텀 배경색 (CSS 색상값) |
| `clickable` | input | `boolean` | 클릭 가능 여부 (기본값: `false`) |

## Usage

```html
<sd-label [theme]="'success'">완료</sd-label>
<sd-label [theme]="'danger'">오류</sd-label>
<sd-label [color]="'#ff6600'">커스텀</sd-label>
```
