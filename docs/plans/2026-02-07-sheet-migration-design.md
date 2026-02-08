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
- 셀 편집 모드 (Excel 스타일 키보드 네비게이션)
- 포커스/선택 인디케이터 (overlay div, 고정 컬럼 대응)
- 설정 모달 (컬럼 순서/너비/고정/숨김 저장)
- 복사/붙여넣기 (Ctrl+C/V)

## 1. 컴포넌트 구조 및 API

Compound Component 패턴으로 구성합니다.

### 기본 사용

```tsx
<Sheet items={items()} key="users">
  <Sheet.Column key="name" header={["기본정보", "이름"]} fixed>
    {(ctx) => <div class="p-1">{ctx.item.name}</div>}
  </Sheet.Column>
  <Sheet.Column key="age" header="나이" width="80px">
    {(ctx) =>
      ctx.edit
        ? <TextField value={ctx.item.age} inset />
        : <div class="p-1">{ctx.item.age}</div>
    }
  </Sheet.Column>
</Sheet>
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
  currentPage={page()}
  onCurrentPageChange={setPage}
  itemsPerPage={20}
>
  <Sheet.Column key="name" header="이름">
    {(ctx) => <div class="p-1">{ctx.item.name}</div>}
  </Sheet.Column>
</Sheet>
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
  focusMode?: "row" | "cell";

  // 정렬
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  useAutoSort?: boolean;

  // 페이지네이션
  currentPage?: number;
  onCurrentPageChange?: (page: number) => void;
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

  // 이벤트
  onItemKeydown?: (param: SheetItemKeydownParam<T>) => void;
  onCellKeydown?: (param: SheetItemKeydownParam<T>) => void;

  // 기타
  class?: string;
  children: JSX.Element;
}
```

### SheetColumnProps

```tsx
interface SheetColumnProps<T> {
  key: string;
  header?: string | string[];              // string이면 단일, string[]이면 다단계
  headerContent?: () => JSX.Element;       // 커스텀 헤더 렌더러
  headerStyle?: string;
  summary?: () => JSX.Element;             // 요약 행 렌더러
  tooltip?: string;
  fixed?: boolean;
  hidden?: boolean;
  collapse?: boolean;
  width?: string;
  disableSorting?: boolean;
  disableResizing?: boolean;
  children: (ctx: SheetCellContext<T>) => JSX.Element;   // 셀 렌더러
}
```

### SheetCellContext

```tsx
interface SheetCellContext<T> {
  item: T;
  index: number;
  depth: number;
  edit: boolean;
}
```

### 기타 타입

```tsx
interface SortingDef {
  key: string;
  desc: boolean;
}

interface SheetItemKeydownParam<T> {
  item: T;
  key?: string;        // 컬럼 키 (cellKeydown에서만)
  event: KeyboardEvent;
}

interface SheetConfig {
  columnRecord?: Record<string, SheetConfigColumn>;
}

interface SheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}
```

## 3. Context 구조

### SheetContext (컬럼 등록용)

```tsx
interface SheetColumnDef<T> {
  key: string;
  header: string[];                        // 항상 배열로 정규화
  headerContent?: () => JSX.Element;
  headerStyle?: string;
  summary?: () => JSX.Element;
  tooltip?: string;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
  disableSorting: boolean;
  disableResizing: boolean;
  cell: (ctx: SheetCellContext<T>) => JSX.Element;
}

interface SheetContextValue<T> {
  registerColumn: (def: SheetColumnDef<T>) => void;
  unregisterColumn: (key: string) => void;
}

const SheetContext = createContext<SheetContextValue<unknown>>();
```

### Column 등록 흐름

```tsx
// SheetColumn 내부
const ctx = useSheetContext();

onMount(() => {
  ctx.registerColumn({
    key: props.key,
    header: normalizeHeader(props.header),
    cell: props.children,
    fixed: props.fixed ?? false,
    // ...
  });
});

onCleanup(() => {
  ctx.unregisterColumn(props.key);
});

// props 변경 감지
createEffect(() => {
  ctx.registerColumn({
    key: props.key,
    header: normalizeHeader(props.header),
    // ... 최신 props 반영
  });
});

return null;  // DOM 렌더링 없음
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

```tsx
// #region Sorting
const [sorts, setSorts] = createPropSignal({
  value: () => props.sorts ?? [],
  onChange: () => props.onSortsChange,
});

const sortedItems = createMemo(() => {
  if (!props.useAutoSort) return props.items ?? [];
  return applySorting(props.items ?? [], sorts());
});

// #region Paging
const [currentPage, setCurrentPage] = createPropSignal({
  value: () => props.currentPage ?? 0,
  onChange: () => props.onCurrentPageChange,
});

const effectivePageCount = createMemo(() => { ... });
const pagedItems = createMemo(() => { ... });

// #region Expanding
const [expandedItems, setExpandedItems] = createPropSignal({
  value: () => props.expandedItems ?? [],
  onChange: () => props.onExpandedItemsChange,
});

const flatItems = createMemo(() => {
  return flattenTree(pagedItems(), expandedItems(), props.getChildrenFn, ...);
});

// #region Selection
const [selectedItems, setSelectedItems] = createPropSignal({
  value: () => props.selectedItems ?? [],
  onChange: () => props.onSelectedItemsChange,
});
```

### 선택 로직

```tsx
// #region Selection (계속)

function toggleSelect(item: T): void {
  if (props.selectMode === "single") {
    const isSelected = selectedItems().includes(item);
    setSelectedItems(isSelected ? [] : [item]);
  } else {
    const isSelected = selectedItems().includes(item);
    setSelectedItems(
      isSelected
        ? selectedItems().filter((i) => i !== item)
        : [...selectedItems(), item],
    );
  }
}

function toggleSelectAll(): void {
  const selectableItems = displayItems()
    .filter((item) => getItemSelectable(item) === true);
  const isAllSelected = selectableItems.every((item) => selectedItems().includes(item));
  setSelectedItems(isAllSelected ? [] : selectableItems);
}

// Shift+Click 범위 선택: 포커스 행 ~ 클릭 행 범위 일괄 선택/해제
function rangeSelect(targetRow: number): void {
  const focusRow = focusedAddr()?.r;
  if (focusRow == null) return;

  const start = Math.min(focusRow, targetRow);
  const end = Math.max(focusRow, targetRow);

  // 기준 행(포커스 행)의 선택 상태를 따름
  const baseItem = displayItems()[focusRow];
  const shouldSelect = !selectedItems().includes(baseItem);

  const rangeItems = displayItems()
    .slice(start, end + 1)
    .filter((item) => getItemSelectable(item) === true);

  if (shouldSelect) {
    const newItems = [...selectedItems()];
    for (const item of rangeItems) {
      if (!newItems.includes(item)) newItems.push(item);
    }
    setSelectedItems(newItems);
  } else {
    setSelectedItems(
      selectedItems().filter((item) => !rangeItems.includes(item)),
    );
  }
}

// getItemSelectableFn: true면 선택 가능, false면 불가, string이면 불가 + 사유 tooltip
function getItemSelectable(item: T): boolean | string {
  if (!props.getItemSelectableFn) return true;
  return props.getItemSelectableFn(item);
}
```

### autoSelect (자동 선택)

```tsx
// #region AutoSelect

// autoSelect="click": 행 클릭 시 자동 선택
// autoSelect="focus": 셀 포커스 시 자동 선택

function onRowClick(item: T): void {
  if (props.autoSelect === "click") {
    selectItem(item);
  }
}

function onCellFocus(item: T): void {
  if (props.autoSelect === "focus") {
    selectItem(item);
  }
}

function selectItem(item: T): void {
  if (getItemSelectable(item) !== true) return;
  if (props.selectMode === "single") {
    setSelectedItems([item]);
  } else {
    if (!selectedItems().includes(item)) {
      setSelectedItems([...selectedItems(), item]);
    }
  }
}
```

### 컬럼 상태

```tsx
// Context 기반 등록된 컬럼 정의
const [registeredColumns, setRegisteredColumns] = createSignal<SheetColumnDef<T>[]>([]);

// usePersisted로 저장된 설정
const [config, setConfig] = usePersisted<SheetConfig>(
  `sheet.${props.key}`,
  { columnRecord: {} },
);

// 설정이 적용된 최종 컬럼 정의 (정렬, 고정, 숨김, 너비 반영)
const effectiveColumns = createMemo(() => {
  return applyConfig(registeredColumns(), config());
});
```

## 5. 레이아웃 엔진 (순수 함수, sheetUtils.ts로 분리)

### buildHeaderTable

다단계 헤더를 2D 배열로 변환하고 colspan/rowspan을 계산합니다.

```tsx
// 입력
columns: [
  { key: "name", header: ["기본", "이름"] },
  { key: "age",  header: ["기본", "나이"] },
  { key: "email", header: ["연락처"] },
]

// 출력: HeaderDef[][]
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
  colIndex?: number;      // isLastRow일 때만 — effectiveColumns 인덱스
  fixed?: boolean;
  width?: string;
  style?: string;
}

function buildHeaderTable(columns: SheetColumnDef[]): (HeaderDef | null)[][] { ... }
```

### 합계 행 (Summary Row)

합계 행은 `<thead>` 내부에 배치하여 스크롤 시 상단에 고정(sticky)됩니다.
하나 이상의 컬럼에 `summary`가 정의되어 있으면 표시됩니다.

기능 컬럼(선택/확장)의 `th`는 전체 헤더 행 수 + 합계 행을 합친 rowspan을 가집니다.

### applySorting

```tsx
function applySorting<T>(items: T[], sorts: SortingDef[]): T[] {
  // sorts를 역순으로 적용 (안정 정렬)
  let result = [...items];
  for (const sort of [...sorts].reverse()) {
    result = result.orderBy(
      (item) => ObjectUtils.getChainValue(item, sort.key),
      sort.desc ? "desc" : "asc",
    );
  }
  return result;
}
```

### flattenTree

visible(부모가 모두 확장된) 항목만 반환합니다. 접힌 하위 항목은 결과에 포함하지 않습니다.

```tsx
interface FlatItem<T> {
  item: T;
  depth: number;
  hasChildren: boolean;
  parent?: T;
}

function flattenTree<T>(
  items: T[],
  expandedItems: T[],
  getChildrenFn?: (item: T, index: number) => T[] | undefined,
  sortFn?: (items: T[]) => T[],
): FlatItem<T>[] {
  // BFS로 트리 순회
  // 부모가 expandedItems에 포함된 경우에만 자식을 결과에 추가
  // 접힌 항목의 자식은 건너뜀 (DOM에 렌더링하지 않음)
}
```

## 6. 컬럼 고정 (Sticky)

ResizeObserver로 고정 컬럼의 너비를 추적하고 `left` 값을 계산합니다.

```tsx
// #region Column Fixing

// 각 컬럼의 측정된 너비
const [columnWidths, setColumnWidths] = createSignal<Map<number, number>>(new Map());

// 고정 컬럼의 left 위치 계산
const fixedLeftMap = createMemo(() => {
  const map = new Map<number, number>();
  const fixedCount = effectiveColumns().filter((c) => c.fixed).length;
  // feature 컬럼 (-2: 선택, -1: 확장) 포함
  let left = 0;
  for (let c = featureStartIndex; c < fixedCount; c++) {
    map.set(c, left);
    left += columnWidths().get(c) ?? 0;
  }
  return map;
});
```

너비 측정에는 `@solid-primitives/resize-observer`의 `createResizeObserver`를 사용합니다.
각 고정 컬럼의 마지막 depth 헤더 셀에 observer를 등록합니다.

### 고정/비고정 경계 시각 효과

고정 컬럼의 마지막 셀과 비고정 첫 셀 사이에 더 진한 테두리를 표시합니다.
`th`와 `td` 모두에 적용됩니다.

```tsx
// 고정 컬럼의 마지막 셀에 적용
export const fixedLastClass = clsx(
  "border-r-2 border-r-base-400 dark:border-r-base-500",
);
```

## 7. 기능 컬럼 (Feature Columns)

`selectMode` 또는 `getChildrenFn`이 설정되면 자동으로 기능 컬럼이 추가됩니다.
기능 컬럼은 항상 고정(sticky)이며, 일반 컬럼보다 앞에 위치합니다.

### 컬럼 인덱스 규칙

- 선택 컬럼: `c = -2` (확장 컬럼도 있을 때) 또는 `c = -1` (선택 컬럼만 있을 때)
- 확장 컬럼: `c = -1`
- 일반 컬럼: `c = 0, 1, 2, ...`

### 선택 컬럼 UI

**Multi 모드** (`selectMode="multi"`):
- 헤더: 전체 선택 CheckBox
- 각 행: 개별 CheckBox
- 선택 불가 항목 (`getItemSelectableFn`이 `false` 반환): `disabled` 처리
- 선택 불가 사유 (`getItemSelectableFn`이 `string` 반환): `disabled` + tooltip에 사유 표시
- Shift+Click: 범위 선택 (포커스 행 ~ 클릭 행, 기준 행의 선택 상태를 따름)

**Single 모드** (`selectMode="single"`):
- 화살표 아이콘 (`tablerArrowRight`) 표시
- 선택 시 primary 테마, 미선택 시 base 테마
- 선택 불가 항목: 아이콘 숨김

### 확장 컬럼 UI

- 헤더: 전체 확장/접기 토글 아이콘
- 각 행: 캐럿 아이콘 (`tablerCaretRight`)
  - 확장 시: 90도 회전 + primary 색상
  - 접힘 시: 기본 상태
  - 자식 없는 항목: 아이콘 숨김
- 깊이 인디케이터: `margin-left: {depth * 1}em`으로 들여쓰기

## 8. 셀 편집 (CellAgent)

```tsx
// #region Cell Agent

const [editCellAddr, setEditCellAddr] = createSignal<{ r: number; c: number } | null>(null);

function getIsCellEditMode(r: number, c: number): boolean {
  const addr = editCellAddr();
  return addr != null && addr.r === r && addr.c === c;
}
```

### 키보드 네비게이션 (Excel 스타일)

#### 비편집 모드 (td에 포커스)

| 키 | 동작 |
|----|------|
| Arrow keys | 인접 셀로 이동 |
| Enter | 아래 셀로 이동 |
| Shift+Enter | 위 셀로 이동 |
| Tab | 오른쪽 셀로 이동 |
| Shift+Tab | 왼쪽 셀로 이동 |
| F2 | 편집 모드 진입 |
| 더블클릭 | 편집 모드 진입 |
| Ctrl+C | 셀 내용 복사 (text selection이 없을 때) |
| Ctrl+V | 셀에 붙여넣기 |

#### 편집 모드 (td 내부 요소에 포커스)

| 키 | 동작 |
|----|------|
| Escape | 편집 해제, td 자체에 포커스 복귀 |
| Enter | 편집 확정 + 아래 셀로 이동 |
| Shift+Enter | 편집 확정 + 위 셀로 이동 |
| Tab | 편집 확정 + 오른쪽 셀로 이동 |
| Shift+Tab | 편집 확정 + 왼쪽 셀로 이동 |
| Arrow keys | 셀 내 커서 이동 (기본 동작, 전파하지 않음) |

> 참고: Enter/Tab으로 셀 이동 시 이동 대상 셀에서도 편집 모드가 자동 진입됩니다.
> 블러 캡처에서 포커스가 같은 td 밖으로 나가면 편집 모드가 자동 종료됩니다.

### 셀 이동 로직

```tsx
function moveFocus(dr: number, dc: number): void {
  // 현재 포커스된 td에서 data-r, data-c 읽기
  // 새 좌표 계산 후 해당 td로 포커스 이동
  const targetTd = getCell(newR, newC);
  targetTd?.focus();
}

function getCell(r: number, c: number): HTMLTableCellElement | null {
  return containerRef()?.querySelector(`td[data-r="${r}"][data-c="${c}"]`) ?? null;
}
```

### 편집 모드 진입

```tsx
function enterEditMode(r: number, c: number): void {
  setEditCellAddr({ r, c });
  // 다음 틱에서 셀 내부의 첫 번째 포커스 가능 요소에 포커스
  requestAnimationFrame(() => {
    const td = getCell(r, c);
    if (td) {
      const focusable = findFirstFocusableChild(td);
      focusable?.focus();
    }
  });
}
```

## 9. 인디케이터

### 포커스 인디케이터 (overlay div)

```tsx
// #region Focus Indicator

const [focusedAddr, setFocusedAddr] = createSignal<{ r: number; c: number } | null>(null);
const [focusIndicatorStyle, setFocusIndicatorStyle] = createSignal<JSX.CSSProperties>({});
const [focusCellStyle, setFocusCellStyle] = createSignal<JSX.CSSProperties>({});

function redrawFocusIndicator(): void {
  const addr = focusedAddr();
  if (!addr) {
    setFocusIndicatorStyle({ display: "none" });
    return;
  }

  const td = getCell(addr.r, addr.c);
  const tr = td?.parentElement;
  if (!td || !tr) return;

  const container = containerRef()!;
  const isFixed = td.classList.contains("sticky");

  // 행 인디케이터: 전체 행 하이라이트
  setFocusIndicatorStyle({
    display: "block",
    top: `${tr.offsetTop}px`,
    left: `${container.scrollLeft}px`,
    width: `${container.clientWidth}px`,
    height: `${tr.offsetHeight}px`,
  });

  // 셀 인디케이터: 포커스된 셀 테두리
  // 고정 컬럼이면 sticky로 처리
  setFocusCellStyle({
    position: isFixed ? "sticky" : "absolute",
    top: `${td.offsetTop}px`,
    left: isFixed ? `${td.style.left || "0px"}` : `${td.offsetLeft}px`,
    width: `${td.offsetWidth}px`,
    height: `${td.offsetHeight}px`,
  });
}
```

#### 고정 영역 뒤 투명도 조절

비고정 셀의 포커스 인디케이터가 고정 헤더/컬럼 아래에 가려질 때 `opacity: 0.3`으로 조절합니다.
편집 모드(td 내부 요소에 포커스)일 때는 셀 인디케이터를 숨깁니다 (`display: none`).

#### focusMode에 따른 차이

- `"cell"` (기본): 행 인디케이터 + 셀 인디케이터 모두 표시
- `"row"`: 행 인디케이터만 표시 (셀 인디케이터 숨김)

#### 재그리기 트리거

- `onFocusCapture` → `setFocusedAddr` → `redrawFocusIndicator`
- `onBlurCapture` → `redrawFocusIndicator`
- `onScroll` (passive) → `requestAnimationFrame` → `redrawFocusIndicator`
- 테이블 리사이즈 시 → `redrawFocusIndicator`

JSX:
```tsx
<div class={styles.focusRowIndicator} style={focusIndicatorStyle()}>
  <div class={styles.focusCellIndicator} style={focusCellStyle()} />
</div>
```

### 선택 행 인디케이터 (overlay div)

```tsx
// #region Select Row Indicator

const selectRowIndicators = createMemo(() => {
  return selectedItems().map((item) => {
    const r = displayItems().indexOf(item);
    if (r < 0) return null;
    const tr = getRow(r);
    if (!tr) return null;
    return {
      top: tr.offsetTop,
      height: tr.offsetHeight,
    };
  }).filter(Boolean);
});
```

JSX:
```tsx
<div class={styles.selectRowIndicatorContainer}>
  <For each={selectRowIndicators()}>
    {(indicator) => (
      <div
        class={styles.selectRowIndicator}
        style={{
          top: `${indicator.top}px`,
          width: "100%",
          height: `${indicator.height}px`,
        }}
      />
    )}
  </For>
</div>
```

> 주의: selectRowIndicators는 DOM 측정(tr.offsetTop)에 의존하므로,
> 렌더링 후 `requestAnimationFrame`으로 갱신해야 합니다.
> `createEffect` + `requestAnimationFrame` 패턴을 사용합니다.

### 컬럼 리사이즈 인디케이터

드래그 중 세로 점선 인디케이터를 표시합니다.

```tsx
// #region Resize Indicator

const [resizeIndicatorStyle, setResizeIndicatorStyle] = createSignal<JSX.CSSProperties>({
  display: "none",
});

function onResizerMousedown(event: MouseEvent, colKey: string): void {
  const th = (event.target as HTMLElement).closest("th")!;
  const startX = event.clientX;
  const startWidth = th.offsetWidth;

  // 리사이즈 인디케이터 표시
  setResizeIndicatorStyle({
    display: "block",
    left: `${th.offsetLeft + startWidth}px`,
  });

  const onMouseMove = (e: MouseEvent) => {
    const newWidth = Math.max(5, startWidth + (e.clientX - startX));
    setResizeIndicatorStyle({
      display: "block",
      left: `${th.offsetLeft + newWidth}px`,
    });
  };

  const onMouseUp = (e: MouseEvent) => {
    const newWidth = Math.max(5, startWidth + (e.clientX - startX));
    saveColumnConfig(colKey, { width: `${newWidth}px` });
    setResizeIndicatorStyle({ display: "none" });
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

// 더블클릭: 너비 초기화
function onResizerDoubleClick(colKey: string): void {
  saveColumnConfig(colKey, { width: undefined });
}
```

JSX:
```tsx
<div class={styles.resizeIndicator} style={resizeIndicatorStyle()} />
```

## 10. 설정 모달 (SheetConfigModal)

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
  // 현재 config와 registeredColumns를 기반으로
  // 고정/순서/너비/숨김을 편집하는 UI
  // collapse인 컬럼은 설정 모달에 표시하지 않음
  // OK → props.close(newConfig)
  // Cancel → props.close(undefined)
  // Reset → confirm 확인 후 props.close({ columnRecord: {} })
};
```

## 11. 스타일링

Tailwind CSS로 구현합니다. `Sheet.styles.ts`에 스타일 상수를 정의합니다.

### z-index 계층

```tsx
const Z_INDEX = {
  fixed: 2,          // 고정 컬럼
  head: 3,           // thead
  headFixed: 4,      // thead 내 고정 컬럼
  selectIndicator: 5,
  focusIndicator: 6,
  resizeIndicator: 7,
};
```

### 주요 스타일 클래스

```tsx
// Sheet.styles.ts
import clsx from "clsx";

export const sheetContainerClass = clsx(
  "relative",
  "bg-white dark:bg-base-800",
  "rounded-b",
  "overflow-auto",
);

export const tableClass = clsx(
  "border-separate border-spacing-0",
  "table-fixed",
);

export const thClass = clsx(
  "relative",
  "bg-base-100 dark:bg-base-700",
  "border-r border-b border-base-300 dark:border-base-600",
  "whitespace-nowrap overflow-hidden",
  "p-0",
  "text-left font-semibold",
  "align-middle",
);

export const tdClass = clsx(
  "bg-white dark:bg-base-800",
  "border-r border-b border-base-200 dark:border-base-700",
  "whitespace-nowrap overflow-hidden",
  "p-0",
  "align-top",
);

export const featureCellClass = clsx(
  "bg-base-50 dark:bg-base-750",
  "px-1.5 py-1",
  "text-left",
);

export const fixedClass = "sticky left-0";

// 고정/비고정 경계 시각 효과
export const fixedLastClass = clsx(
  "border-r-2 border-r-base-400 dark:border-r-base-500",
);

export const focusRowIndicatorClass = clsx(
  "absolute pointer-events-none",
  "bg-base-500/10",
  "z-[6]",
);

export const focusCellIndicatorClass = clsx(
  "absolute",
  "border-2 border-primary-500",
  "rounded",
);

export const selectRowIndicatorClass = clsx(
  "absolute pointer-events-none",
  "bg-primary-500/10",
);

export const resizerClass = clsx(
  "absolute top-0 right-0 bottom-0",
  "w-0.5",
  "cursor-ew-resize",
);

// 드래그 중 세로 점선 인디케이터
export const resizeIndicatorClass = clsx(
  "absolute top-0 bottom-0",
  "w-0 border-l-2 border-dashed border-primary-500",
  "pointer-events-none",
  "z-[7]",
);

export const sortIconClass = clsx(
  "px-1 py-0.5",
  "bg-base-100 dark:bg-base-700",
);

// 합계 행
export const summaryRowClass = clsx(
  "bg-warning-50 dark:bg-warning-900/20",
);
```

### inset 모드

```tsx
export const insetClass = clsx(
  "border-none",
  "rounded-none",
);
```

## 12. 파일 구조

```
packages/solid/src/components/data/sheet/
├── Sheet.tsx                # 메인 컴포넌트 + SheetConfigModal
│                            # (#region: Sorting, Paging, Expanding,
│                            #  Selection, AutoSelect, CellAgent,
│                            #  ColumnFixing, Resizing,
│                            #  FocusIndicator, SelectRowIndicator,
│                            #  AutoScroll, ConfigModal)
├── Sheet.styles.ts          # Tailwind 스타일 상수
├── SheetColumn.tsx          # Column compound component (Context 등록, DOM 없음)
├── SheetContext.ts           # SheetContextValue, useSheetContext
├── sheetUtils.ts            # 순수 계산 함수
│                            # (buildHeaderTable, applySorting,
│                            #  flattenTree, normalizeHeader)
└── types.ts                 # 모든 타입/인터페이스 정의
```

## 13. 활용하는 기존 유틸리티

| 유틸리티 | 패키지 | 용도 |
|---------|--------|------|
| `createPropSignal` | `solid/utils` | sorts, selectedItems 등 양방향 바인딩 |
| `usePersisted` | `solid/contexts` | 시트 설정 localStorage 저장 |
| `mergeStyles` | `solid/utils` | 동적 셀 스타일 병합 |
| `useModal` (show) | `solid/disclosure` | ConfigModal 표시 |
| `Pagination` | `solid/data` | 페이지네이션 UI |
| `CheckBox` | `solid/form-control` | 다중 선택 체크박스 |
| `Icon` | `solid/display` | 정렬/확장 아이콘 |
| `createResizeObserver` | `@solid-primitives/resize-observer` | 고정 컬럼 너비 추적 |
| `.sum()`, `.orderBy()` 등 | `core-common/extensions` | 배열 확장 메서드 |
| `scrollIntoViewIfNeeded` | `core-browser/extensions` | 포커스 시 자동 스크롤 |
| `ObjectUtils.getChainValue` | `core-common` | 점 표기법 정렬 키 접근 |

## 14. 필요한 사전 작업

| 항목 | 설명 |
|------|------|
| `findFirstFocusableChild` 구현 | `core-browser/extensions/element-ext.ts`에 선언만 있고 미구현. 셀 편집 진입 시 필요 |

## 15. 검증

### 타입체크 + 린트

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

### 데모 페이지

`solid-demo`에 SheetPage 추가:
- 기본 테이블 (정적 컬럼)
- 정렬 + 페이징
- 다중 선택 + 트리 확장
- 셀 편집 모드
- 다단계 헤더
- 고정 컬럼
- 설정 모달

### 브라우저 테스트

Playwright MCP로 데모 페이지를 열어 수동 검증:
1. 컬럼 리사이징 (드래그 중 점선 인디케이터 + 더블클릭 초기화)
2. 정렬 (클릭/Shift+Click)
3. 셀 네비게이션 (Arrow, Enter, Shift+Enter, Tab, Shift+Tab)
4. 편집 모드 (F2, 더블클릭, Escape, Enter/Tab으로 셀 이동)
5. 포커스/선택 인디케이터가 스크롤 시 정상 동작
6. 고정 컬럼이 스크롤 시 sticky 유지 + 경계 테두리
7. 포커스 인디케이터가 고정 영역 뒤에서 opacity 조절
8. 설정 모달에서 컬럼 순서/너비/숨김 변경 후 저장/복원
9. 기능 컬럼 (선택 체크박스, 확장 아이콘, Shift+Click 범위 선택)
10. 복사/붙여넣기 (Ctrl+C/V)

## 16. 구현 계획 (Plan 분할)

7개의 독립적인 Plan으로 나누어 단계적으로 구현합니다.
각 Plan은 코드 작성 + 테스트/데모 + 수동 검증을 포함하는 완전한 작업 단위입니다.

### 의존 관계

```
Plan 1 (기반)
  ├→ Plan 2 (정렬+페이징)
  ├→ Plan 3 (고정+리사이징)
  └→ Plan 4 (트리) → Plan 5 (선택) → Plan 6 (셀 편집+포커스) → Plan 7 (복사+설정)
```

Plan 2, 3은 Plan 1 이후 순서 무관하게 진행 가능합니다.

### Plan 1: 기반 구조 + 기본 테이블 렌더링

- `types.ts` — 모든 타입/인터페이스 정의
- `sheetUtils.ts` — `buildHeaderTable`, `normalizeHeader`
- `SheetContext.ts` — 컬럼 등록 Context
- `SheetColumn.tsx` — Compound component (DOM 없음)
- `Sheet.styles.ts` — Tailwind 스타일 상수
- `Sheet.tsx` — 기본 테이블 (컬럼 등록 → 다단계 헤더 → 바디 → 합계 행)
- `index.ts` export 추가
- **단위 테스트**: `buildHeaderTable`, `normalizeHeader`
- **데모**: 기본 테이블 + 다단계 헤더 + 합계 행
- **수동 검증**: 렌더링 확인

### Plan 2: 정렬 + 페이지네이션

- `sheetUtils.ts` — `applySorting` 추가
- `Sheet.tsx` — `#region Sorting`, `#region Paging`
- **단위 테스트**: `applySorting`
- **데모**: 정렬(클릭/Shift+Click) + 페이징 예제
- **수동 검증**: 정렬 토글, 다중 정렬, 페이지 전환

### Plan 3: 컬럼 고정 + 리사이징

- `Sheet.tsx` — `#region ColumnFixing`, `#region Resizing`
- ResizeObserver 연동, sticky left 계산, 경계 테두리
- 드래그 리사이즈 + 세로 점선 인디케이터 + 더블클릭 초기화
- **데모**: 고정 컬럼 + 리사이징 예제
- **수동 검증**: 스크롤 시 sticky 유지, 드래그 인디케이터, 더블클릭 초기화

### Plan 4: 트리 확장 + 확장 기능 컬럼

- `sheetUtils.ts` — `flattenTree` 추가
- `Sheet.tsx` — `#region Expanding`, 확장 기능 컬럼 UI (캐럿 아이콘, 전체 토글)
- **단위 테스트**: `flattenTree`
- **데모**: 트리 구조 데이터 펼침/접기
- **수동 검증**: 깊이 인디케이터, 아이콘 회전, 전체 확장/접기

### Plan 5: 행 선택 + 선택 기능 컬럼

- `Sheet.tsx` — `#region Selection`, `#region AutoSelect`, 선택 기능 컬럼 UI
- 단일/다중 선택, Shift+Click 범위 선택, 전체 선택 체크박스
- 선택 행 인디케이터 (overlay)
- `getItemSelectableFn` (비활성 + tooltip)
- **데모**: 단일/다중 선택 + autoSelect 예제
- **수동 검증**: 체크박스, Shift+범위 선택, 인디케이터

### Plan 6: 셀 편집 + 포커스 인디케이터

- `findFirstFocusableChild` 구현 (`core-browser`)
- `Sheet.tsx` — `#region CellAgent`, `#region FocusIndicator`, `#region AutoScroll`
- Excel 스타일 키보드 네비게이션 (Arrow, Enter, Tab, F2, Escape)
- 포커스 인디케이터 (행 + 셀, 고정 컬럼 대응, opacity 조절)
- `focusMode` ("row" / "cell")
- **데모**: 셀 편집 모드 예제
- **수동 검증**: 키보드 네비게이션, 편집 진입/해제, 인디케이터 스크롤 추적

### Plan 7: 복사/붙여넣기 + 설정 모달

- `Sheet.tsx` — 복사/붙여넣기 (Ctrl+C/V)
- `SheetConfigModal` — 컬럼 순서/너비/고정/숨김 편집 UI
- `usePersisted` 연동 (localStorage 저장/복원)
- 설정 바 (`key` prop + `hideConfigBar`)
- **데모**: 설정 모달 예제
- **수동 검증**: 복사/붙여넣기, 설정 변경 후 저장/복원, 리셋
