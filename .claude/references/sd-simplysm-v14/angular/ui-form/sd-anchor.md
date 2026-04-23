# `SdAnchor`

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

### 실사용 예

- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — 시트 셀 내 인라인 앵커 버튼
- [crud-list.md §7 확장 C: inline 삭제 열](../recipes/crud-list.md#7-확장-c-inline-삭제-열) — row별 삭제/복구 토글 아이콘
- [crud-list.md §10 확장 F: 모달 편집 모드](../recipes/crud-list.md#10-확장-f-모달-편집-모드) — 행 클릭 편집 모달 열기 링크
- [crud-detail.md §7 확장 C: modal 뷰](../recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 우측 상단 액션 앵커
- [crud-detail.md §10 확장 F: 복합 상세](../recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 행 삭제 아이콘 앵커
