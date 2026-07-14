# @simplysm/angular — 칸반

`sd-kanban-board` > `sd-kanban-lane` > `sd-kanban` 3계층으로 카드 선택과 drag-drop 이동을 처리하는 군임. standalone · OnPush · `ViewEncapsulation.None`. 제네릭 `<L, T>` 에서 `L` 은 lane 값 타입, `T` 는 card 값 타입임. board는 데이터를 직접 변경하지 않고 `drop` 으로 source/target만 알려줌.

## `SdKanbanBoard<L, T>` (`sd-kanban-board`)

```ts
class SdKanbanBoard<L, T> {
  selectedValues: ModelSignal<T[]>; // default []
  drop: OutputEmitterRef<SdKanbanBoardDropInfo<L, T>>;
}
interface SdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T; // 드래그한 카드 값
  targetLaneValue?: L; // 드롭된 lane 값
  targetKanbanValue?: T; // 드롭 대상 카드 값(없으면 lane 끝에 append)
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

lane들을 가로로 배치하는 보드. 내부 `dragKanban` signal로 현재 드래그 카드를 추적(plain signal, input 아님).

- `selectedValues`(model) — 선택된 카드 값 배열. lane 전체선택·카드 shift-클릭으로 변경.
- `drop` — 드롭 시 `{ sourceKanbanValue, targetLaneValue, targetKanbanValue }` emit. 보드는 리스트를 직접 정렬하지 않으므로 소비자가 이 정보로 자기 데이터를 갱신함.
- 드롭 해석 — `targetKanbanValue` 가 있으면 "그 카드 앞에 삽입", 없으면(lane 빈 영역) "lane 끝에 append".

## `SdKanbanLane<L, T>` (`sd-kanban-lane`)

```ts
class SdKanbanLane<L, T> implements SdKanbanDropTarget<L, T> {
  busy: InputSignal<boolean>; // default false
  useCollapse: InputSignal<boolean>; // default false
  collapse: ModelSignal<boolean>; // default false
  value: InputSignal<L | undefined>;
}
```

카드(`<ng-content>`)를 담는 lane. `SdKanbanDropTarget` 구현(`targetLaneValue()` = `value()`; `targetKanbanValue` 메서드 없음 → lane 영역 드롭은 append).

- `busy` — true면 lane 콘텐츠 위에 busy bar 표시.
- `useCollapse` — true면 헤더에 접기 토글 anchor(eye/eye-off 아이콘) 렌더.
- `collapse`(model) — 접힘 상태(양방향). true면 카드들 숨김.
- `value` — lane 식별 값(`targetLaneValue` 로 노출).
- 투영 템플릿 — `#toolTpl`(상단 툴바), `#titleTpl`(헤더 인라인). 헤더에 lane 전체선택 체크박스(선택 가능 카드 ≥1일 때).
- drag-over — lane 위 드래그 시 `data-sd-drag-over` + 끝에 drop placeholder(드래그 카드 높이만큼).

## `SdKanban<L, T>` (`sd-kanban`, 카드)

```ts
class SdKanban<L, T> implements SdKanbanDragRef<L, T>, SdKanbanDropTarget<L, T> {
  value: InputSignal<T | undefined>;
  selectable: InputSignal<boolean>; // default false
  draggable: InputSignal<boolean>; // default false
  contentClass: InputSignal<string | undefined>;
}
```

카드 컴포넌트. `<ng-content>` 1개(내부 `.card` div). `SdKanbanDragRef`(`value`/`heightOnDrag`) + `SdKanbanDropTarget`(`targetLaneValue` = 소속 lane 값, `targetKanbanValue` = 자기 `value`) 구현.

- `value` — 카드 값/식별자. 선택 멤버십·`sourceKanbanValue`/`targetKanbanValue` 로 쓰임.
- `selectable` — true면 shift-클릭 선택 참여(lane 전체선택에 포함). false면 shift-클릭 무시.
- `draggable` — true면 카드 드래그 가능(내부 `.card` 의 native `draggable`). false면 드래그 시작 무시.
- `contentClass` — 내부 `.card` div에 적용할 class.
- 드래그 — `dragstart` 시 `heightOnDrag` 기록 + `board.dragKanban=this`(source 지정). 카드 위 드롭 시 `board.onDropTo(this)`(이 카드를 target으로).
- 선택 — shift-클릭으로 `board.selectedValues` 에서 토글(일반 클릭은 동작 없음).
