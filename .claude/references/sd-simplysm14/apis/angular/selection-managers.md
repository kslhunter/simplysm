# @simplysm/angular — selection-managers

리스트 컴포넌트 내부에서 쓰는 선택·확장·정렬 로직 함수 훅. signal 바인딩.

## useSelectionManager

```ts
function useSelectionManager<TItem, TKey>(options: {
  displayItems: Signal<TItem[]>;
  selectedKeys: WritableSignal<TKey[]>;
  selectMode: Signal<"single"|"multi"|undefined>;
  getItemSelectableFn: Signal<((item: TItem) => boolean|string)|undefined>;
  trackByFn: Signal<(item, index) => TKey>;
}): {
  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;
  getSelectable(item): true|string|undefined;
  getCanChangeFn(item): () => boolean;
  select(item): void;
  deselect(item): void;
  toggle(item): void;
  toggleAll(): void;
  isSelected(item): boolean;
};
```

- `selectMode=single` 이면 `select` 가 기존 키 덮어씀, `multi` 면 추가.
- `getItemSelectableFn` — true: 선택 가능, false: 불가, string: 불가 + 사유.
- `getSelectable` 반환 → `true` (선택 가능), `string` (사유), `undefined` (해당 없음).
- `isAllSelected` — selectable 항목 전체가 선택된 상태.
- 키 비교는 `obj.equal` (deep equal).

## useExpandingManager

```ts
function useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[]|undefined)|undefined>;
  sort: (items: T[]) => T[];
}): {
  displayItems: Signal<T[]>;     // 트리 평탄화 + 정렬 적용
  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;
  toggle(item): void;
  toggleAll(): void;
  isVisible(item): boolean;       // 조상 모두 expanded 인지
  def(item): ExpandItemDef<T>;
};

interface ExpandItemDef<T> {
  item: T;
  parentDef: ExpandItemDef<T>|undefined;
  hasChildren: boolean;
  depth: number;
}
```

- `getChildrenFn` 으로 트리 워킹 → 깊이·부모 정보 포함한 def 배열 생성.
- `sort` — 각 depth 별 자식들에 적용할 정렬 함수(보통 `useSortingManager.sort`).
- `isVisible` — 항목이 화면에 보일 조건(모든 조상이 expanded).

## useSortingManager

```ts
function useSortingManager(options: { sorts: WritableSignal<SortingDef[]> }): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
};

interface SortingDef { key: string; desc: boolean; }
```

- 컬럼 클릭 시 `toggle(key, ctrlKey)`. 단일 정렬은 `asc → desc → 없음` 순환, 다중(`multiple=true`)은 같은 키 누적 + 마지막에 제거.
- `defMap.indexText` — 다중 정렬일 때 컬럼 헤더에 표시할 순번 ("1", "2"…). 단일이면 undefined.
- `sort` — `key` 별 prop 값 비교. string 은 localeCompare, number 는 산술, 그 외는 String 변환 localeCompare. null/undefined 는 최소값.

## 주의

- 세 훅 모두 컴포넌트의 inject 컨텍스트 없이 호출 가능(순수 함수). 단 signal 바인딩이므로 reactive 컨텍스트에서 사용.
- `<sd-sheet>` 가 내부적으로 셋 다 사용. 새 리스트 컴포넌트 만들 때 같은 동작 원하면 재사용.
