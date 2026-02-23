# CrudSheet v12 Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** v12 `AbsSdDataSheet`에서 누락된 8개 기능을 v13 `CrudSheet`에 복원한다.

**Architecture:** `types.ts` props/interfaces 변경 → `CrudSheet.tsx` 로직 추가 → 데모 업데이트. DataSheet는 변경하지 않는다 (이미 필요한 기능이 구현됨).

**Tech Stack:** SolidJS, @solidjs/router (useBeforeLeave), @simplysm/core-common (oneWayDiffs, DateTime)

---

### Task 1: types.ts — Props & Interfaces 변경

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/types.ts`

**Step 1: Write the failing test**

테스트 불필요 — 타입 정의만 변경. typecheck로 검증.

**Step 2: Implementation**

`types.ts` 전체 변경:

```typescript
import type { JSX } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { ArrayDiffs2Result } from "@simplysm/core-common";
import type { DataSheetColumnProps, SortingDef } from "../sheet/types";

// ── Search ──

export interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;
}

// ── Feature Configs ──

export interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayDiffs2Result<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
  diffsExcludes?: string[];
}

export interface ModalEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean | undefined>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
  restoreItems?: (items: TItem[]) => Promise<boolean>;
}

export interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}

export interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}

// ── Cell Context ──

export interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}

// ── CrudSheet Context (for Tools render prop) ──

export interface CrudSheetContext<TItem> {
  items(): TItem[];
  selectedItems(): TItem[];
  page(): number;
  sorts(): SortingDef[];
  busy(): boolean;
  hasChanges(): boolean;

  save(): Promise<void>;
  refresh(): Promise<void>;
  addItem(): void;
  setPage(page: number): void;
  setSorts(sorts: SortingDef[]): void;
  clearSelection(): void;
}

// ── Props ──

export type CrudSheetProps<TItem, TFilter extends Record<string, any>> = CrudSheetBaseProps<
  TItem,
  TFilter
> &
  (
    | { inlineEdit: InlineEditConfig<TItem>; modalEdit?: never }
    | { modalEdit: ModalEditConfig<TItem>; inlineEdit?: never }
    | { inlineEdit?: never; modalEdit?: never }
  );

interface CrudSheetBaseProps<TItem, TFilter extends Record<string, any>> {
  search: (
    filter: TFilter,
    page: number | undefined,
    sorts: SortingDef[],
  ) => Promise<SearchResult<TItem>>;
  getItemKey: (item: TItem) => string | number | undefined;
  persistKey?: string;
  editable?: boolean;
  itemEditable?: (item: TItem) => boolean;
  itemDeletable?: (item: TItem) => boolean;
  itemDeleted?: (item: TItem) => boolean;
  isItemSelectable?: (item: TItem) => boolean | string;
  lastModifiedAtProp?: keyof TItem & string;
  lastModifiedByProp?: keyof TItem & string;
  onSubmitted?: () => void;
  filterInitial?: TFilter;
  items?: TItem[];
  onItemsChange?: (items: TItem[]) => void;
  excel?: ExcelConfig<TItem>;
  selectMode?: "single" | "multiple";
  onSelect?: (result: SelectResult<TItem>) => void;
  hideAutoTools?: boolean;
  class?: string;
  children: JSX.Element;
}

// ── Sub-component Defs ──
// (CrudSheetColumnDef, CrudSheetColumnProps, CrudSheetFilterDef, CrudSheetToolsDef, CrudSheetHeaderDef 는 변경 없음)
```

변경 요약:
- `InlineEditConfig`: `diffsExcludes?: string[]` 추가
- `ModalEditConfig`: `restoreItems?` 추가
- `CrudSheetContext`: `clearSelection()` 추가
- `CrudSheetBaseProps.search`: `page: number` → `page: number | undefined`
- `CrudSheetBaseProps`: `itemsPerPage` 제거
- `CrudSheetBaseProps`: `isItemSelectable`, `lastModifiedAtProp`, `lastModifiedByProp`, `onSubmitted` 추가

**Step 3: Verify**

Run: `pnpm typecheck packages/solid`
Expected: types.ts 자체는 통과, CrudSheet.tsx에서 기존 itemsPerPage 참조 에러 (Task 2에서 해결)

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/crud-sheet/types.ts
git commit -m "feat(solid): update CrudSheet types for v12 parity"
```

---

### Task 2: CrudSheet.tsx — itemsPerPage 제거 + search 시그니처 변경

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

splitProps에서 `"itemsPerPage"` 제거하고, 관련 로직 변경:

```typescript
// splitProps에서 "itemsPerPage" 제거, 새 props 추가:
const [local, _rest] = splitProps(props, [
  "search",
  "getItemKey",
  "persistKey",
  // "itemsPerPage" 제거
  "editable",
  "itemEditable",
  "itemDeletable",
  "itemDeleted",
  "isItemSelectable",            // 추가
  "lastModifiedAtProp",          // 추가
  "lastModifiedByProp",          // 추가
  "onSubmitted",                 // 추가
  "filterInitial",
  "items",
  "onItemsChange",
  "inlineEdit",
  "modalEdit",
  "excel",
  "selectMode",
  "onSelect",
  "hideAutoTools",
  "class",
  "children",
]);
```

`refresh()` 변경:

```typescript
async function refresh() {
  const result: SearchResult<TItem> = await local.search(
    lastFilter(),
    page(),
    sorts(),
  );
  setItems(reconcile(result.items));
  originalItems = objClone(result.items);
  setTotalPageCount(result.pageCount ?? 0);
}
```

`handleExcelDownload()` 변경:

```typescript
async function handleExcelDownload() {
  if (!local.excel) return;

  setBusyCount((c) => c + 1);
  try {
    const result = await local.search(lastFilter(), undefined, sorts());
    await local.excel.download(result.items);
  } catch (err) {
    noti.error(err, "엑셀 다운로드 실패");
  }
  setBusyCount((c) => c - 1);
}
```

DataSheet에서 `itemsPerPage` 제거:

```tsx
<DataSheet
  class="h-full"
  items={items}
  persistKey={local.persistKey != null ? `${local.persistKey}-sheet` : undefined}
  page={totalPageCount() > 0 ? page() : undefined}
  onPageChange={setPage}
  totalPageCount={totalPageCount()}
  // itemsPerPage 제거
  sorts={sorts()}
  onSortsChange={setSorts}
  // ... 나머지 동일
>
```

**Step 2: Verify**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/crud-sheet/CrudSheet.tsx
git commit -m "refactor(solid): remove itemsPerPage from CrudSheet, use page | undefined"
```

---

### Task 3: CrudSheet.tsx — isItemSelectable 패스스루

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

DataSheet에 `isItemSelectable` 전달 (Task 2의 DataSheet JSX에 추가):

```tsx
<DataSheet
  // ... 기존 props
  isItemSelectable={local.isItemSelectable}
>
```

**Step 2: Commit**

```bash
git commit -m "feat(solid): pass through isItemSelectable to DataSheet"
```

---

### Task 4: CrudSheet.tsx — diffsExcludes 지원

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

`getItemDiffs()` 변경:

```typescript
/* eslint-disable solid/reactivity -- 이벤트 핸들러에서만 호출, store 즉시 읽기 */
function getItemDiffs() {
  return items.oneWayDiffs(originalItems, (item) => local.getItemKey(item), {
    excludes: local.inlineEdit?.diffsExcludes,
  });
}
/* eslint-enable solid/reactivity */
```

**Step 2: Commit**

```bash
git commit -m "feat(solid): support diffsExcludes in CrudSheet inline edit"
```

---

### Task 5: CrudSheet.tsx — 복구 기능 (restoreItems)

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

핸들러 추가 (`handleDeleteItems` 아래):

```typescript
async function handleRestoreItems() {
  if (!local.modalEdit?.restoreItems) return;
  const result = await local.modalEdit.restoreItems(selectedItems());
  if (!result) return;

  setBusyCount((c) => c + 1);
  try {
    await refresh();
    noti.success("복구 완료", "복구되었습니다.");
  } catch (err) {
    noti.error(err, "복구 실패");
  }
  setBusyCount((c) => c - 1);
}
```

DataSheet selectMode에 restoreItems 반영:

```tsx
selectMode={
  isSelectMode()
    ? local.selectMode
    : (local.modalEdit?.deleteItems != null || local.modalEdit?.restoreItems != null)
      ? "multiple"
      : undefined
}
```

Toolbar에 복구 버튼 추가 (`선택 삭제` 버튼 `</Show>` 바로 뒤에):

```tsx
<Show when={canEdit() && local.modalEdit?.restoreItems}>
  <Button
    size="sm"
    theme="warning"
    variant="ghost"
    onClick={handleRestoreItems}
    disabled={
      selectedItems().length === 0 ||
      !selectedItems().some((item) => local.itemDeleted?.(item) ?? false)
    }
  >
    <Icon icon={IconTrashOff} class="mr-1" />
    선택 복구
  </Button>
</Show>
```

"선택 삭제" 버튼의 disabled 로직도 수정 — 삭제되지 않은 항목 있을 때만:

```tsx
disabled={
  selectedItems().length === 0 ||
  !selectedItems().some((item) =>
    (local.itemDeletable?.(item) ?? true) && !(local.itemDeleted?.(item) ?? false),
  )
}
```

**Step 2: Commit**

```bash
git commit -m "feat(solid): add restoreItems support to CrudSheet modal edit"
```

---

### Task 6: CrudSheet.tsx — onSubmitted 콜백

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

`handleSave()`에서 refresh 성공 후 호출:

```typescript
async function handleSave() {
  if (busyCount() > 0) return;
  if (!canEdit()) return;
  if (!local.inlineEdit) return;

  const diffs = getItemDiffs();

  if (diffs.length === 0) {
    noti.info("안내", "변경사항이 없습니다.");
    return;
  }

  setBusyCount((c) => c + 1);
  try {
    await local.inlineEdit.submit(diffs);
    noti.success("저장 완료", "저장되었습니다.");
    await refresh();
    local.onSubmitted?.();
  } catch (err) {
    noti.error(err, "저장 실패");
  }
  setBusyCount((c) => c - 1);
}
```

**Step 2: Commit**

```bash
git commit -m "feat(solid): add onSubmitted callback to CrudSheet"
```

---

### Task 7: CrudSheet.tsx — checkIgnoreChanges

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

import 추가:

```typescript
import { useBeforeLeave } from "@solidjs/router";
```

`checkIgnoreChanges` 함수 추가 (getItemDiffs 뒤):

```typescript
function checkIgnoreChanges(): boolean {
  if (!local.inlineEdit) return true;
  if (getItemDiffs().length === 0) return true;
  // eslint-disable-next-line no-restricted-globals -- 변경사항 확인용 confirm
  return confirm("변경사항이 있습니다. 무시하시겠습니까?");
}
```

`handleRefresh` 변경:

```typescript
async function handleRefresh() {
  if (!checkIgnoreChanges()) return;
  await doRefresh();
}
```

`handleFilterSubmit` 변경:

```typescript
function handleFilterSubmit(e: Event) {
  e.preventDefault();
  if (!checkIgnoreChanges()) return;
  setPage(1);
  setLastFilter(() => objClone(filter));
}
```

Ctrl+Alt+L 키보드 단축키도 체크 추가:

```typescript
createEventListener(document, "keydown", async (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === "s" && !isSelectMode()) {
    e.preventDefault();
    formRef?.requestSubmit();
  }
  if (e.ctrlKey && e.altKey && e.key === "l") {
    e.preventDefault();
    if (!checkIgnoreChanges()) return;
    await doRefresh();
  }
});
```

`useBeforeLeave` 등록 (모달이 아닌 경우만, try-catch로 Router context 없으면 skip):

```typescript
// -- Route Leave Guard --
if (!isModal && local.inlineEdit) {
  try {
    useBeforeLeave((e) => {
      if (!checkIgnoreChanges()) {
        e.preventDefault();
      }
    });
  } catch {
    // Router context 없으면 skip
  }
}
```

**Step 2: Commit**

```bash
git commit -m "feat(solid): add checkIgnoreChanges to CrudSheet"
```

---

### Task 8: CrudSheet.tsx — 키 기반 누적 선택

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

기존 `selectedItems` signal 뒤에 `selectedKeys` 추가:

```typescript
const [selectedItems, setSelectedItems] = createSignal<TItem[]>([]);
const [selectedKeys, setSelectedKeys] = createSignal<Set<string | number>>(new Set());
```

items 변경 시 selectedItems 복원하는 effect 추가:

```typescript
// -- Key-based selection: restore selectedItems when items change --
createEffect(() => {
  const currentItems = items as unknown as TItem[];
  const keys = selectedKeys();
  if (keys.size === 0) {
    if (selectedItems().length > 0) {
      setSelectedItems([]);
    }
    return;
  }
  const restored = currentItems.filter((item) => {
    const key = local.getItemKey(item);
    return key != null && keys.has(key);
  });
  setSelectedItems(restored);
});
```

DataSheet의 `onSelectedItemsChange`를 키 기반 누적 로직으로 변경:

```typescript
function handleSelectedItemsChange(newSelectedItems: TItem[]) {
  // 현재 페이지 아이템들의 key Set
  const currentItems = items as unknown as TItem[];
  const currentKeys = new Set<string | number>();
  for (const item of currentItems) {
    const key = local.getItemKey(item);
    if (key != null) currentKeys.add(key);
  }

  // 새로 선택된 아이템들의 key
  const newSelectedKeys = new Set<string | number>();
  for (const item of newSelectedItems) {
    const key = local.getItemKey(item);
    if (key != null) newSelectedKeys.add(key);
  }

  // 다른 페이지 key 보존 + 현재 페이지 key 갱신
  const merged = new Set<string | number>();
  for (const key of selectedKeys()) {
    if (!currentKeys.has(key)) {
      merged.add(key); // 다른 페이지 key 보존
    }
  }
  for (const key of newSelectedKeys) {
    merged.add(key); // 현재 페이지 선택 추가
  }

  setSelectedKeys(merged);
  setSelectedItems(newSelectedItems);
}
```

DataSheet JSX에서:

```tsx
onSelectedItemsChange={handleSelectedItemsChange}
```

`clearSelection` 함수:

```typescript
function clearSelection() {
  setSelectedKeys(new Set());
  setSelectedItems([]);
}
```

CrudSheetContext에 추가:

```typescript
const ctx: CrudSheetContext<TItem> = {
  // ... 기존
  clearSelection,
};
```

Select mode의 `handleSelectCancel`도 clearSelection 사용:

```typescript
function handleSelectCancel() {
  clearSelection();
  local.onSelect?.({ items: [], keys: [] });
}
```

`handleSelectConfirm`에서 selectedKeys 활용:

```typescript
function handleSelectConfirm() {
  local.onSelect?.({
    items: selectedItems(),
    keys: [...selectedKeys()],
  });
}
```

**Step 2: Commit**

```bash
git commit -m "feat(solid): add key-based cumulative selection to CrudSheet"
```

---

### Task 9: CrudSheet.tsx — lastModified 자동 컬럼

**Files:**

- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: Implementation**

import 추가:

```typescript
import type { DateTime } from "@simplysm/core-common";
```

사용자 정의 컬럼 `</For>` 뒤, `</DataSheet>` 전에 자동 컬럼 추가:

```tsx
{/* Auto lastModified columns */}
<Show when={local.lastModifiedAtProp}>
  <DataSheetColumn<TItem>
    key={local.lastModifiedAtProp!}
    header="수정일시"
    hidden
    sortable={false}
    resizable={false}
  >
    {(dsCtx) => (
      <div class="px-2 py-0.5 text-center">
        {(dsCtx.item[local.lastModifiedAtProp!] as DateTime | undefined)?.toFormatString(
          "yyyy-MM-dd HH:mm",
        )}
      </div>
    )}
  </DataSheetColumn>
</Show>

<Show when={local.lastModifiedByProp}>
  <DataSheetColumn<TItem>
    key={local.lastModifiedByProp!}
    header="수정자"
    hidden
    sortable={false}
    resizable={false}
  >
    {(dsCtx) => (
      <div class="px-2 py-0.5 text-center">
        {dsCtx.item[local.lastModifiedByProp!] as string}
      </div>
    )}
  </DataSheetColumn>
</Show>
```

**Step 2: Commit**

```bash
git commit -m "feat(solid): add auto lastModified columns to CrudSheet"
```

---

### Task 10: 데모 업데이트

**Files:**

- Modify: `packages/solid-demo/src/pages/data/CrudSheetPage.tsx`

**Step 1: Implementation**

데모에서 `search`의 `_page` 타입이 `number | undefined`로 변경됨을 반영.
기타 새 기능은 기존 데모 유지 (breaking change 없음).

```typescript
search={(filter, _page, _sorts) => {
  // 기존 로직 그대로 — _page 타입만 number | undefined로 변경
```

**Step 2: Verify**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/data/CrudSheetPage.tsx
git commit -m "fix(solid-demo): update CrudSheet demo for new search signature"
```

---

### Task 11: 전체 검증

**Step 1: Typecheck**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 2: Lint**

Run: `pnpm lint packages/solid/src/components/data/crud-sheet --fix`
Expected: PASS

**Step 3: Final commit (if lint fixes)**

```bash
git commit -m "style(solid): fix lint issues"
```
