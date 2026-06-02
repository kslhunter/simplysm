# @simplysm/angular — 선택·정렬·확장 매니저(use* 컴포저블)

커스텀 리스트/그리드 컴포넌트에 선택·정렬·트리 확장 로직을 붙이는 함수형 컴포저블. signal 바인딩을 넘기면 파생 signal 과 조작 메서드를 돌려줌. `sd-sheet` 가 내부적으로 이들을 조합함.

## useSelectionManager<TItem, TKey>

다중/단일 선택 상태 관리.
- options: `{ displayItems: Signal<TItem[]>; selectedKeys: WritableSignal<TKey[]>; selectMode: Signal<"single"|"multi"|undefined>; getItemSelectableFn: Signal<((item) => boolean|string)|undefined>; trackByFn: Signal<(item,index) => TKey> }` — selectMode 미지정이면 선택 비활성, getItemSelectableFn 이 string 반환 시 그 사유로 불가, trackByFn 으로 키 비교(`obj.equal` 깊은 비교).
- 반환: `hasSelectable`/`isAllSelected`(Signal), `getSelectable(item): true|string|undefined`, `getCanChangeFn(item)`, `select`/`deselect`/`toggle`/`toggleAll`/`isSelected`. single 은 1개로 교체, multi 는 누적.

## useSortingManager

헤더 클릭 정렬 상태 + 정렬 실행.
- options: `{ sorts: WritableSignal<SortingDef[]> }`.
- 반환: `defMap: Signal<Map<key, { indexText?; desc }>>`(다중 정렬 시 순번 표시), `toggle(key, multiple)`(단일/다중 토글: 없음→오름차순→내림차순→해제 순환), `sort<T>(items): T[]`(null 은 앞, 문자열 localeCompare, 숫자 차이 기준).
- **SortingDef** — `{ key: string; desc: boolean }`. 정렬 1건.

## useExpandingManager<T>

트리 펼침 상태 + 가시 항목 평탄화.
- binding: `{ items: Signal<T[]>; expandedItems: WritableSignal<T[]>; getChildrenFn: Signal<((item,index) => T[]|undefined)|undefined>; sort: (items) => T[] }` — getChildrenFn 으로 자식 조회, sort 로 각 레벨 정렬.
- 반환: `displayItems`/`hasExpandable`/`isAllExpanded`(Signal), `toggle(item)`/`toggleAll()`, `isVisible(item)`(조상이 모두 펼쳐졌는지), `def(item): ExpandItemDef<T>`(못 찾으면 throw).
- **ExpandItemDef<T>** — `{ item; parentDef: ExpandItemDef<T>|undefined; hasChildren; depth }`. 항목의 트리 위치 정의.

```ts
const sorting = useSortingManager({ sorts });
const selection = useSelectionManager({ displayItems, selectedKeys, selectMode, getItemSelectableFn, trackByFn });
```
