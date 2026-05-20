# @simplysm/angular — selection-managers

`<sd-sheet>`/`<sd-select>` 등이 내부에서 쓰는 선택·확장·정렬 로직을 외부 컴포넌트에서도 재사용할 수 있도록 추출된 함수 훅들. signal 바인딩.

## `useSelectionManager<TItem, TKey>(options)`

```typescript
const sm = useSelectionManager({
  displayItems,                                // Signal<TItem[]>
  selectedKeys,                                // WritableSignal<TKey[]>
  selectMode,                                  // Signal<"single"|"multi"|undefined>
  getItemSelectableFn,                         // Signal<((item) => boolean|string) | undefined>
  trackByFn,                                   // Signal<(item, idx) => TKey>
});
sm.hasSelectable; sm.isAllSelected;
sm.getSelectable(item);    // true | string(reason) | undefined
sm.select(item); sm.deselect(item); sm.toggle(item); sm.toggleAll();
sm.isSelected(item); sm.getCanChangeFn(item);   // () => boolean (체크박스 canChangeFn 으로 직결)
```

- `single`이면 select 시 기존 키 대체. `multi` 면 추가.
- 키 비교는 `obj.equal` (`@simplysm/core-common`).
- `trackByFn` 반환이 `null`이면 선택 불가.
- `hasSelectable`은 `selectMode != null` 여부 (선택 가능 모드인지). 선택 가능한 아이템 존재 여부는 `isAllSelected` 로직에서 자동 처리.

## `useExpandingManager<T>(binding)`

```typescript
interface ExpandItemDef<T> { item; parentDef?; hasChildren; depth }
const em = useExpandingManager({
  items, expandedItems,
  getChildrenFn,    // Signal<((item, idx) => T[] | undefined) | undefined>
  sort,             // (items: T[]) => T[]
});
em.displayItems; em.hasExpandable; em.isAllExpanded;
em.toggle(item); em.toggleAll(); em.isVisible(item); em.def(item);
```

부모가 collapsed면 자식은 `isVisible=false`.

## `useSortingManager(options)`

```typescript
interface SortingDef { key: string; desc: boolean }
const sm = useSortingManager({ sorts });
sm.defMap;     // Signal<Map<key, { indexText?, desc }>>
sm.toggle(key, multiple);  // multiple=true면 multi-key sort, 아니면 단일
sm.sort(items);            // null < non-null, string localeCompare
```

`toggle` 토글 순서: 없음 → asc → desc → 제거.
