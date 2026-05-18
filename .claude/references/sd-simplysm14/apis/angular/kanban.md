# @simplysm/angular — kanban

드래그·드롭 칸반 보드.

```html
<sd-kanban-board [(selectedValues)]="selected" (drop)="onDrop($event)">
  <sd-kanban-lane [value]="laneA" [busy]="loading">
    <sd-kanban [value]="card" [draggable]="true" [selectable]="true">{{ card.title }}</sd-kanban>
  </sd-kanban-lane>
</sd-kanban-board>
```

## `<sd-kanban-board<L, T>>`

- `selectedValues = model<T[]>([])`.
- `drop = output<SdKanbanBoardDropInfo<L, T>>` (`{ sourceKanbanValue?, targetLaneValue?, targetKanbanValue? }`).
- `dragKanban = signal<SdKanbanDragRef | undefined>` — 자식이 드래그 시작 시 설정.

## `<sd-kanban-lane<L, T>>`

`value: L`, `busy`, `useCollapse`, `collapse` (model). drop target 구현.

## `<sd-kanban<L, T>>`

`value: T`, `draggable`, `selectable`, `contentClass`. drag ref + drop target 둘 다 구현(카드 위에 드롭 가능).

## 타입

```typescript
interface SdKanbanBoardDropInfo<L, T> { sourceKanbanValue?: T; targetLaneValue?: L; targetKanbanValue?: T }
interface SdKanbanDragRef<_L, T>      { value(): T | undefined; heightOnDrag(): number }
interface SdKanbanDropTarget<L, T>    { targetLaneValue(): L | undefined; targetKanbanValue?(): T | undefined }
```
