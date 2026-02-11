# Sheet 컴포넌트 마이그레이션 설계

Angular `sd-sheet` 데이터 그리드 컴포넌트를 SolidJS로 마이그레이션하는 설계 문서입니다.

## 원본 소스

- `.legacy-packages/sd-angular/src/ui/data/sheet/`
- 관련 Manager: `SdExpandingManager`, `SdSelectionManager`, `SdSortingManager`

## 범위

### 포함

- `sd-sheet` 컴포넌트 및 하위 기능 전체

### 제외

- `sd-data-sheet` (CRUD, 필터, 엑셀 등 상위 래퍼) — 마이그레이션 대상 아님

## 요구사항

- 다단계 헤더 (colspan/rowspan 자동 계산)
- 컬럼 고정 (sticky)
- 컬럼 리사이징 (드래그 + 더블클릭 초기화, 드래그 중 세로 인디케이터)
- 정렬 (클릭/Shift+Click 다중 정렬, 자동 정렬)
- 페이지네이션 (클라이언트/서버 사이드)
- 트리 확장 (계층 데이터 펼침/접기, 기능 컬럼 자동 생성)
- 행 선택 (단일/다중, Shift+Click 범위 선택, 기능 컬럼 자동 생성)
- 키보드 네비게이션 (Enter/Shift+Enter 행 이동)
- 행 호버 시각 효과 (CSS box-shadow)
- 설정 모달 (컬럼 순서/너비/고정/숨김 저장)

## 1. 컴포넌트 구조 및 API

Compound Component 패턴으로 구성합니다.

### 기본 사용

```tsx
<Sheet items={items()} key="users">
  <Sheet.Column key="name" header={["기본정보", "이름"]} fixed>
    {(ctx) => <div class="p-1">{ctx.item.name}</div>}
  </Sheet.Column>
  <Sheet.Column key="age" header="나이" width="80px">
    {(ctx) => <div class="p-1">{ctx.item.age}</div>}
  </Sheet.Column>
</Sheet>
```

### 인라인 편집

셀 편집은 별도 편집 모드 없이, 셀 렌더러에서 직접 form-control을 렌더링합니다.

```tsx
<Sheet.Column key="age" header="나이" width="80px">
  {(ctx) => <NumberField value={ctx.item.age} onValueChange={...} inset />}
</Sheet.Column>
```

### 정렬 + 선택 + 페이징

```tsx
const [sorts, setSorts] = createSignal<SortingDef[]>([]);
const [selected, setSelected] = createSignal<User[]>([]);
const [page, setPage] = createSignal(0);

<Sheet
  items={items()}
  key="users"
  sorts={sorts()}
  onSortsChange={setSorts}
  useAutoSort
  selectMode="multi"
  selectedItems={selected()}
  onSelectedItemsChange={setSelected}
  page={page()}
  onPageChange={setPage}
  itemsPerPage={20}
>
  <Sheet.Column key="name" header="이름">
    {(ctx) => <div class="p-1">{ctx.item.name}</div>}
  </Sheet.Column>
</Sheet>;
```

### 트리 구조

```tsx
<Sheet
  items={rootItems()}
  key="categories"
  getChildrenFn={(item) => item.children}
  expandedItems={expanded()}
  onExpandedItemsChange={setExpanded}
>
  <Sheet.Column key="name" header="카테고리">
    {(ctx) => (
      <div class="p-1" style={{ "padding-left": `${ctx.depth * 1.5}em` }}>
        {ctx.item.name}
      </div>
    )}
  </Sheet.Column>
</Sheet>
```

### 커스텀 헤더 / 요약 행

```tsx
<Sheet.Column
  key="amount"
  header="금액"
  headerContent={() => <b>금액 (원)</b>}
  summary={() => <span>합계: {total()}</span>}
>
  {(ctx) => <div class="p-1 text-right">{ctx.item.amount.toLocaleString()}</div>}
</Sheet.Column>
```

### 설정 모달 (ConfigModal)

`key` prop이 제공되면 설정 버튼이 표시됩니다. `usePersisted`를 통해 localStorage에 설정이 저장됩니다.

```tsx
// key만 제공하면 자동으로 설정 저장/복원
<Sheet items={items()} key="users">
  ...
</Sheet>

// 설정 바 숨기기
<Sheet items={items()} key="users" hideConfigBar>
  ...
</Sheet>
```

## 2. Props 정의

### SheetProps

```tsx
interface SheetProps<T> {
  // 데이터
  items?: T[];
  trackByFn?: (item: T, index: number) => unknown;

  // 설정
  key: string;
  hideConfigBar?: boolean;
  inset?: boolean;
  contentStyle?: JSX.CSSProperties | string;

  // 정렬
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  useAutoSort?: boolean;

  // 페이지네이션
  page?: number;
  onPageChange?: (page: number) => void;
  totalPageCount?: number;
  itemsPerPage?: number;
  displayPageCount?: number;

  // 선택
  selectMode?: "single" | "multi";
  selectedItems?: T[];
  onSelectedItemsChange?: (items: T[]) => void;
  autoSelect?: "click" | "focus";
  getItemSelectableFn?: (item: T) => boolean | string;

  // 트리 확장
  expandedItems?: T[];
  onExpandedItemsChange?: (items: T[]) => void;
  getChildrenFn?: (item: T, index: number) => T[] | undefined;

  // 셀 스타일
  getItemCellClassFn?: (item: T, colKey: string) => string | undefined;
  getItemCellStyleFn?: (item: T, colKey: string) => string | undefined;

  // 기타
  class?: string;
  children: JSX.Element;
}
```

### SheetColumnProps

```tsx
interface SheetColumnProps<T> {
  key: string;
  header?: string | string[]; // string이면 단일, string[]이면 다단계
  headerContent?: () => JSX.Element; // 커스텀 헤더 렌더러
  headerStyle?: string;
  summary?: () => JSX.Element; // 요약 행 렌더러
  tooltip?: string;
  fixed?: boolean;
  hidden?: boolean;
  collapse?: boolean;
  width?: string;
  class?: string; // 셀에 적용되는 클래스
  disableSorting?: boolean;
  disableResizing?: boolean;
  children: (ctx: SheetCellContext<T>) => JSX.Element; // 셀 렌더러
}
```

### SheetCellContext

```tsx
interface SheetCellContext<T> {
  item: T;
  index: number;
  depth: number;
}
```

### 기타 타입

```tsx
interface SortingDef {
  key: string;
  desc: boolean;
}

interface SheetConfig {
  columnRecord?: Partial<Record<string, SheetConfigColumn>>;
}

interface SheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}
```

## 3. 컬럼 등록 (Plain Object 패턴)

Context 기반 등록이 아닌, SheetColumn이 plain object를 반환하고 Sheet가 `children()`으로 수집하는 패턴입니다.

### SheetColumnDef

```tsx
interface SheetColumnDef<T> {
  __type: "sheet-column"; // 타입 판별 마커
  key: string;
  header: string[]; // 항상 배열로 정규화
  headerContent?: () => JSX.Element;
  headerStyle?: string;
  summary?: () => JSX.Element;
  tooltip?: string;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
  class?: string;
  disableSorting: boolean;
  disableResizing: boolean;
  cell: (ctx: SheetCellContext<T>) => JSX.Element;
}
```

### SheetColumn 컴포넌트

DOM을 렌더링하지 않고, props를 plain object로 변환하여 JSX.Element로 반환합니다.

```tsx
/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function SheetColumn<T>(props: SheetColumnProps<T>): JSX.Element {
  return {
    __type: "sheet-column",
    key: props.key,
    header: normalizeHeader(props.header),
    headerContent: props.headerContent,
    // ... 나머지 props 매핑
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */

export function isSheetColumnDef(value: unknown): value is SheetColumnDef<unknown> {
  return value != null && typeof value === "object" && (value as Record<string, unknown>)["__type"] === "sheet-column";
}
```

### Sheet 내부 수집

```tsx
const resolved = children(() => local.children);
const columnDefs = createMemo(() =>
  (resolved.toArray().filter(isSheetColumnDef) as unknown as SheetColumnDef<T>[]).filter((col) => !col.hidden),
);
```

## 4. 내부 상태 관리

Sheet.tsx 내부에 #region으로 구분하여 모든 상태를 관리합니다.
별도 Manager 클래스를 만들지 않습니다.

### 데이터 파이프라인

```
items (원본)
  → sortedItems (정렬 적용, useAutoSort일 때)
  → pagedItems (페이징 적용, itemsPerPage일 때)
  → flatItems (트리 펼침 적용, getChildrenFn일 때 — visible 항목만)
  → displayItems (최종 렌더링 대상)
```

### Config (usePersisted)

```tsx
// #region Config
const persistedKey = `sheet.${local.key}`;
const [config, setConfig] = usePersisted<SheetConfig>(persistedKey, { columnRecord: {} });

// 설정이 적용된 최종 컬럼 — config 오버라이드 적용
const effectiveColumns = createMemo(() => {
  const cols = columnDefs();
  const record = config().columnRecord ?? {};
  return cols.map((col) => {
    const saved = record[col.key];
    if (saved == null) return col;
    return { ...col, width: saved.width ?? col.width };
  });
});
```

> 현재는 width만 저장/복원됩니다. Plan 7에서 fixed, displayOrder, hidden도 적용하도록 확장합니다.

### 정렬

```tsx
// #region Sorting
const [sorts, setSorts] = createPropSignal({
  value: () => local.sorts ?? [],
  onChange: () => local.onSortsChange,
});

const sortedItems = createMemo(() => {
  if (!local.useAutoSort) return local.items ?? [];
  return applySorting(local.items ?? [], sorts());
});
```

토글 로직: 첫 클릭 asc → 두 번째 desc → 세 번째 제거.
Shift+Click 또는 Ctrl+Click으로 다중 정렬 (기존 sorts 유지).

### 페이징

```tsx
// #region Paging
const [currentPage, setCurrentPage] = createPropSignal({
  value: () => local.page ?? 0,
  onChange: () => local.onPageChange,
});

const effectivePageCount = createMemo(() => {
  // itemsPerPage가 있으면 클라이언트 사이드 계산
  // 없으면 totalPageCount 사용 (서버 사이드)
});

const pagedItems = createMemo(() => {
  // itemsPerPage가 있으면 slice, 없으면 sortedItems 그대로
});
```

### 확장

```tsx
// #region Expanding
const [expandedItems, setExpandedItems] = createPropSignal({
  value: () => local.expandedItems ?? [],
  onChange: () => local.onExpandedItemsChange,
});

const flatItems = createMemo((): FlatItem<T>[] => {
  return flattenTree(pagedItems(), expandedItems(), local.getChildrenFn);
});
```

## 5. 레이아웃 엔진 (순수 함수, sheetUtils.ts로 분리)

### normalizeHeader

```tsx
function normalizeHeader(header?: string | string[]): string[] {
  if (header == null) return [""];
  if (typeof header === "string") return [header];
  return header;
}
```

### buildHeaderTable

다단계 헤더를 2D 배열로 변환하고 colspan/rowspan을 계산합니다.

```tsx
// 입력
columns: [
  { key: "name", header: ["기본", "이름"] },
  { key: "age",  header: ["기본", "나이"] },
  { key: "email", header: ["연락처"] },
]

// 출력: (HeaderDef | null)[][]
[
  // row 0
  [
    { text: "기본", colspan: 2, rowspan: 1, isLastRow: false },
    null,  // colspan으로 병합됨
    { text: "연락처", colspan: 1, rowspan: 2, isLastRow: true, colIndex: 2 },
  ],
  // row 1 (마지막 depth)
  [
    { text: "이름", colspan: 1, rowspan: 1, isLastRow: true, colIndex: 0 },
    { text: "나이", colspan: 1, rowspan: 1, isLastRow: true, colIndex: 1 },
    null,  // rowspan으로 병합됨
  ],
]
```

```tsx
interface HeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colIndex?: number; // isLastRow일 때만 — effectiveColumns 인덱스
  fixed?: boolean;
  width?: string;
  style?: string;
  headerContent?: () => JSX.Element;
}
```

colspan 병합 조건:

- 같은 행에서 같은 텍스트
- 같은 fixed 여부
- 상위 그룹이 같음 (`isSameGroup` 헬퍼로 0행~현재행까지 같은 텍스트 시퀀스 확인)

### 합계 행 (Summary Row)

합계 행은 `<thead>` 내부에 배치하여 스크롤 시 상단에 고정(sticky)됩니다.
하나 이상의 컬럼에 `summary`가 정의되어 있으면 표시됩니다.

기능 컬럼(선택/확장)의 `th`는 전체 헤더 행 수 + 합계 행을 합친 rowspan을 가집니다.

### applySorting

```tsx
function applySorting<T>(items: T[], sorts: SortingDef[]): T[] {
  if (sorts.length === 0) return items;
  // sorts를 역순으로 적용 (안정 정렬)
  let result = [...items];
  for (const sort of [...sorts].reverse()) {
    const selector = (item: T) => objGetChainValue(item, sort.key);
    result = sort.desc ? result.orderByDesc(selector) : result.orderBy(selector);
  }
  return result;
}
```

### flattenTree

visible(부모가 모두 확장된) 항목만 반환합니다. 접힌 하위 항목은 결과에 포함하지 않습니다.

```tsx
interface FlatItem<T> {
  item: T;
  index: number; // 전체 순회 순서
  depth: number;
  hasChildren: boolean;
  parent?: T;
}

function flattenTree<T>(
  items: T[],
  expandedItems: T[],
  getChildrenFn?: (item: T, index: number) => T[] | undefined,
): FlatItem<T>[] {
  // DFS로 트리 순회
  // 부모가 expandedItems에 포함된 경우에만 자식을 결과에 추가
  // 접힌 항목의 자식은 건너뜀 (DOM에 렌더링하지 않음)
}
```

### collectAllExpandable

전체 펼치기/접기용으로 자식이 있는 모든 항목을 수집합니다.

```tsx
function collectAllExpandable<T>(
  items: T[],
  getChildrenFn: (item: T, index: number) => T[] | undefined,
): T[] { ... }
```

## 6. 컬럼 고정 (Sticky)

기능 컬럼(확장/선택)과 일반 고정 컬럼의 너비를 ResizeObserver로 추적하고 `left` 값을 계산합니다.

### 기능 컬럼 너비 추적

```tsx
// #region Feature Column Setup
const [expandColWidth, setExpandColWidth] = createSignal(0);

function registerExpandColRef(el: HTMLElement): void {
  createResizeObserver(el, () => {
    setExpandColWidth(el.offsetWidth);
  });
}
```

### 일반 고정 컬럼

```tsx
// #region ColumnFixing
const columnRefs = new Map<number, HTMLElement>();
const [columnWidths, setColumnWidths] = createSignal<Map<number, number>>(new Map());

// 기능 컬럼의 총 너비 — 고정 컬럼 left 오프셋의 시작점
const featureColTotalWidth = createMemo(() => {
  let w = 0;
  if (hasExpandFeature()) w += expandColWidth();
  // Plan 6에서 선택 기능 컬럼 너비 추가
  return w;
});

// 고정 컬럼의 left 위치 계산
const fixedLeftMap = createMemo(() => {
  const map = new Map<number, number>();
  const cols = effectiveColumns();
  const widths = columnWidths();
  let left = featureColTotalWidth();
  for (let c = 0; c < cols.length; c++) {
    if (!cols[c].fixed) break; // 고정 컬럼은 앞쪽에 연속 배치
    map.set(c, left);
    left += widths.get(c) ?? 0;
  }
  return map;
});
```

고정 컬럼 셀에 ResizeObserver를 등록하여 실제 렌더링 너비를 추적합니다.

### 고정/비고정 경계 시각 효과

고정 컬럼의 마지막 셀과 비고정 첫 셀 사이에 더 진한 테두리를 표시합니다.
`th`와 `td` 모두에 적용됩니다.

```tsx
export const fixedLastClass = clsx("border-r-2 border-r-base-300", "dark:border-r-base-700");
```

### 그룹 헤더의 고정 처리

다단계 헤더에서 그룹 셀(isLastRow가 아닌 셀)의 고정 여부는 colspan 범위 내 모든 컬럼이 fixed인지로 결정합니다.

```tsx
const isGroupFixed = (): boolean => {
  const start = cellColIndex();
  const span = c().colspan;
  const cols = effectiveColumns();
  for (let i = start; i < start + span && i < cols.length; i++) {
    if (!cols[i].fixed) return false;
  }
  return true;
};
```

## 7. 헤더 상단 고정 (HeaderSticky)

다단계 헤더의 각 행이 정확한 sticky 위치를 가지도록, 각 행의 높이를 ResizeObserver로 추적합니다.

```tsx
// #region HeaderSticky
const [headerRowHeights, setHeaderRowHeights] = createSignal<number[]>([]);

function registerHeaderRow(rowIndex: number, el: HTMLElement): void {
  createResizeObserver(el, (rect) => {
    setHeaderRowHeights((prev) => {
      const next = [...prev];
      next[rowIndex] = rect.height;
      return next;
    });
  });
}

// 각 헤더 행의 누적 top 값
const headerRowTops = createMemo(() => {
  const heights = headerRowHeights();
  const tops: number[] = [];
  let acc = 0;
  for (let i = 0; i < heights.length; i++) {
    tops.push(acc);
    acc += heights[i] ?? 0;
  }
  return tops;
});

// 합계 행의 top 값 (모든 헤더 행 높이 합)
const summaryRowTop = createMemo(() => {
  return headerRowHeights().reduce((sum, h) => sum + h, 0);
});
```

모든 `th`에 `top: {headerRowTops[rowIndex]}px` 인라인 스타일이 적용됩니다.

## 8. 기능 컬럼 (Feature Columns)

`selectMode` 또는 `getChildrenFn`이 설정되면 자동으로 기능 컬럼이 추가됩니다.
기능 컬럼은 항상 고정(sticky, `left: 0`)이며, 일반 컬럼보다 앞에 위치합니다.

기능 컬럼은 일반 컬럼과 별도로 JSX에서 렌더링됩니다 (인덱스를 공유하지 않음).

### 확장 컬럼 UI

- **헤더**: 전체 확장/접기 토글 (`IconChevronDown`, 전체 확장 시 `rotate-0`, 접힘 시 `-rotate-90`)
  - rowspan은 전체 헤더 행 수 + 합계 행 수
- **각 행**:
  - 깊이 가이드: depth만큼의 세로선 (`expandIndentGuideLineClass`) 반복 렌더링
  - 토글 버튼: `IconChevronDown` + `transition-transform`
    - 확장 시: `rotate-0`
    - 접힘 시: `-rotate-90`
    - 자식 없는 항목: 같은 크기의 빈 div (레이아웃 유지)
- **마지막 고정 판정**: 일반 고정 컬럼이 없으면 확장 컬럼이 마지막 고정 컬럼이 됨

### 선택 컬럼 UI

**Multi 모드** (`selectMode="multi"`):

- 헤더: 전체 선택 CheckBox
- 각 행: 개별 CheckBox
- 선택 불가 항목 (`getItemSelectableFn`이 `false` 반환): `disabled` 처리
- 선택 불가 사유 (`getItemSelectableFn`이 `string` 반환): `disabled` + tooltip에 사유 표시
- Shift+Click: 범위 선택 (마지막 클릭 행 ~ 현재 클릭 행)

**Single 모드** (`selectMode="single"`):

- 화살표 아이콘 표시
- 선택 시 primary 테마, 미선택 시 base 테마
- 선택 불가 항목: 아이콘 숨김

## 9. 키보드 네비게이션

셀 내부의 focusable 요소에 포커스가 있는 상태에서 행 간 이동을 지원합니다.

```tsx
// #region Keyboard Navigation
function onTableKeyDown(e: KeyboardEvent): void {
  if (e.key !== "Enter" || e.altKey || e.ctrlKey || e.metaKey) return;

  // 현재 포커스된 요소 → 소속 td → 소속 tr → tbody 내 행 인덱스
  // Shift+Enter: 위 행, Enter: 아래 행
  // 대상 행의 같은 셀 인덱스에서 findFirstFocusableChild()로 포커스 이동
}
```

| 키          | 동작                                      |
| ----------- | ----------------------------------------- |
| Enter       | 아래 행의 같은 열로 이동 (focusable 요소) |
| Shift+Enter | 위 행의 같은 열로 이동 (focusable 요소)   |

## 10. 행 호버 효과

CSS box-shadow를 사용하여 행 호버 시 시각적 피드백을 제공합니다.
`Sheet.css`에서 정의합니다.

```css
[data-sheet] tbody tr:hover > td {
  box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.03);
}

.dark [data-sheet] tbody tr:hover > td {
  box-shadow: inset 0 0 0 9999px rgba(255, 255, 255, 0.04);
}
```

## 11. 컬럼 리사이징

### 드래그 리사이즈

```tsx
// #region Resizing
function onResizerMousedown(event: MouseEvent, colKey: string): void {
  event.preventDefault();
  const th = (event.target as HTMLElement).closest("th")!;
  const container = th.closest("[data-sheet]")!.querySelector("[data-sheet-scroll]") as HTMLElement;
  const startX = event.clientX;
  const startWidth = th.offsetWidth;

  // 인디케이터 위치: getBoundingClientRect 기준 + container scrollLeft 보정
  const containerRect = container.getBoundingClientRect();
  setResizeIndicatorStyle({
    display: "block",
    left: `${th.getBoundingClientRect().right - containerRect.left + container.scrollLeft}px`,
    top: "0",
    height: `${container.scrollHeight}px`,
  });

  // mousemove: 인디케이터 위치 갱신
  // mouseup: delta !== 0일 때만 너비 저장 (더블클릭 보호), 최소 30px
}
```

- 더블클릭: 저장된 너비 제거 (원본 너비로 복원)
- `delta !== 0` 체크: mousedown → mouseup 사이에 이동이 없으면 더블클릭으로 간주하여 저장 안 함

## 12. 선택 로직

### 기본 선택

```tsx
// #region Selection
const [selectedItems, setSelectedItems] = createPropSignal({
  value: () => local.selectedItems ?? [],
  onChange: () => local.onSelectedItemsChange,
});

function toggleSelect(item: T): void {
  if (local.selectMode === "single") {
    const isSelected = selectedItems().includes(item);
    setSelectedItems(isSelected ? [] : [item]);
  } else {
    const isSelected = selectedItems().includes(item);
    setSelectedItems(isSelected ? selectedItems().filter((i) => i !== item) : [...selectedItems(), item]);
  }
}

function toggleSelectAll(): void {
  const selectableItems = displayItems()
    .map((flat) => flat.item)
    .filter((item) => getItemSelectable(item) === true);
  const isAllSelected = selectableItems.every((item) => selectedItems().includes(item));
  setSelectedItems(isAllSelected ? [] : selectableItems);
}
```

### Shift+Click 범위 선택

마지막으로 클릭한 행(lastClickedRow)과 현재 클릭한 행 사이의 범위를 일괄 선택/해제합니다.

```tsx
const [lastClickedRow, setLastClickedRow] = createSignal<number | null>(null);

function rangeSelect(targetRow: number): void {
  const lastRow = lastClickedRow();
  if (lastRow == null) return;

  const start = Math.min(lastRow, targetRow);
  const end = Math.max(lastRow, targetRow);

  // 기준 행(마지막 클릭 행)의 선택 상태를 따름
  const baseItem = displayItems()[lastRow]?.item;
  const shouldSelect = baseItem != null && !selectedItems().includes(baseItem);

  const rangeItems = displayItems()
    .slice(start, end + 1)
    .map((flat) => flat.item)
    .filter((item) => getItemSelectable(item) === true);

  if (shouldSelect) {
    const newItems = [...selectedItems()];
    for (const item of rangeItems) {
      if (!newItems.includes(item)) newItems.push(item);
    }
    setSelectedItems(newItems);
  } else {
    setSelectedItems(selectedItems().filter((item) => !rangeItems.includes(item)));
  }
}
```

### autoSelect (자동 선택)

```tsx
// #region AutoSelect

// autoSelect="click": 행 클릭 시 자동 선택
// autoSelect="focus": 셀 내 요소에 포커스 시 자동 선택 (onFocusCapture로 감지)

function selectItem(item: T): void {
  if (getItemSelectable(item) !== true) return;
  if (local.selectMode === "single") {
    setSelectedItems([item]);
  } else {
    if (!selectedItems().includes(item)) {
      setSelectedItems([...selectedItems(), item]);
    }
  }
}
```

### 선택 행 인디케이터

선택된 행을 CSS로 시각화합니다. 행 호버 효과와 동일한 box-shadow 패턴을 사용합니다.

## 13. 설정 모달 (SheetConfigModal)

Sheet.tsx 내 같은 파일에 정의하여 순환 의존성을 방지합니다.
내부적으로 Sheet를 사용하지 않고 단순 Table로 구현합니다.

### ConfigModal 사용 흐름

```tsx
const { show } = useModal();

async function openConfigModal(): Promise<void> {
  const result = await show<SheetConfig>(SheetConfigModal, {
    title: "시트 설정",
    useCloseByBackdrop: true,
  });
  if (result) {
    setConfig(result);
  }
}
```

### SheetConfigModal 컴포넌트

```tsx
const SheetConfigModal: Component<ModalContentProps<SheetConfig>> = (props) => {
  // 현재 config와 columnDefs를 기반으로
  // 고정/순서/너비/숨김을 편집하는 UI
  // collapse인 컬럼은 설정 모달에 표시하지 않음
  // OK → props.close(newConfig)
  // Cancel → props.close(undefined)
  // Reset → confirm 확인 후 props.close({ columnRecord: {} })
};
```

### Config 적용 (Plan 7에서 확장)

현재는 width만 적용하지만, 설정 모달 구현 시 `effectiveColumns`를 확장하여 fixed, displayOrder, hidden도 적용합니다.

```tsx
const effectiveColumns = createMemo(() => {
  const cols = columnDefs();
  const record = config().columnRecord ?? {};
  return cols
    .map((col) => {
      const saved = record[col.key];
      if (saved == null) return col;
      return {
        ...col,
        fixed: saved.fixed ?? col.fixed,
        hidden: saved.hidden ?? col.hidden,
        width: saved.width ?? col.width,
      };
    })
    .sort((a, b) => {
      const orderA = record[a.key]?.displayOrder ?? Infinity;
      const orderB = record[b.key]?.displayOrder ?? Infinity;
      return orderA - orderB;
    });
});
```

## 14. 스타일링

Tailwind CSS로 구현합니다. `Sheet.styles.ts`에 스타일 상수를 정의합니다.
행 호버 효과는 `Sheet.css`에서 CSS로 처리합니다.

### z-index 계층 (인라인 z-[N] 클래스)

| 레벨                | 대상                    | z-index |
| ------------------- | ----------------------- | ------- |
| 고정 컬럼 (tbody)   | td[sticky]              | `z-[2]` |
| 헤더 (thead)        | th[비고정]              | `z-[3]` |
| 헤더 고정 (thead)   | th[고정] + 기능 컬럼 th | `z-[5]` |
| 리사이즈 인디케이터 | div                     | `z-[7]` |

### 주요 스타일 클래스

```tsx
// Sheet.styles.ts

export const sheetContainerClass = clsx("relative", "bg-white dark:bg-base-950", "overflow-auto");

export const tableClass = clsx("border-separate border-spacing-0", "w-max");

export const thClass = clsx(
  "relative",
  "bg-base-100 dark:bg-base-900",
  "border-b border-r border-base-300 dark:border-base-800",
  "overflow-hidden whitespace-nowrap",
  "p-0",
  "text-left font-semibold",
  "align-middle",
);

export const thContentClass = clsx("px-2 py-1");

export const tdClass = clsx(
  "bg-white dark:bg-base-950",
  "border-b border-r border-base-200 dark:border-base-800",
  "truncate",
  "p-0",
  "align-top",
);

export const summaryThClass = clsx("bg-warning-50 dark:bg-warning-900/20");

export const insetContainerClass = clsx("border-none", "rounded-none");
export const defaultContainerClass = clsx("border border-base-300 dark:border-base-700", "rounded");

export const sortableThClass = clsx("cursor-pointer", "hover:underline");
export const sortIconClass = clsx("px-1 py-0.5", "bg-base-100 dark:bg-base-900");

export const toolbarClass = clsx(
  "flex items-center gap-2",
  "px-2 py-1",
  "bg-base-50 dark:bg-base-900",
  "border-b border-base-300 dark:border-base-700",
);

export const fixedClass = "sticky";
export const fixedLastClass = clsx("border-r-2 border-r-base-300", "dark:border-r-base-700");

export const resizerClass = clsx(
  "absolute inset-y-0 right-0",
  "w-1",
  "cursor-ew-resize",
  "hover:bg-primary-300 dark:hover:bg-primary-600",
);

export const resizeIndicatorClass = clsx(
  "absolute inset-y-0",
  "w-0 border-l-2 border-dashed border-primary-500",
  "pointer-events-none",
  "z-[7]",
);

// 기능 컬럼 (확장/선택 공통)
export const featureThClass = clsx(
  "bg-base-100 dark:bg-base-800",
  "border-b border-r border-base-300 dark:border-base-700",
  "p-0",
  "align-middle",
);

export const featureTdClass = clsx(
  "bg-base-50 dark:bg-base-900",
  "border-b border-r border-base-200 dark:border-base-800",
  "p-0",
  "align-middle",
  "h-px",
);

// 확장 컬럼 깊이 가이드 — 래퍼
export const expandIndentGuideClass = clsx("mr-0.5 w-3 self-stretch", "flex justify-end");

// 확장 컬럼 깊이 가이드 — 세로선
export const expandIndentGuideLineClass = clsx("w-0 self-stretch", "border-r border-base-300 dark:border-base-700");

// 확장 토글 버튼
export const expandToggleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-pointer",
  "rounded",
  "hover:bg-base-200 dark:hover:bg-base-600",
);
```

## 15. 파일 구조

```
packages/solid/src/components/data/sheet/
├── Sheet.tsx                # 메인 컴포넌트
│                            # (#region: Column Collection, Config,
│                            #  Header, Sorting, Paging,
│                            #  Feature Column Setup, ColumnFixing,
│                            #  Resizing, HeaderSticky,
│                            #  Expanding, Keyboard Navigation,
│                            #  Display)
│                            # Plan 6 추가: Selection, AutoSelect
│                            # Plan 7 추가: SheetConfigModal
├── Sheet.css                # 행 호버 효과 (box-shadow)
├── Sheet.styles.ts          # Tailwind 스타일 상수
├── SheetColumn.tsx          # Column compound component (plain object 반환, DOM 없음)
│                            # + isSheetColumnDef 타입 가드
├── sheetUtils.ts            # 순수 계산 함수
│                            # (normalizeHeader, buildHeaderTable,
│                            #  flattenTree, collectAllExpandable,
│                            #  applySorting)
└── types.ts                 # 모든 타입/인터페이스 정의
```

## 16. 활용하는 기존 유틸리티

| 유틸리티                       | 패키지                              | 용도                                  |
| ------------------------------ | ----------------------------------- | ------------------------------------- |
| `createPropSignal`             | `solid/utils`                       | sorts, selectedItems 등 양방향 바인딩 |
| `usePersisted`                 | `solid/contexts`                    | 시트 설정 localStorage 저장           |
| `useModal` (show)              | `solid/disclosure`                  | ConfigModal 표시                      |
| `Pagination`                   | `solid/data`                        | 페이지네이션 UI                       |
| `CheckBox`                     | `solid/form-control`                | 다중 선택 체크박스                    |
| `Icon`                         | `solid/display`                     | 정렬/확장 아이콘                      |
| `createResizeObserver`         | `@solid-primitives/resize-observer` | 고정 컬럼/헤더 너비 추적              |
| `.orderBy()`, `.orderByDesc()` | `core-common/extensions`            | 배열 확장 메서드                      |
| `objGetChainValue`             | `core-common`                       | 점 표기법 정렬 키 접근                |
| `findFirstFocusableChild`      | `core-browser/extensions`           | 셀 간 포커스 이동                     |

## 17. 검증

### 타입체크 + 린트

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

### 데모 페이지

`solid-demo`에 SheetPage 추가:

- 기본 테이블 (정적 컬럼)
- 다단계 헤더 + 합계 행
- 정렬 + 페이징
- 고정 컬럼 + 리사이징
- 트리 확장
- 인라인 편집 (form-control 직접 렌더링)
- 단일/다중 선택 + autoSelect + 선택 불가
- 설정 모달

### 브라우저 테스트

Playwright MCP로 데모 페이지를 열어 수동 검증:

1. 컬럼 리사이징 (드래그 중 점선 인디케이터 + 더블클릭 초기화)
2. 정렬 (클릭/Shift+Click)
3. 키보드 네비게이션 (Enter/Shift+Enter)
4. 행 호버 시각 효과
5. 고정 컬럼이 스크롤 시 sticky 유지 + 경계 테두리
6. 설정 모달에서 컬럼 순서/너비/고정/숨김 변경 후 저장/복원
7. 기능 컬럼 (선택 체크박스, 확장 아이콘, Shift+Click 범위 선택)

## 18. 구현 계획 (Plan 분할)

7개의 Plan으로 나누어 단계적으로 구현합니다.
각 Plan은 코드 작성 + 테스트/데모 + 수동 검증을 포함하는 완전한 작업 단위입니다.

### 의존 관계

```
Plan 1 (기반) ✅
  ├→ Plan 2 (정렬+페이징) ✅
  ├→ Plan 3 (고정+리사이징) ✅
  └→ Plan 4 (트리) ✅ → Plan 5 (키보드+호버) ✅ → Plan 6 (선택) → Plan 7 (복사+설정)
```

### Plan 1: 기반 구조 + 기본 테이블 렌더링 ✅

- `types.ts` — 모든 타입/인터페이스 정의
- `sheetUtils.ts` — `buildHeaderTable`, `normalizeHeader`
- `SheetColumn.tsx` — Plain object 반환 패턴 + `isSheetColumnDef` 타입 가드
- `Sheet.styles.ts` — Tailwind 스타일 상수
- `Sheet.tsx` — 기본 테이블 (children() 수집 → 다단계 헤더 → 바디 → 합계 행)
- `index.ts` export 추가
- **단위 테스트**: `buildHeaderTable`, `normalizeHeader`
- **데모**: 기본 테이블 + 다단계 헤더 + 합계 행

### Plan 2: 정렬 + 페이지네이션 ✅

- `sheetUtils.ts` — `applySorting` 추가
- `Sheet.tsx` — `#region Sorting`, `#region Paging`, 툴바에 Pagination
- **단위 테스트**: `applySorting`
- **데모**: 정렬(클릭/Shift+Click) + 페이징 예제

### Plan 3: 컬럼 고정 + 리사이징 ✅

- `Sheet.tsx` — `#region ColumnFixing`, `#region Resizing`, `#region HeaderSticky`
- ResizeObserver 연동, `featureColTotalWidth` 기반 sticky left 계산
- 다단계 헤더 각 행의 누적 top 계산 (headerRowTops, summaryRowTop)
- 드래그 리사이즈 + getBoundingClientRect 기반 인디케이터 + 더블클릭 초기화
- **데모**: 고정 컬럼 + 리사이징 예제

### Plan 4: 트리 확장 + 확장 기능 컬럼 ✅

- `sheetUtils.ts` — `flattenTree`, `collectAllExpandable` 추가
- `Sheet.tsx` — `#region Expanding`, `#region Feature Column Setup`
- 확장 기능 컬럼 UI: `IconChevronDown` + 세로선 깊이 가이드 + 전체 토글
- **단위 테스트**: `flattenTree`
- **데모**: 트리 구조 데이터 펼침/접기

### Plan 5: 키보드 네비게이션 + 행 호버 ✅

- `findFirstFocusableChild` 구현 (`core-browser`)
- `Sheet.tsx` — `#region Keyboard Navigation`
- `Sheet.css` — 행 호버 효과 (box-shadow)
- Enter/Shift+Enter로 같은 열의 다음/이전 행 focusable 요소로 이동
- **데모**: 인라인 편집 예제 (form-control 직접 렌더링)

### Plan 6: 행 선택 + 선택 기능 컬럼

- `Sheet.tsx` — `#region Selection`, `#region AutoSelect`, 선택 기능 컬럼 UI
- 선택 기능 컬럼의 너비를 `featureColTotalWidth`에 추가
- 단일/다중 선택, Shift+Click 범위 선택 (`lastClickedRow` signal 활용), 전체 선택 체크박스
- `autoSelect="click"` + `autoSelect="focus"` (onFocusCapture로 셀 내 요소 포커스 감지)
- 선택 행 시각 효과 (CSS box-shadow 또는 클래스 기반)
- CheckBox는 표시용 (`pointer-events-none`), 감싸는 요소에서 onClick으로 shiftKey 감지
- `getItemSelectableFn` (비활성 + tooltip)
- **데모**: 단일/다중 선택 + autoSelect + 선택 불가 예제
- **수동 검증**: 체크박스, Shift+범위 선택, 선택 행 시각 효과

### Plan 7: 설정 모달

- `SheetConfigModal` — 컬럼 순서/너비/고정/숨김 편집 UI (Sheet.tsx 내 정의)
- `effectiveColumns` 확장: width뿐 아니라 fixed, displayOrder, hidden도 config에서 적용
- 설정 바 (`key` prop + `hideConfigBar`) — 설정 버튼 추가
- **데모**: 설정 모달 예제
- **수동 검증**: 설정 변경 후 저장/복원, 리셋
