# @simplysm/angular — selection/sorting/expanding 매니저 (use* 컴포저블)

커스텀 목록 컴포넌트에서 선택·정렬·트리펼침 상태 로직을 signal 기반으로 합성하는 함수 컴포저블 군. `sd-sheet` 가 이들을 조합해 만들어졌고, 직접 그리드/리스트를 만들 때 같은 로직을 재사용. 모두 함수 호출로 signal·메서드 묶음을 반환(컴포넌트 필드에 보관).

## useSelectionManager<TItem, TKey>

행 선택(single/multi)·전체선택·선택 가능 여부 로직.

```ts
useSelectionManager<TItem, TKey>(options: {
  displayItems: Signal<TItem[]>;
  selectedKeys: WritableSignal<TKey[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: TItem) => boolean | string) | undefined>;
  trackByFn: Signal<(item: TItem, index: number) => TKey>;
}): { ... }
```

- `options.displayItems` — 현재 표시 항목. `selectedKeys` — 선택 키(WritableSignal, 키는 `trackByFn` 반환값). `selectMode` — 모드(undefined 면 선택 비활성). `getItemSelectableFn` — 행별 선택 가능: `true`=가능, `false`=불가, 문자열=불가+사유. `trackByFn` — 항목→키.
- 반환:
  - `hasSelectable: Signal<boolean>` — 선택 모드가 켜졌는지.
  - `isAllSelected: Signal<boolean>` — 선택 가능한 항목이 모두 선택됐는지(전체선택 체크 상태).
  - `getSelectable(item): true | string | undefined` — 항목 선택 가능 여부(문자열=사유 툴팁).
  - `getCanChangeFn(item): () => boolean` — 체크박스 `canChangeFn` 에 넘길 가드.
  - `select`/`deselect`/`toggle(item)` — 선택 조작(single 은 단일 키로 대체).
  - `toggleAll()` — 선택 가능 항목 전체 토글.
  - `isSelected(item): boolean`.
- 키 비교는 `===` 후 `obj.equal`(복합 키 지원).

## useSortingManager

정렬 상태(다중 컬럼) 토글·적용. `sd-sheet` 의 `sorts` 와 `SortingDef` 를 공유.

```ts
useSortingManager(options: { sorts: WritableSignal<SortingDef[]> }): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
}
```

- `SortingDef = { key: string; desc: boolean }` — 한 정렬 기준. `key`=컬럼 키, `desc`=내림차순 여부.
- `defMap` — 키별 정렬 상태(헤더 아이콘 표시용; `indexText` 는 다중 정렬 시 순번).
- `toggle(key, multiple)` — 정렬 토글. 한 키를 누를 때마다 없음→오름차순→내림차순→해제 순환. `multiple`(Shift) true 면 기존 정렬 유지하고 추가, false 면 단일 정렬로 대체.
- `sort<T>(items)` — 현재 정렬을 적용한 새 배열 반환. null 은 가장 앞, 문자열은 localeCompare, 숫자는 수치 비교. 클라이언트 정렬 시 사용.

## useExpandingManager<T>

트리 항목 펼침/접힘 + 표시 항목 평탄화.

```ts
useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}): { ... }
```

- `binding.items` — 루트 항목. `expandedItems` — 펼쳐진 항목(WritableSignal). `getChildrenFn` — 자식 조회(undefined 면 자식 없음). `sort` — 각 레벨 정렬 함수(보통 `useSortingManager.sort`).
- 반환:
  - `displayItems: Signal<T[]>` — 펼침 상태를 반영해 평탄화·정렬된 표시 항목.
  - `hasExpandable: Signal<boolean>` — 펼칠 수 있는 항목이 있는지(토글 컬럼 표시 기준).
  - `isAllExpanded: Signal<boolean>` — 전체 펼침 상태.
  - `toggle(item)` / `toggleAll()` — 펼침 토글.
  - `isVisible(item): boolean` — 조상이 모두 펼쳐져 보이는지.
  - `def(item): ExpandItemDef<T>` — 항목 메타(못 찾으면 throw).
- `ExpandItemDef<T> = { item: T; parentDef: ExpandItemDef<T> | undefined; hasChildren: boolean; depth: number }` — 항목의 부모·자식유무·깊이. 들여쓰기·토글 렌더에 사용.
