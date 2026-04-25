# `SdKanban`

> **읽어야 하는 상황**: 칸반 레인 내부에 드래그 가능한 아이템을 배치할 때.

칸반 아이템 컴포넌트. `SdKanbanLane` 내부에 배치되며, 드래그앤드롭으로 레인 간 이동이 가능하다.

```typescript
@Component({ selector: "sd-kanban", ... })
export class SdKanban<L, T> implements SdKanbanDragRef<L, T>, SdKanbanDropTarget<L, T>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | input | `T \| undefined` | 이 카드의 데이터 값 |
| `selectable` | input | `boolean` | 선택 가능 여부 (기본값: `false`) |
| `draggable` | input | `boolean` | 드래그 가능 여부 (기본값: `false`) |
| `contentClass` | input | `string \| undefined` | 카드 콘텐츠 CSS 클래스 |

## Usage

```html
<sd-kanban-lane [value]="lane">
  @for (item of lane.items; track item.id) {
    <sd-kanban [value]="item" [draggable]="true">
      {{ item.title }}
    <$sd-kanban>
  }
<$sd-kanban-lane>
```
