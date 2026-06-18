# @simplysm/angular — 칸반(kanban)

드래그앤드롭으로 카드를 레인 간 이동하고 카드를 다중 선택하는 칸반 보드 군. `sd-kanban-board`(보드) > `sd-kanban-lane`(레인) > `sd-kanban`(카드) 3계층. `L`=레인 값 타입, `T`=카드 값 타입.

## `SdKanbanBoard<L, T>` — `<sd-kanban-board>`

- `selectedValues: model<T[]>([])` — 선택된 카드 값.
- `drop: output<SdKanbanBoardDropInfo<L, T>>` — 드래그를 레인/카드에 드롭 시 emit.
- `dragKanban: signal<SdKanbanDragRef<L, T> | undefined>` — 현재 드래그 중인 카드.

타입:
- `SdKanbanBoardDropInfo<L, T>` — `{ sourceKanbanValue?: T; targetLaneValue?: L; targetKanbanValue?: T }`. drop 페이로드(이동 처리 시 데이터 갱신에 사용).
- `SdKanbanDragRef<_L, T>` — `{ value(): T | undefined; heightOnDrag(): number }`.
- `SdKanbanDropTarget<L, T>` — `{ targetLaneValue(): L | undefined; targetKanbanValue?(): T | undefined }`.

## `SdKanbanLane<L, T>` — `<sd-kanban-lane>`

`SdKanbanDropTarget` 구현.

- `value: L` — 레인 값.
- `busy: boolean` — true 면 `sd-busy-container` 바 오버레이.
- `useCollapse: boolean` — true 면 접기 토글(eye/eye-off) 표시.
- `collapse: model(false)` — 접힘 상태. true 면 레인 콘텐츠 숨김.
- 콘텐츠: `#toolTpl`(도구) / `#titleTpl`(제목). 자식 `sd-kanban` 들.
- `isAllSelected: computed` — 레인 내 선택 가능 카드 전부 선택 시 true(없으면 false). 선택 가능 카드 `>0` 이면 전체선택 체크박스 표시.

## `SdKanban<L, T>` — `<sd-kanban>`

`SdKanbanDragRef`·`SdKanbanDropTarget` 구현. 카드 1개.

- `value: T` — 카드 값.
- `selectable: boolean` — true 면 Shift+Click 으로 보드 `selectedValues` 에 토글.
- `draggable: boolean` — true 면 드래그 가능(드래그 시작 시 보드 `dragKanban` 등록).
- `contentClass: string` — 내부 `.card` 클래스.
- `selected: computed` — `value` 가 보드 `selectedValues` 에 있으면 true.

```html
<sd-kanban-board [(selectedValues)]="selected" (drop)="onDrop($event)">
  <sd-kanban-lane [value]="'todo'">
    <ng-template #titleTpl>할 일</ng-template>
    @for (item of todoItems(); track item.id) {
      <sd-kanban [value]="item" [selectable]="true" [draggable]="true">{{ item.title }}</sd-kanban>
    }
  </sd-kanban-lane>
</sd-kanban-board>
```
