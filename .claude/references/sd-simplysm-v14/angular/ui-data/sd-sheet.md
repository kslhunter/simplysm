# `SdSheet`

스프레드시트 컴포넌트. 정렬, 컬럼 고정, 리사이즈, 페이지네이션, 설정 저장을 지원한다.

```typescript
@Component({ selector: "sd-sheet" })
class SdSheet<T> {
  key = input<string>();
  items = input<T[]>([]);
  trackByFn = input<(item: T, index: number) => unknown>();
  selectMode = input<"single" | "multi">();
  getItemSelectableFn = input<(item: T) => boolean | string>();
  getChildrenFn = input<(item: T, index: number) => T[] | undefined>();
  useAutoSort = input(false, { transform: booleanAttribute });
  visiblePageCount = input(10);
  totalPageCount = input(0);
  itemsPerPage = input(0);
  inset = input(false, { transform: booleanAttribute });
  hideConfigBar = input(false, { transform: booleanAttribute });
  itemKeydown = output<SdSheetItemKeydownEventParam<T>>();
  cellKeydown = output<SdSheetCellKeydownEventParam<T>>();

  selectedItems = model<T[]>([]);
  expandedItems = model<T[]>([]);
  sorts = model<SortingDef[]>([]);
  currentPage = model(0);
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `key` | input | `string \| undefined` | `undefined` | 설정 저장 키 |
| `items` | input | `T[]` | `[]` | 표시할 항목 |
| `trackByFn` | input | `((item, index) => unknown) \| undefined` | `undefined` | 트랙킹 함수 |
| `selectMode` | input | `"single" \| "multi" \| undefined` | `undefined` | 선택 모드 |
| `getItemSelectableFn` | input | `((item) => boolean \| string) \| undefined` | `undefined` | 선택 가능 여부 함수. string은 비활성 사유 |
| `getChildrenFn` | input | `((item, index) => T[] \| undefined) \| undefined` | `undefined` | 트리 구조 자식 반환 함수 |
| `useAutoSort` | input | `boolean` | `false` | 클라이언트 측 자동 정렬 |
| `visiblePageCount` | input | `number` | `10` | 한 번에 표시할 페이지 수 |
| `totalPageCount` | input | `number` | `0` | 총 페이지 수 |
| `itemsPerPage` | input | `number` | `0` | 페이지당 항목 수 |
| `inset` | input | `boolean` | `false` | 삽입 스타일 |
| `hideConfigBar` | input | `boolean` | `false` | 설정 바 숨김 |
| `itemKeydown` | output | `SdSheetItemKeydownEventParam<T>` | - | 행 keydown 이벤트 |
| `cellKeydown` | output | `SdSheetCellKeydownEventParam<T>` | - | 셀 keydown 이벤트 |
| `selectedItems` | model | `T[]` | `[]` | 선택된 항목 (two-way) |
| `expandedItems` | model | `T[]` | `[]` | 확장된 항목 (two-way) |
| `sorts` | model | `SortingDef[]` | `[]` | 정렬 설정 (two-way) |
| `currentPage` | model | `number` | `0` | 현재 페이지 (two-way) |

> `SortingDef.key`는 `"vendor.name"` 같은 체인 경로일 수 있다. 정렬 처리 시 `obj.getChainValue(item, sort.key)` (from `@simplysm/core-common`)를 사용한다.

### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — items·sorts·currentPage·totalPageCount·trackByFn 기본 바인딩
- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — selectMode·selectedItems·mark 연동
- [crud-list.md §6 확장 B: 선택 기능 + 선택 삭제/복구](../recipes/crud-list.md#6-확장-b-선택-기능--선택-삭제복구) — selectMode="multi"·selectedItems 바인딩
- [crud-list.md §8 확장 D: 선택 모달 전환](../recipes/crud-list.md#8-확장-d-선택-모달-전환) — selectMode 조건부 적용
- [crud-detail.md §10 확장 F: 복합 상세](../recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 상세 폼 내부 하위 컬렉션 편집

## Related Types

### `SdSheetColumn`

시트 컬럼 정의 디렉티브.

```typescript
@Directive({ selector: "sd-sheet-column" })
class SdSheetColumn<T = unknown> {
  key = input.required<string>();
  header = input<string | string[]>("");
  headerStyle = input<string>();
  tooltip = input<string>();
  width = input<string>();
  fixed = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
  collapse = input(false, { transform: booleanAttribute });
  disableSorting = input(false, { transform: booleanAttribute });
  disableResizing = input(false, { transform: booleanAttribute });
  ordering = input(0);
}
```

Content children: `SdSheetColumnCellTemplate` (required), `#headerTpl`, `#summaryTpl`

#### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — key·header 기본 컬럼 정의
- [crud-list.md §7 확장 C: inline 삭제 열](../recipes/crud-list.md#7-확장-c-inline-삭제-열) — fixed·hidden·#headerTpl 커스텀 헤더
- [crud-detail.md §10 확장 F: 복합 상세](../recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 하위 컬렉션 컬럼 정의

### `SdSheetColumnCellTemplate`

시트 컬럼 셀 내용을 정의하는 디렉티브. `ng-template[cell]` 셀렉터.

```typescript
@Directive({ selector: "ng-template[cell]" })
class SdSheetColumnCellTemplate<T> {
  cell = input.required<T[]>();

  static ngTemplateContextGuard<TContextItem>(
    _dir: SdSheetColumnCellTemplate<TContextItem>,
    _ctx: unknown,
  ): _ctx is SdSheetCellContext<TContextItem>;
}
```

**셀 내용 작성 지침:**
- **일반 텍스트**: `<div class="p-xs-sm">` 로 감싸 기본 패딩 적용
- **컨트롤 삽입**: 반드시 `[inset]="true"` + `[size]="'sm'"` 지정

#### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — let-item 기본 셀 렌더링
- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — let-edit 조건부 편집 셀 (inset+sm 컨트롤)
- [crud-detail.md §10 확장 F: 복합 상세](../recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 상세 폼 내부 하위 컬렉션 셀

### `SdSheetCellContext`

```typescript
interface SdSheetCellContext<T = unknown> {
  $implicit: T;
  item: T;
  index: number;
  depth: number;
  edit: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$implicit` | `T` | 현재 항목 (let-item으로 접근) |
| `item` | `T` | 현재 항목 |
| `index` | `number` | 행 인덱스 |
| `depth` | `number` | 트리 깊이 |
| `edit` | `boolean` | 편집 모드 여부 |

### `SdSheetConfigModal`

```typescript
@Component({ selector: "sd-sheet-config-modal" })
class SdSheetConfigModal implements SdModalContentDef<SdSheetConfig> {
  controls = input.required<readonly SdSheetColumn[]>();
  config = input.required<SdSheetConfig | undefined>();
  close = output<SdSheetConfig>();
  initialized = signal(true);
}
```

### `SdSheetColumnDef`

```typescript
interface SdSheetColumnDef {
  key: string;
  header: string | string[];
  headerStyle: string | undefined;
  tooltip: string | undefined;
  width: string | undefined;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  disableSorting: boolean;
  disableResizing: boolean;
  ordering: number;
}
```

### `SdSheetConfig`

```typescript
interface SdSheetConfig {
  columnRecord: Record<string, {
    width?: string;
    hidden?: boolean;
    fixed?: boolean;
    ordering?: number;
  }>;
}
```

### `SdSheetHeaderDef`

```typescript
interface SdSheetHeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colDef: SdSheetColumnDef | undefined;
}
```

### `SdSheetItemKeydownEventParam`

```typescript
interface SdSheetItemKeydownEventParam<T> {
  item: T;
  event: KeyboardEvent;
}
```

### `SdSheetCellKeydownEventParam`

```typescript
interface SdSheetCellKeydownEventParam<T> {
  item: T;
  key: string;
  event: KeyboardEvent;
}
```
