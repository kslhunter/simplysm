# `SdKanbanLane`

> **읽어야 하는 상황**: 칸반 보드 내부에 아이템을 수직 나열하는 레인을 배치할 때.

칸반 레인 컴포넌트. `SdKanbanBoard` 내부에 배치되며, `SdKanban` 아이템을 수직으로 나열한다.

```typescript
@Component({ selector: "sd-kanban-lane", ... })
export class SdKanbanLane<L, T> implements SdKanbanDropTarget<L, T>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | input | `L \| undefined` | 이 레인의 값 |
| `busy` | input | `boolean` | 로딩 표시 (기본값: `false`) |
| `useCollapse` | input | `boolean` | 접기 기능 사용 (기본값: `false`) |
| `collapse` | model | `boolean` | 접힘 상태 (기본값: `false`) |

## Usage

```html
<sd-kanban-board [(selectedValues)]="selectedItems">
  @for (lane of lanes; track lane.id) {
    <sd-kanban-lane [value]="lane">
      <ng-template #titleTpl>{{ lane.name }}</ng-template>
      @for (item of lane.items; track item.id) {
        <sd-kanban [value]="item" [draggable]="true">
          {{ item.title }}
        <$sd-kanban>
      }
    <$sd-kanban-lane>
  }
<$sd-kanban-board>
```
