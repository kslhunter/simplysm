# @simplysm/angular — 선택·정렬·확장 매니저

리스트/시트류 컴포넌트 내부에서 signal 바인딩으로 선택·다중정렬·트리확장 상태를 다루는 컴포저블 함수. 컴포넌트 클래스 필드 초기화 시 호출하며, signal 입력(items/selectedKeys/sorts 등)과 메서드 묶음을 반환. `sd-sheet` 가 셋 모두 사용.

## useSelectionManager

`useSelectionManager<TItem, TKey>(options): { ... }` — 단일/다중 선택 상태 관리.

options(모두 Signal/WritableSignal):
- `displayItems: Signal<TItem[]>` — 현재 표시 항목.
- `selectedKeys: WritableSignal<TKey[]>` — 선택 키 배열(양방향).
- `selectMode: Signal<"single"|"multi"|undefined>` — 선택 모드. `undefined` 면 선택 비활성.
- `getItemSelectableFn: Signal<((item) => boolean | string) | undefined>` — 선택 가능 판정. `string` 이면 비활성 + 사유.
- `trackByFn: Signal<(item, index) => TKey>` — 키 추출.

반환: `hasSelectable`/`isAllSelected: Signal<boolean>`, `getSelectable(item): true | string | undefined`, `getCanChangeFn(item): () => boolean`, `select`/`deselect`/`toggle`/`toggleAll`/`isSelected(item)`. single 모드 select 는 단일 키로 교체, multi 는 추가/제거.

## useSortingManager

`useSortingManager(options: { sorts: WritableSignal<SortingDef[]> }): { ... }` — 다중 정렬 토글·적용.

- `options.sorts` — 정렬 정의 배열(양방향). `SortingDef = { key: string; desc: boolean }`.
- 반환:
  - `defMap: Signal<Map<key, { indexText?; desc }>>` — 컬럼별 정렬 상태(다중 시 순번 indexText).
  - `toggle(key, multiple)` — 정렬 토글. `multiple=true`(Shift) 면 누적, 동일 키 재클릭 시 asc→desc→해제 순환.
  - `sort<T>(items): T[]` — 현재 정렬 정의로 배열 정렬(null 은 먼저, 문자열은 localeCompare).

## useExpandingManager

`useExpandingManager<T>(binding): { ... }` — 트리 펼침/접힘 상태 관리.

binding:
- `items: Signal<T[]>` — 루트 항목.
- `expandedItems: WritableSignal<T[]>` — 펼친 항목(양방향).
- `getChildrenFn: Signal<((item, index) => T[] | undefined) | undefined>` — 자식 추출.
- `sort: (items) => T[]` — 각 레벨 정렬 함수.
- 반환:
  - `displayItems: Signal<T[]>` — 펼침 반영된 평탄 표시 목록.
  - `hasExpandable`/`isAllExpanded: Signal<boolean>`.
  - `toggle(item)`/`toggleAll()` — 펼침 토글.
  - `isVisible(item): boolean` — 모든 조상이 펼쳐졌는지.
  - `def(item): ExpandItemDef<T>` — 항목 메타(없으면 throw).
- `ExpandItemDef<T>` — `{ item; parentDef?; hasChildren; depth }`.
