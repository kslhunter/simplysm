# `SdNote`

알림 메시지 블록 컴포넌트. 배경 색상으로 중요도를 표현한다.

```typescript
@Component({ selector: "sd-note", ... })
export class SdNote
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `theme` | input | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray" \| undefined` | 색상 테마 |
| `size` | input | `"sm" \| "lg" \| undefined` | 크기 |
| `inset` | input | `boolean` | 인셋 스타일 (기본값: `false`) |

## Usage

```html
<sd-note [theme]="'warning'">저장하지 않은 변경사항이 있습니다.</sd-note>
<sd-note [theme]="'info'">Ctrl+S로 저장할 수 있습니다.</sd-note>
```
