# @simplysm/angular — 칸반

`sd-kanban-board` > `sd-kanban-lane` > `sd-kanban` 3계층으로 카드 선택과 drag-drop 이동을 처리하는 군이다. `L`은 lane 값 타입, `T`는 card 값 타입이다.

## `SdKanbanBoard<L, T>` — `<sd-kanban-board>`

```ts
class SdKanbanBoard<L, T> {
  dragKanban: WritableSignal<SdKanbanDragRef<L, T> | undefined>;
  selectedValues: ModelSignal<T[]>;
  drop: OutputEmitterRef<SdKanbanBoardDropInfo<L, T>>;
  onDropTo(target: SdKanbanDropTarget<L, T>): void;
  onDocumentDragEnd(): void;
}
interface SdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}
interface SdKanbanDragRef<_L, T> {
  value(): T | undefined;
  heightOnDrag(): number;
}
interface SdKanbanDropTarget<L, T> {
  targetLaneValue(): L | undefined;
  targetKanbanValue?(): T | undefined;
}
```

- `dragKanban` — 현재 drag 중인 card ref. dragend/drop 후 undefined로 초기화한다.
- `selectedValues` — Shift+click 선택된 card value 배열 model.
- `drop` — drop 완료 시 source/target 정보를 emit한다.
- `onDropTo.target` — lane 또는 card drop target. drag 중인 ref가 없으면 아무 작업도 하지 않는다.
- `onDocumentDragEnd` — document dragend에서 drag state를 초기화한다.
- `sourceKanbanValue` — drag source card value.
- `targetLaneValue` — drop target lane value.
- `targetKanbanValue` — card 앞/위치 target value. lane 빈 영역 drop이면 undefined 가능.
- `SdKanbanDragRef.value` — drag source card value getter.
- `heightOnDrag` — drop placeholder 높이에 쓸 drag source 높이 getter.
- `SdKanbanDropTarget.targetLaneValue` — target lane value getter.
- `targetKanbanValue` — target card value getter. lane target은 없을 수 있다.

## `SdKanban<L, T>` — `<sd-kanban>`

```ts
class SdKanban<L, T> implements SdKanbanDragRef<L, T>, SdKanbanDropTarget<L, T> {
  value: InputSignal<T | undefined>;
  laneValue: Signal<L | undefined>;
  selectable: InputSignal<boolean>;
  draggable: InputSignal<boolean>;
  selected: Signal<boolean>;
  dragKanban: Signal<SdKanbanDragRef<L, T> | undefined>;
  contentClass: InputSignal<string | undefined>;
  dragOvered: WritableSignal<boolean>;
  heightOnDrag: WritableSignal<number>;
  cardHeight: WritableSignal<number>;
}
```

- `value` — card 식별 값. drop source/target payload와 selection value로 쓰인다.
- `laneValue` — parent lane의 `value()` 를 읽는 computed.
- `selectable` — true면 Shift+click으로 board `selectedValues` 에 value를 toggle할 수 있다.
- `draggable` — true면 card div에 native draggable을 켜고 dragstart에서 board drag ref를 set한다.
- `selected` — value가 있고 board `selectedValues` 에 포함되어 있으면 true.
- `dragKanban` — board의 현재 drag ref computed.
- `contentClass` — card div class.
- `dragOvered` — 이 card 위치에 drag over 중인지 여부.
- `heightOnDrag` — dragstart 때 host offsetHeight를 저장해 placeholder 높이로 쓴다.
- `cardHeight` — card clientHeight + margin-bottom. drop hit area 높이에 쓴다.
- drop 동작 — drag over/drop에서 default를 막고 board `onDropTo(this)` 를 호출한다.

## `SdKanbanLane<L, T>` — `<sd-kanban-lane>`

```ts
class SdKanbanLane<L, T> implements SdKanbanDropTarget<L, T> {
  busy: InputSignal<boolean>;
  useCollapse: InputSignal<boolean>;
  collapse: ModelSignal<boolean>;
  value: InputSignal<L | undefined>;
  kanbanControls: Signal<readonly SdKanban<L, T>[]>;
  isAllSelected: Signal<boolean>;
  dragKanban: Signal<SdKanbanDragRef<L, T> | undefined>;
  dragOvered: WritableSignal<boolean>;
  selectableKanbanLength: Signal<number>;
}
```

- `busy` — lane body `SdBusyContainer.busy` 로 전달한다.
- `useCollapse` — true면 eye/eye-off collapse toggle button을 표시한다.
- `collapse` — lane content 표시 여부 model. true면 projected cards를 숨긴다.
- `value` — lane 식별 값. drop target payload로 쓰인다.
- `kanbanControls` — descendant `SdKanban` card controls.
- `isAllSelected` — selectable card가 하나 이상 있고 모두 selected면 true.
- `dragKanban` — board drag ref computed.
- `dragOvered` — lane 빈 영역에 drag over 중인지 여부.
- `selectableKanbanLength` — selectable card 개수. 0보다 크면 select-all checkbox를 표시한다.
- `toolTpl` — lane 상단 tool 영역 template.
- `titleTpl` — lane title 영역 template.
- select-all 동작 — checkbox true면 selectable card value를 board `selectedValues` 에 추가, false면 lane의 selectable card value를 제거한다.
- drop 동작 — lane 빈 영역 drop에서 board `onDropTo(this)` 를 호출한다.
