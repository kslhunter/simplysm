# @simplysm/angular — 시트

다건 목록·편집 표를 구성하는 `sd-sheet`와 컬럼/셀 템플릿/설정 modal/type 군이다. 컬럼 설정 저장은 [client-system-config.md](../../manuals/client-system-config.md), 표준 목록 골격은 [client-crud.md](../../manuals/client-crud.md) 참조.

## `SdSheet<TItem>` — `<sd-sheet>`

```ts
class SdSheet<TItem> {
  key: InputSignal<string | undefined>;
  items: InputSignal<TItem[]>;
  trackByFn: InputSignal<(item: TItem, index: number) => unknown>;
  selectMode: InputSignal<"single" | "multi" | undefined>;
  autoSelect: InputSignal<"click" | "focus" | undefined>;
  getItemSelectableFn: InputSignal<((item: TItem) => boolean | string) | undefined>;
  getChildrenFn: InputSignal<((item: TItem, index: number) => TItem[] | undefined) | undefined>;
  useAutoSort: InputSignal<boolean>;
  visiblePageCount: InputSignal<number>;
  totalPageCount: InputSignal<number>;
  itemsPerPage: InputSignal<number>;
  focusMode: InputSignal<"row" | "cell">;
  inset: InputSignal<boolean>;
  contentStyle: InputSignal<string | undefined>;
  getItemCellClassFn: InputSignal<((item: TItem, colKey: string) => string) | undefined>;
  getItemCellStyleFn: InputSignal<((item: TItem, colKey: string) => string | undefined) | undefined>;
  hideConfigBar: InputSignal<boolean>;
  itemKeydown: OutputEmitterRef<SdSheetItemKeydownEventParam<TItem>>;
  cellKeydown: OutputEmitterRef<SdSheetCellKeydownEventParam<TItem>>;
  selectedKeys: ModelSignal<unknown[]>;
  expandedItems: ModelSignal<TItem[]>;
  sorts: ModelSignal<SortingDef[]>;
  currentPage: ModelSignal<number>;
  columnControlsInput: InputSignal<readonly SdSheetColumn[]>;
}
```

- `key` — 시트 설정 저장 key. 있으면 config button을 표시하고 `${hostTag}.${key}` resource로 column 설정을 저장한다.
- `items` — 표시할 원본 item 배열. 기본 빈 배열.
- `trackByFn` — row track key와 selection key 계산 함수. 기본 item 자체.
- `selectMode` — `"single"` 은 한 key만 선택, `"multi"` 는 여러 key와 header 전체선택을 사용, undefined면 선택 기능 없음.
- `autoSelect` — `"click"` 은 row/cell click에서 select, `"focus"` 는 cell focus에서 select한다.
- `getItemSelectableFn` — item별 선택 가능 여부. true면 선택 가능, string이면 선택 불가 사유 tooltip, false/undefined 결과는 선택 불가로 처리된다.
- `getChildrenFn` — tree row 자식 배열을 반환한다. 있으면 expand column과 depth 표시를 사용한다.
- `useAutoSort` — true면 `sorts` 기준으로 `items` 를 client-side sort한다. false면 외부에서 정렬된 items를 넘긴다.
- `visiblePageCount` — pagination에서 한 그룹에 보여줄 page 개수. 기본 10.
- `totalPageCount` — 서버 페이징 총 page 수. 0이면 `itemsPerPage` 로 client-side page 수를 계산한다.
- `itemsPerPage` — client-side page size. 0이면 pagination 없이 전체 표시.
- `focusMode` — `"cell"` 은 cell focus indicator 표시, `"row"` 는 cell indicator를 숨긴다. 기본 `"cell"`.
- `inset` — sheet border/radius 제거.
- `contentStyle` — scroll container style 문자열.
- `getItemCellClassFn` — data cell class 계산 함수.
- `getItemCellStyleFn` — data cell style 계산 함수. fixed left/indent/edit style과 합쳐진다.
- `hideConfigBar` — true면 key/pagination이 있어도 상단 tool bar를 숨긴다.
- `itemKeydown` — row keydown에서 `{ item, event }` emit.
- `cellKeydown` — cell keydown에서 `{ item, key: colKey, event }` emit.
- `selectedKeys` — 선택 key 배열 model.
- `expandedItems` — 펼쳐진 tree item 배열 model.
- `sorts` — header click으로 변경되는 sort 정의 배열 model.
- `currentPage` — 0-base 현재 page model.
- `columnControlsInput` — content children 외부에서 column definition instance를 추가로 주입하는 input.

### 주요 public 메서드·상태

```ts
getColumnHeaderTpl(key: string): TemplateRef<void> | null;
getColumnCellTpl(key: string): TemplateRef<SdSheetCellContext<unknown>> | null;
getColumnSummaryTpl(key: string): TemplateRef<void> | null;
getSelectableTooltip(item: TItem): string | undefined;
getSortDef(key: string): { indexText?: string; desc: boolean } | null;
getItemDef(item: TItem): ExpandItemDef<TItem>;
isExpanded(item: TItem): boolean;
getAriaExpanded(item: TItem): string | null;
getAriaSortValue(cell: SdSheetHeaderDef): string | null;
onConfigButtonClick(): Promise<void>;
```

- `key` parameters — column key 또는 item key 조회 기준 문자열.
- `item` parameters — 현재 display row item.
- `cell` — header cell definition. sort 상태가 있으면 `"ascending"`/`"descending"` 을 반환한다.
- `getColumn*Tpl` — column key에 연결된 header/cell/summary template을 반환한다.
- `getSelectableTooltip` — `getItemSelectableFn` 결과가 string이면 그 사유를 반환한다.
- `getSortDef` — sort map에서 key의 sort 상태를 반환한다.
- `getItemDef` — expanding manager의 depth/parent/hasChildren 정의를 반환하고 item이 없으면 throw한다.
- `isExpanded` — `expandedItems` set에 item이 있는지 반환한다.
- `getAriaExpanded` — tree 자식이 있는 item이면 `"true"`/`"false"`, tree가 아니거나 leaf면 null.
- `onConfigButtonClick` — key가 없으면 throw, 있으면 `SdSheetConfigModal` 을 열고 결과를 config resource에 저장한다.

## column directive

### `SdSheetColumn` — `<sd-sheet-column>`

```ts
class SdSheetColumn {
  key: InputSignal<string>;
  header: InputSignal<string | string[]>;
  headerStyle: InputSignal<string | undefined>;
  tooltip: InputSignal<string | undefined>;
  width: InputSignal<string | undefined>;
  fixed: InputSignal<boolean>;
  hidden: InputSignal<boolean>;
  collapse: InputSignal<boolean>;
  disableSorting: InputSignal<boolean>;
  disableResizing: InputSignal<boolean>;
  ordering: InputSignal<number>;
  cellTplRef: Signal<TemplateRef<SdSheetCellContext<unknown>>>;
  headerTplRef: Signal<TemplateRef<void> | undefined>;
  summaryTplRef: Signal<TemplateRef<void> | undefined>;
}
```

- `key` — column 식별자. sort key, config key, cell template lookup key로 쓰인다.
- `header` — header 텍스트. 배열이면 다중 header row로 펼쳐진다.
- `headerStyle` — 마지막 depth header content style 문자열.
- `tooltip` — header title에 우선 적용되는 tooltip. 없으면 header text.
- `width` — column width style. config width가 있으면 config가 우선한다.
- `fixed` — true면 sticky left column으로 계산한다.
- `hidden` — true면 layout에서 숨김 column로 처리된다. config hidden이 있으면 config가 우선한다.
- `collapse` — layout engine에서 column collapse 여부로 전달되는 flag.
- `disableSorting` — true면 header click sort와 sort icon을 비활성화한다.
- `disableResizing` — true면 resize handle과 config width 편집을 비활성화한다.
- `ordering` — column 정렬 순서. config ordering이 있으면 config가 우선한다.
- `cellTplRef` — required `ng-template[cell]` template ref.
- `headerTplRef` — `#headerTpl` content template. 있으면 header 텍스트 대신 렌더한다.
- `summaryTplRef` — `#summaryTpl` content template. 있으면 summary row cell에 렌더한다.

### `SdSheetColumnCellTemplate<T>` / `SdSheetCellContext<T>`

```ts
class SdSheetColumnCellTemplate<T> {
  cell: InputSignal<T[]>;
  static ngTemplateContextGuard<TContextItem>(...): _ctx is SdSheetCellContext<TContextItem>;
}
interface SdSheetCellContext<T = unknown> {
  $implicit: T;
  item: T;
  index: number;
  depth: number;
  edit: boolean;
}
```

- `cell` — `ng-template[cell]` required input. 배열 item 타입을 template context 타입으로 전달한다.
- `$implicit` — cell template 기본 item 변수.
- `item` — 명명된 item 변수.
- `index` — display row index.
- `depth` — tree depth. `getChildrenFn` 이 없으면 0.
- `edit` — 현재 cell address가 edit mode인지 여부.

## sheet config modal

### `SdSheetConfigModal`

사용법: [client-system-config.md](../../manuals/client-system-config.md)

```ts
class SdSheetConfigModal implements SdModalContentDef<SdSheetConfig | undefined> {
  initialized: WritableSignal<boolean>;
  close: OutputEmitterRef<SdSheetConfig | undefined>;
  sheetKey: InputSignal<string>;
  controls: InputSignal<readonly SdSheetColumn[]>;
  config: InputSignal<SdSheetConfig | undefined>;
}
```

- `initialized` — 기본 true signal.
- `close` — OK이면 새 `SdSheetConfig`, cancel이면 undefined, reset confirm이면 `{ columnRecord: {} }` 를 emit한다.
- `sheetKey` — 내부 설정표 key를 `${sheetKey}-config` 로 만들 때 쓰인다.
- `controls` — 설정 대상 column directive 배열.
- `config` — 현재 저장된 설정. 각 column의 fixed/hidden/width/ordering 기본값보다 우선한다.

## sheet 타입

### `SdSheetColumnDef`, `SdSheetHeaderDef`, `SdSheetConfig`

```ts
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
interface SdSheetHeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  fixed: boolean;
  colDef: SdSheetColumnDef | undefined;
  colIndex: number;
}
interface SdSheetConfig {
  columnRecord: Record<string, { width?: string; hidden?: boolean; fixed?: boolean; ordering?: number }>;
}
```

- `SdSheetColumnDef.key` — column 식별자.
- `header` — header text 또는 다중 header path 배열.
- `headerStyle` — header content style.
- `tooltip` — header title tooltip.
- `width` — column width style.
- `fixed` — sticky left 여부.
- `hidden` — 숨김 여부.
- `collapse` — layout collapse flag.
- `disableSorting` — sort 비활성 flag.
- `disableResizing` — resize 비활성 flag.
- `ordering` — 정렬 순서 값.
- `SdSheetHeaderDef.text` — header cell 표시 텍스트.
- `colspan`/`rowspan` — header 병합 span 수.
- `isLastRow` — 마지막 depth header cell인지 여부. sort/resizer/cell template 연결에 쓰인다.
- `SdSheetHeaderDef.fixed` — header cell sticky 여부.
- `colDef` — 마지막 row에서는 column def, 그룹 header에서는 undefined 가능.
- `colIndex` — layout column index.
- `SdSheetConfig.columnRecord` — column key별 사용자 설정 map.
- `columnRecord.width` — 저장된 width style.
- `columnRecord.hidden` — 저장된 숨김 여부.
- `columnRecord.fixed` — 저장된 fixed 여부.
- `columnRecord.ordering` — 저장된 ordering 값.

### keydown event params

```ts
interface SdSheetItemKeydownEventParam<T> { item: T; event: KeyboardEvent }
interface SdSheetCellKeydownEventParam<T> { item: T; key: string; event: KeyboardEvent }
```

- `item` — keydown이 발생한 row item.
- `key` — cell keydown이 발생한 column key.
- `event` — 원본 `KeyboardEvent`.

### `SortingDef`

```ts
interface SortingDef { key: string; desc: boolean }
```

- `key` — sort 대상 column key.
- `desc` — false면 ascending, true면 descending.
