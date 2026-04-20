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
  cumulativeSelection = input(false, { transform: booleanAttribute });

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
| `cumulativeSelection` | `boolean` | `false` | `true`면 `items` 변경(페이지 이동/검색/필터 등) 시 `selectedItems`를 유지하여 다중 페이지 선택 누적을 실현. `false`(기본)면 `items` 변경 시 `selectedItems`를 `[]`로 초기화. 체크 표시 판정은 두 모드 모두 `trackByFn` + `obj.equal` 기반 key 비교이므로 **누적 모드 사용 시 `trackByFn` 지정 필수**(기본 `(item) => item`은 reference 반환이라 서버 페이지네이션 등에서 복원 실패). 누적 모드에서 명시적 초기화는 소비자가 직접 `selectedItems.set([])` 호출. 선택된 키 배열이 필요하면 `selectedItems().map((it, i) => trackByFn()(it, i))` 수동 호출 |
| `currentPage` | `number` | `0` | 현재 페이지 (two-way) |
| `sorts` | `SortingDef[]` | `[]` | 정렬 설정 (two-way). **`SortingDef.key`는 컬럼 `key`에 지정된 값 그대로이므로 `"vendor.name"` 같은 체인 경로일 수 있다.** 정렬 처리 시 `item[sort.key]` 단순 접근 금지 → `obj.getChainValue(item, sort.key)` 사용 |
| `selectedItems` | `T[]` | `[]` | 선택된 항목 (two-way) |
| `expandedItems` | `T[]` | `[]` | 확장된 항목 (two-way) |

#### `cumulativeSelection` 사용 패턴

시트의 용도에 따라 올바른 값이 다르다:

- **선택 모달**(사용자가 여러 페이지 돌며 체크 후 확인 버튼으로 전체 반환) → `true`. 다중 페이지 선택이 유지되어야 한다
- **현재 뷰 일괄 작업**(선택 삭제·복구 등 현재 페이지 내 처리) → `false` (기본값). `items` 변경 시 선택이 자동 초기화되어 오작동을 방지한다

정적 `true`/`false`보다 **동적 computed 바인딩**으로 상황에 맞게 쓰는 것을 권장한다:

```html
<sd-sheet
  [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
  [trackByFn]="trackById"
  ...
>
```

- `viewType()` = `'modal'` + `selectMode()` = `'multi'`일 때만 누적
- 그 외(page 뷰 또는 single 선택)는 기본 모드로 동작

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

**셀 내용 작성 지침** (`sd-sheet-column` / `sd-data-sheet-column` 공통):

- **일반 텍스트/값 표시**: 바깥에 `<div class="p-xs-sm">`로 감싸 기본 패딩을 적용한다. 정렬이 필요하면 `tx-right`, `tx-center` 등을 함께 사용한다.
- **컨트롤(textfield/select/checkbox 등) 삽입**: 반드시 `[inset]="true"`와 `[size]="'sm'"`을 지정한다. `inset`은 컨트롤의 테두리·배경을 제거해 셀에 자연스럽게 녹아들게 하고, `sm` 사이즈는 시트 행 높이에 맞춘다. 이 경우 별도 `p-xs-sm` 래퍼는 사용하지 않는다.

예시:
```html
<!-- 일반 값 표시 -->
<sd-data-sheet-column [fixed]="true" [header]="'#'" [key]="'id'">
  <ng-template [cell]="items()" let-item>
    <div class="p-xs-sm tx-right">{{ item.id }}</div>
  </ng-template>
</sd-data-sheet-column>

<!-- 컨트롤 삽입 -->
<sd-data-sheet-column [header]="'코드'" [key]="'code'">
  <ng-template [cell]="items()" let-item let-edit="edit">
    <sd-textfield
      [type]="'text'"
      [inset]="true"
      [size]="'sm'"
      [required]="true"
      [disabled]="!canEdit()"
      [readonly]="!edit"
      [(value)]="item.code"
      (valueChange)="mark(items)"
    />
  </ng-template>
</sd-data-sheet-column>
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
