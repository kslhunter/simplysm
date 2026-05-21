# @simplysm/angular — kanban

드래그·드롭 칸반 보드. lane 간 카드 이동·다중 선택.

## SdKanbanBoard — `<sd-kanban-board>`

```ts
class SdKanbanBoard<L, T>
selectedValues = model<T[]>([]);                 // 선택된 카드 value 목록
drop = output<SdKanbanBoardDropInfo<L, T>>();

interface SdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;     // 특정 카드 위에 떨어뜨렸을 때
}
```

- 자식으로 `<sd-kanban-lane>` 들. 카드를 lane 또는 다른 카드 위로 드롭하면 `drop` 발화. 호출자는 데이터 reorder 책임.
- `selectedValues` — `<sd-kanban selectable>` 의 클릭 시 선택 토글.

```html
<sd-kanban-board (drop)="onDrop($event)">
  @for (lane of lanes; track lane.id) {
    <sd-kanban-lane [value]="lane">
      <div sd-kanban-lane-title>{{ lane.title }}</div>
      @for (card of lane.cards; track card.id) {
        <sd-kanban [value]="card" draggable>{{ card.title }}</sd-kanban>
      }
    </sd-kanban-lane>
  }
</sd-kanban-board>
```

## SdKanbanLane — `<sd-kanban-lane>`

```ts
class SdKanbanLane<L, T>
value = input<L>();                              // lane 식별 데이터
busy = input(false);                             // lane 영역에 SdBusyContainer 효과
useCollapse = input(false);                      // 접기 버튼 노출
collapse = model(false);                         // 접힌 상태
```

- `value` 는 `drop.targetLaneValue` 로 사용.
- `useCollapse=true` + `collapse(true)` 면 컨텐츠 숨김(헤더만).

## SdKanban — `<sd-kanban>`

```ts
class SdKanban<L, T> implements SdKanbanDragRef<L, T>, SdKanbanDropTarget<L, T>
value = input<T>();
selectable = input(false);
draggable = input(false);
contentClass = input<string>();
```

- `draggable=true` 면 드래그 핸들 활성. `selectable=true` 면 클릭 시 `SdKanbanBoard.selectedValues` 토글.
- `value` 는 `drop.sourceKanbanValue`/`targetKanbanValue` 로 사용.
- `<ng-content>` 가 카드 본문.

## 타입

```ts
interface SdKanbanDragRef<_L, T> {
  value(): T|undefined;
  heightOnDrag(): number;
}
interface SdKanbanDropTarget<L, T> {
  targetLaneValue(): L|undefined;
  targetKanbanValue?(): T|undefined;
}
```

- 보드 내부에서 드래그 소스/드롭 타겟 구분에 사용. 컴포넌트 클래스가 직접 구현. 외부에서 직접 구현할 일은 거의 없음.

## 주의

- 드롭 후 데이터 반영은 호출자가 해야 함. `drop` 이벤트만으로 자동 재정렬되지 않음.
- 같은 카드를 자기 자신에 드롭하면 `sourceKanbanValue === targetKanbanValue`. 호출자가 무시 처리.
