# @simplysm/angular — 칸반(kanban)

드래그앤드롭으로 카드를 레인 간 이동하고 카드를 다중 선택하는 칸반 보드 군. `sd-kanban-board`(보드) > `sd-kanban-lane`(레인) > `sd-kanban`(카드) 의 3계층으로 구성. `L`=레인 값 타입, `T`=카드 값 타입.

## SdKanbanBoard — `<sd-kanban-board>`

```ts
selectedValues = model<T[]>([]);
drop = output<SdKanbanBoardDropInfo<L, T>>();
// SdKanbanBoardDropInfo<L,T> { sourceKanbanValue?: T; targetLaneValue?: L; targetKanbanValue?: T }
```

- 칸반 전체 보드(레인을 가로 배치). `selectedValues`=선택된 카드 값들(다중선택, model). `drop`=카드를 다른 위치에 떨군 결과(소스 카드값 + 대상 레인값 + 대상 카드값). 호스트가 `drop` 을 받아 데이터 재배치.

```html
<sd-kanban-board [(selectedValues)]="selected" (drop)="onDrop($event)">
  <sd-kanban-lane [value]="'todo'"> ... </sd-kanban-lane>
</sd-kanban-board>
```

## SdKanbanLane — `<sd-kanban-lane>`

```ts
busy = input(false); useCollapse = input(false); collapse = model(false);
value = input<L>();
// 슬롯: #titleTpl(제목) #toolTpl(도구) , 콘텐츠로 <sd-kanban>
```

- 한 레인(열). `value`=레인 식별값(drop 대상 판정·targetLaneValue). `busy`=레인 busy 오버레이, `useCollapse`=접기 토글 버튼(접으면 카드 숨김, `collapse` model).
- 선택 가능한 카드가 있으면 레인 전체선택 체크박스 자동 노출. `#titleTpl`/`#toolTpl` 로 헤더/도구 영역.

## SdKanban — `<sd-kanban>`

```ts
value = input<T>(); selectable = input(false); draggable = input(false);
contentClass = input<string>();
```

- 한 카드. `value`=카드 식별값. `draggable`=드래그 이동 허용, `selectable`=Shift+클릭 다중선택 허용(`board.selectedValues` 에 토글). 콘텐츠가 카드 본문. 드래그 중 드롭 위치 표시를 내장.

```html
<sd-kanban [value]="item" [draggable]="true" [selectable]="true">
  <div>{{ item.title }}</div>
</sd-kanban>
```

## 드래그/드롭 타입

```ts
SdKanbanDragRef<_L, T> { value(): T | undefined; heightOnDrag(): number }
SdKanbanDropTarget<L, T> { targetLaneValue(): L | undefined; targetKanbanValue?(): T | undefined }
```

- `SdKanbanDragRef` — 드래그 중인 카드 참조(보드가 추적). `SdKanbanDropTarget` — 드롭 대상(레인 또는 카드가 구현). 둘 다 컴포넌트가 내부 구현하는 계약으로, 직접 다룰 일은 드묾.
