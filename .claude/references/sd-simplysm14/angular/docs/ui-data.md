# UI - Data

## List

### `SdList`

리스트 컴포넌트.

```typescript
@Component({ selector: "sd-list" })
class SdList {
  inset = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `inset` | `boolean` | `false` | 삽입 스타일 (테두리 없음) |

### `SdListItem`

리스트 항목 컴포넌트. 접기/펼치기 자식 리스트를 지원한다.

```typescript
@Component({ selector: "sd-list-item" })
class SdListItem {
  open = model(false);
  selected = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 자식 리스트 펼침 (two-way) |
| `selected` | `boolean` | `false` | 선택 상태 |
| `readonly` | `boolean` | `false` | 읽기 전용 |

## Sheet

### `SdSheet`

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

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string \| undefined` | `undefined` | 설정 저장 키 |
| `items` | `T[]` | `[]` | 표시할 항목 |
| `trackByFn` | `((item, index) => unknown) \| undefined` | `undefined` | 트랙킹 함수 |
| `selectMode` | `"single" \| "multi" \| undefined` | `undefined` | 선택 모드 |
| `getItemSelectableFn` | `((item) => boolean \| string) \| undefined` | `undefined` | 선택 가능 여부 함수. string은 비활성 사유 |
| `getChildrenFn` | `((item, index) => T[] \| undefined) \| undefined` | `undefined` | 트리 구조 자식 반환 함수 |
| `useAutoSort` | `boolean` | `false` | 클라이언트 측 자동 정렬 |
| `visiblePageCount` | `number` | `10` | 한 번에 표시할 페이지 수 |
| `totalPageCount` | `number` | `0` | 총 페이지 수 |
| `itemsPerPage` | `number` | `0` | 페이지당 항목 수 |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `hideConfigBar` | `boolean` | `false` | 설정 바 숨김 |
| `currentPage` | `number` | `0` | 현재 페이지 (two-way) |
| `sorts` | `SortingDef[]` | `[]` | 정렬 설정 (two-way) |
| `selectedItems` | `T[]` | `[]` | 선택된 항목 (two-way) |
| `expandedItems` | `T[]` | `[]` | 확장된 항목 (two-way) |

### `SdSheetColumn`

시트 컬럼 정의 디렉티브. 컬럼의 헤더, 너비, 고정, 정렬 등을 설정한다. 셀 내용은 `SdSheetColumnCellTemplate`으로 정의한다.

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

  cellTplRef = contentChild.required(SdSheetColumnCellTemplate, { read: TemplateRef });
  headerTplRef = contentChild<TemplateRef<void>>("headerTpl");
  summaryTplRef = contentChild<TemplateRef<void>>("summaryTpl");
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | required | 컬럼 식별 키 |
| `header` | `string \| string[]` | `""` | 헤더 텍스트 (배열이면 멀티 행 헤더) |
| `headerStyle` | `string \| undefined` | - | 헤더 셀 인라인 스타일 |
| `tooltip` | `string \| undefined` | - | 헤더 툴팁 텍스트 |
| `width` | `string \| undefined` | - | 컬럼 너비 (예: `"100px"`) |
| `fixed` | `boolean` | `false` | 고정 컬럼 |
| `hidden` | `boolean` | `false` | 숨김 |
| `collapse` | `boolean` | `false` | 접힘 (너비 축소) |
| `disableSorting` | `boolean` | `false` | 정렬 비활성화 |
| `disableResizing` | `boolean` | `false` | 리사이즈 비활성화 |
| `ordering` | `number` | `0` | 순서 (낮을수록 앞) |

Content children:
- `SdSheetColumnCellTemplate` (required): 셀 렌더링 템플릿
- `#headerTpl`: 커스텀 헤더 템플릿
- `#summaryTpl`: 요약 행 템플릿

### `SdSheetColumnCellTemplate`

시트 컬럼 셀 내용을 정의하는 디렉티브. `ng-template[cell]` 셀렉터를 사용하며, `SdSheetCellContext` 타입 가드를 제공한다.

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

사용법:
```html
<sd-sheet-column key="name" header="이름">
  <ng-template [cell]="items()" let-item>
    {{ item.name }}
  </ng-template>
</sd-sheet-column>
```

### `SdSheetCellContext`

시트 셀 템플릿 컨텍스트.

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
| `item` | `T` | 현재 항목 (명시적 접근) |
| `index` | `number` | 행 인덱스 |
| `depth` | `number` | 트리 깊이 |
| `edit` | `boolean` | 편집 모드 여부 (SdDataSheetColumn의 edit input에 의해 설정) |

### `SdSheetConfigModal`

시트 설정 모달. 컬럼 표시/숨김, 고정, 너비 등을 설정한다.

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

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | 컬럼 식별 키 |
| `header` | `string \| string[]` | 헤더 텍스트 |
| `headerStyle` | `string \| undefined` | 헤더 셀 인라인 스타일 |
| `tooltip` | `string \| undefined` | 헤더 툴팁 텍스트 |
| `width` | `string \| undefined` | 컬럼 너비 |
| `fixed` | `boolean` | 고정 컬럼 여부 |
| `hidden` | `boolean` | 숨김 여부 |
| `collapse` | `boolean` | 접힘 여부 |
| `disableSorting` | `boolean` | 정렬 비활성화 여부 |
| `disableResizing` | `boolean` | 리사이즈 비활성화 여부 |
| `ordering` | `number` | 순서 |

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

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | 해당 행 항목 |
| `key` | `string` | 컬럼 키 |
| `event` | `KeyboardEvent` | 키보드 이벤트 |
