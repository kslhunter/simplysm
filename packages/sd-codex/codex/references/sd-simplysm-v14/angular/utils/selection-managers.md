# Selection Managers

> **읽어야 하는 상황**: 선택(single/multi), 정렬, 트리 확장/축소 관리가 필요할 때.

선택/정렬/트리 확장을 관리하는 composable 함수 모음. `inject()` 없이 Signal 입력만으로 동작한다.

## `useSelectionManager`

선택 관리 composable. single/multi 모드를 지원한다. `trackByFn`이 반환하는 key를 기준으로 `obj.equal`(deep equal) 비교를 수행하므로, 같은 key의 다른 reference item도 `isSelected` true로 복원된다.

```typescript
function useSelectionManager<T>(options: {
  displayItems: Signal<T[]>;
  selectedKeys: WritableSignal<unknown[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
  trackByFn: Signal<(item: T, index: number) => unknown>;
}): {
  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;
  getSelectable(item: T): true | string | undefined;
  getCanChangeFn(item: T): () => boolean;
  select(item: T): void;
  deselect(item: T): void;
  toggle(item: T): void;
  toggleAll(): void;
  isSelected(item: T): boolean;
}
```

### Returns

| Return | Type | Description |
|--------|------|-------------|
| `hasSelectable` | `Signal<boolean>` | selectMode가 설정되어 있는지 여부 |
| `isAllSelected` | `Signal<boolean>` | 모든 선택 가능 항목이 선택되었는지 |
| `getSelectable(item)` | `true \| string \| undefined` | 선택 가능 여부. string은 불가 사유 |
| `getCanChangeFn(item)` | `() => boolean` | 선택 변경 가능 여부 함수 |
| `select(item)` | `void` | 항목 선택 (single이면 교체) |
| `deselect(item)` | `void` | 항목 선택 해제 |
| `toggle(item)` | `void` | 항목 토글 |
| `toggleAll()` | `void` | 전체 선택/해제 토글 |
| `isSelected(item)` | `boolean` | 선택 여부 |

## `useSortingManager`

정렬 관리 composable.

```typescript
function useSortingManager(options: {
  sorts: WritableSignal<SortingDef[]>;
}): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
}
```

### Returns

| Return | Type | Description |
|--------|------|-------------|
| `defMap` | `Signal<Map<string, ...>>` | 키별 정렬 정의 (인덱스 텍스트, 방향) |
| `toggle(key, multiple)` | `void` | 정렬 토글. `multiple=true`면 멀티 소트, `false`면 단일 소트. 3단계: asc → desc → 없음 |
| `sort(items)` | `T[]` | 정렬 적용. 원본 배열은 변경하지 않음 |

## `useExpandingManager`

트리 확장/축소 관리 composable.

```typescript
function useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}): {
  displayItems: Signal<T[]>;
  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;
  toggle(item: T): void;
  toggleAll(): void;
  isVisible(item: T): boolean;
  def(item: T): ExpandItemDef<T>;
}
```

### Returns

| Return | Type | Description |
|--------|------|-------------|
| `displayItems` | `Signal<T[]>` | 트리를 평탄화한 전체 항목 (숨김 포함) |
| `hasExpandable` | `Signal<boolean>` | 확장 가능한 항목 존재 여부 |
| `isAllExpanded` | `Signal<boolean>` | 모든 확장 가능 항목이 펼쳐졌는지 |
| `toggle(item)` | `void` | 항목 확장/축소 토글 |
| `toggleAll()` | `void` | 전체 확장/축소 토글 |
| `isVisible(item)` | `boolean` | 부모 체인이 모두 펼쳐져 항목이 보이는지 |
| `def(item)` | `ExpandItemDef<T>` | 항목의 트리 정의 |
