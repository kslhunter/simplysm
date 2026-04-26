# `SdAnchor`

> **읽어야 하는 상황**: 텍스트 내 인라인 클릭 요소(앵커 링크 스타일)가 필요할 때. 블록 버튼은 [`SdButton`](./sd-button.md) 참조.

인라인 버튼 컴포넌트. 텍스트나 아이콘을 클릭 가능한 링크 스타일로 표시한다.

```typescript
@Component({ selector: "sd-anchor", ... })
export class SdAnchor
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `disabled` | input | `boolean` | 비활성화 여부 (기본값: `false`) |
| `theme` | input | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | 색상 테마 (기본값: `"primary"`) |

## Usage

```html
<sd-anchor (click)="onItemClick()">편집</sd-anchor>
<sd-anchor [theme]="'danger'" (click)="onDeleteClick()">삭제</sd-anchor>
<sd-anchor [disabled]="!canEdit()">설정</sd-anchor>
```

