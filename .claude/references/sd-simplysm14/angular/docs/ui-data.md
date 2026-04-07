# UI - Data

## List

### `SdListControl`

리스트 컴포넌트.

```typescript
@Component({ selector: "sd-list" })
class SdListControl {
  inset = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `inset` | `boolean` | `false` | 삽입 스타일 (테두리 없음) |

### `SdListItemControl`

리스트 항목 컴포넌트. 접기/펼치기 자식 리스트를 지원한다.

```typescript
@Component({ selector: "sd-list-item" })
class SdListItemControl {
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

### `SdSheetControl`

스프레드시트 컴포넌트. 정렬, 컬럼 고정, 리사이즈, 페이지네이션, 설정 저장을 지원한다.

```typescript
@Component({ selector: "sd-sheet" })
class SdSheetControl<T> {
  items = input.required<T[]>();
  currentPage = model(0);
  totalPageCount = input(0);
  itemsPerPage = input(0);
  visiblePageCount = input(10);
  useAutoSort = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  hideConfigBar = input(false, { transform: booleanAttribute });
  sorts = model<ISortingDef[]>([]);
  selectedItems = model<T[]>([]);
  selectMode = input<"single" | "multi">();
  expandedItems = model<T[]>([]);
  getChildrenFn = input<(item: T, index: number) => T[] | undefined>();
  getItemSelectableFn = input<(item: T) => boolean | string>();
  configKey = input<string>();
  trackByFn = input<(index: number, item: T) => any>();

  itemKeydown = output<ISdSheetItemKeydownEventParam<T>>();
  cellKeydown = output<ISdSheetCellKeydownEventParam<T>>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `items` | `T[]` | required | 표시할 항목 |
| `currentPage` | `number` | `0` | 현재 페이지 (two-way) |
| `totalPageCount` | `number` | `0` | 총 페이지 수 |
| `useAutoSort` | `boolean` | `false` | 클라이언트 측 자동 정렬 |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `hideConfigBar` | `boolean` | `false` | 설정 바 숨김 |
| `sorts` | `ISortingDef[]` | `[]` | 정렬 설정 (two-way) |
| `selectedItems` | `T[]` | `[]` | 선택된 항목 (two-way) |
| `selectMode` | `"single" \| "multi" \| undefined` | - | 선택 모드 |
| `expandedItems` | `T[]` | `[]` | 확장된 항목 (two-way) |
| `getChildrenFn` | `((item, index) => T[] \| undefined) \| undefined` | - | 트리 구조 자식 반환 함수 |
| `getItemSelectableFn` | `((item) => boolean \| string) \| undefined` | - | 선택 가능 여부 함수. string은 비활성 사유 |
| `configKey` | `string \| undefined` | - | 설정 저장 키 |

### `SdSheetColumnDirective`

시트 컬럼 정의 디렉티브.

```typescript
@Directive({ selector: "sd-sheet-column" })
class SdSheetColumnDirective {
  key = input.required<string>();
  header = input<string | string[]>();
  width = input<string>();
  fixed = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
  collapse = input(false, { transform: booleanAttribute });
  disableSorting = input(false, { transform: booleanAttribute });
  disableResizing = input(false, { transform: booleanAttribute });
  ordering = input(0);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | required | 컬럼 식별 키 |
| `header` | `string \| string[]` | - | 헤더 텍스트 (배열이면 멀티 행 헤더) |
| `width` | `string \| undefined` | - | 컬럼 너비 (예: `"100px"`) |
| `fixed` | `boolean` | `false` | 고정 컬럼 |
| `hidden` | `boolean` | `false` | 숨김 |
| `collapse` | `boolean` | `false` | 접힘 (너비 축소) |
| `disableSorting` | `boolean` | `false` | 정렬 비활성화 |
| `disableResizing` | `boolean` | `false` | 리사이즈 비활성화 |
| `ordering` | `number` | `0` | 순서 (낮을수록 앞) |

### `SdSheetConfigModal`

시트 설정 모달. 컬럼 표시/숨김, 고정, 너비 등을 설정한다.

```typescript
@Component({ selector: "sd-sheet-config-modal" })
class SdSheetConfigModal implements ISdModal<ISdSheetConfig> {
  controls = input.required<readonly SdSheetColumnDirective[]>();
  config = input.required<ISdSheetConfig | undefined>();
  close = output<ISdSheetConfig>();
  initialized = signal(true);
}
```

### `ISdSheetColumnDef`

```typescript
interface ISdSheetColumnDef {
  key: string;
  header: string | string[];
  width: string | undefined;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  disableSorting: boolean;
  disableResizing: boolean;
  ordering: number;
}
```

### `ISdSheetConfig`

```typescript
interface ISdSheetConfig {
  columnRecord: Record<string, {
    width?: string;
    hidden?: boolean;
    fixed?: boolean;
    ordering?: number;
  }>;
}
```

### `ISdSheetHeaderDef`

```typescript
interface ISdSheetHeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colDef: ISdSheetColumnDef | undefined;
}
```

### `ISdSheetItemKeydownEventParam`

```typescript
interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  event: KeyboardEvent;
}
```

### `ISdSheetCellKeydownEventParam`

```typescript
interface ISdSheetCellKeydownEventParam<T> {
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
