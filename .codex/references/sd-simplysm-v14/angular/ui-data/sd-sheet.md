# `SdSheet`

> **읽어야 하는 상황**: 스프레드시트 형태로 데이터를 표시하고 정렬, 컬럼 고정, 리사이즈, 설정 저장 등이 필요할 때. 단순 목록은 [`SdList`](.$sd-list.md) 참조.

스프레드시트 컴포넌트. 정렬, 컬럼 고정, 리사이즈, 페이지네이션, 설정 저장을 지원한다.

```typescript
@Component({ selector: "sd-sheet" })
class SdSheet<TItem, TKey> {
  key = input<string>();
  items = input<TItem[]>([]);
  trackByFn = input.required<(item: TItem, index: number) => TKey>();
  selectMode = input<"single" | "multi">();
  autoSelect = input<"click" | "focus">();
  getItemSelectableFn = input<(item: TItem) => boolean | string>();
  getChildrenFn = input<(item: TItem, index: number) => TItem[] | undefined>();
  useAutoSort = input(false, { transform: booleanAttribute });
  visiblePageCount = input(10);
  totalPageCount = input(0);
  itemsPerPage = input(0);
  focusMode = input<"row" | "cell">("cell");
  inset = input(false, { transform: booleanAttribute });
  contentStyle = input<string>();
  getItemCellClassFn = input<(item: TItem, colKey: string) => string>();
  getItemCellStyleFn = input<(item: TItem, colKey: string) => string | undefined>();
  hideConfigBar = input(false, { transform: booleanAttribute });
  columnControlsInput = input<readonly SdSheetColumn[]>([]);
  itemKeydown = output<SdSheetItemKeydownEventParam<TItem>>();
  cellKeydown = output<SdSheetCellKeydownEventParam<TItem>>();

  selectedKeys = model<NonNullable<TKey>[]>([]);
  expandedItems = model<TItem[]>([]);
  sorts = model<SortingDef[]>([]);
  currentPage = model(0);
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `key` | input | `string \| undefined` | `undefined` | 설정 저장 키 |
| `items` | input | `TItem[]` | `[]` | 표시할 항목 |
| `trackByFn` | input (required) | `(item: TItem, index: number) => TKey` | - | 트랙킹 함수 |
| `selectMode` | input | `"single" \| "multi" \| undefined` | `undefined` | 선택 모드 |
| `autoSelect` | input | `"click" \| "focus" \| undefined` | `undefined` | 자동 선택 트리거 |
| `getItemSelectableFn` | input | `((item) => boolean \| string) \| undefined` | `undefined` | 선택 가능 여부 함수. string은 비활성 사유 |
| `getChildrenFn` | input | `((item, index) => TItem[] \| undefined) \| undefined` | `undefined` | 트리 구조 자식 반환 함수 |
| `useAutoSort` | input | `boolean` | `false` | 클라이언트 측 자동 정렬 |
| `visiblePageCount` | input | `number` | `10` | 한 번에 표시할 페이지 수 |
| `totalPageCount` | input | `number` | `0` | 총 페이지 수 |
| `itemsPerPage` | input | `number` | `0` | 페이지당 항목 수 |
| `focusMode` | input | `"row" \| "cell"` | `"cell"` | 포커스 모드 (행 단위 또는 셀 단위) |
| `inset` | input | `boolean` | `false` | 삽입 스타일 |
| `contentStyle` | input | `string \| undefined` | `undefined` | 시트 콘텐츠 영역 인라인 스타일 |
| `getItemCellClassFn` | input | `((item, colKey) => string) \| undefined` | `undefined` | 셀별 CSS 클래스 함수 |
| `getItemCellStyleFn` | input | `((item, colKey) => string \| undefined) \| undefined` | `undefined` | 셀별 인라인 스타일 함수 |
| `hideConfigBar` | input | `boolean` | `false` | 설정 바 숨김 |
| `columnControlsInput` | input | `readonly SdSheetColumn[]` | `[]` | 프로그래밍 방식 컬럼 정의 (contentChildren과 병합) |
| `itemKeydown` | output | `SdSheetItemKeydownEventParam<TItem>` | - | 행 keydown 이벤트 |
| `cellKeydown` | output | `SdSheetCellKeydownEventParam<TItem>` | - | 셀 keydown 이벤트 |
| `selectedKeys` | model | `NonNullable<TKey>[]` | `[]` | 선택된 항목의 key 배열 (two-way, trackByFn 기준) |
| `expandedItems` | model | `TItem[]` | `[]` | 확장된 항목 (two-way) |
| `sorts` | model | `SortingDef[]` | `[]` | 정렬 설정 (two-way) |
| `currentPage` | model | `number` | `0` | 현재 페이지 (two-way) |

> `SortingDef.key`는 `"vendor.name"` 같은 체인 경로일 수 있다. 정렬 처리 시 `obj.getChainValue(item, sort.key)` (from `@simplysm/core-common`)를 사용한다.

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
class SdSheetConfigModal implements SdModalContentDef<SdSheetConfig | undefined> {
  sheetKey = input.required<string>();
  controls = input.required<readonly SdSheetColumn[]>();
  config = input.required<SdSheetConfig | undefined>();
  close = output<SdSheetConfig | undefined>();
  initialized = signal(false);
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
