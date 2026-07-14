# @simplysm/angular — 시트

다건 목록·편집 표를 구성하는 `sd-sheet` 와 컬럼/셀 템플릿/설정 modal/type 군이다. standalone · OnPush · `ViewEncapsulation.None`. 컬럼 설정 저장은 [client-system-config.md](../../manuals/client-system-config.md), 표준 목록 골격은 [client-crud.md](../../manuals/client-crud.md) 참조.

## `SdSheet<TItem>` (`sd-sheet`)

```ts
class SdSheet<TItem> {
  // inputs
  key: InputSignal<string | undefined>;
  items: InputSignal<TItem[]>; // default []
  trackByFn: InputSignal<(item: TItem, index: number) => unknown>; // default (item) => item
  selectMode: InputSignal<"single" | "multi" | undefined>;
  autoSelect: InputSignal<"click" | "focus" | undefined>;
  getItemSelectableFn: InputSignal<(item: TItem) => boolean | string>;
  getChildrenFn: InputSignal<(item: TItem, index: number) => TItem[] | undefined>;
  useAutoSort: InputSignal<boolean>; // default false
  visiblePageCount: InputSignal<number>; // default 10
  totalPageCount: InputSignal<number>; // default 0
  itemsPerPage: InputSignal<number>; // default 0
  focusMode: InputSignal<"row" | "cell">; // default "cell"
  inset: InputSignal<boolean>; // default false
  contentStyle: InputSignal<string | undefined>;
  getItemCellClassFn: InputSignal<(item: TItem, colKey: string) => string>;
  getItemCellStyleFn: InputSignal<(item: TItem, colKey: string) => string | undefined>;
  hideConfigBar: InputSignal<boolean>; // default false
  columnControlsInput: InputSignal<readonly SdSheetColumn[]>; // default []
  // models
  selectedKeys: ModelSignal<unknown[]>; // default []  (선택 item의 key)
  expandedItems: ModelSignal<TItem[]>; // default []
  sorts: ModelSignal<SortingDef[]>; // default []
  currentPage: ModelSignal<number>; // default 0
  // outputs
  itemKeydown: OutputEmitterRef<SdSheetItemKeydownEventParam<TItem>>;
  cellKeydown: OutputEmitterRef<SdSheetCellKeydownEventParam<TItem>>;
}
```

`<sd-sheet-column>` 을 투영(또는 `columnControlsInput`)해 컬럼을 정의하는 데이터 그리드. 선택/정렬/펼침/페이징/셀 편집·키보드 내비게이션·컬럼 고정·리사이즈를 내장함.

- `key` — 설정 영속화 key(지정 시 컬럼 설정 톱니 버튼 표시, `SdSheetConfig` 를 system config로 로드/저장). 설정 모달을 열려면 필수(미지정 시 throw).
- `items` — 행 데이터.
- `trackByFn` — track + 선택/펼침 key 산출 기준(기본 identity).
- `selectMode` — `undefined`(선택 UI 없음), `"multi"`(체크박스 컬럼 + 전체선택 + shift 범위 선택), `"single"`(행 화살표 anchor).
- `autoSelect` — `"click"`(행/셀 클릭 시 선택), `"focus"`(셀 focus 시 선택).
- `getItemSelectableFn` — 항목 선택 가능 여부. `true` 가능, `false` 불가, `string` 은 비활성 사유(tooltip).
- `getChildrenFn` — 지정 시 트리/펼침 모드(expander 컬럼·`depth` 계산·펼친 조상만 표시).
- `useAutoSort` — true면 `sorts` 로 내부 정렬, false면 헤더 아이콘만(호출측 정렬).
- `totalPageCount` — `>0` 이면 그 값을 페이지 수로(서버 페이징). `itemsPerPage` — `>0` && totalPageCount≤0이면 클라이언트 페이징.
- `focusMode` — `"cell"`(기본, 셀 focus 표시), `"row"`(셀 focus 인디케이터 숨김).
- `getItemCellClassFn`/`getItemCellStyleFn` — 셀별 class/inline style.
- `hideConfigBar` — 상단 도구 바(설정 버튼+페이지네이션) 숨김.
- `columnControlsInput` — 프로그램적 컬럼(투영 contentChildren과 합쳐 사용).
- `selectedKeys`(model) — 선택 item의 `trackByFn` **key** 배열(item 아님). single은 `[key]` 로 교체, multi는 추가/제거.
- `expandedItems`(model) — 펼친 item(객체 ref).
- `sorts`(model) — 정렬 정의. 헤더 클릭 토글(shift=다중 정렬). 컬럼당 none→asc→desc→제거.
- `currentPage`(model) — 현재 페이지 index(0-based).
- `itemKeydown`/`cellKeydown` — 행/셀 keydown 시 `{ item, event }` / `{ item, key, event }`.
- 셀 편집·키보드 — `F2`/더블클릭 편집 진입, `Escape` 종료, 편집 중 `Enter` 아래 셀 이동(멀티라인은 줄바꿈, `Ctrl+Alt+Enter` 아래 이동), 비편집 Arrow 키 셀 이동, `Ctrl+C`/`Ctrl+V` 셀 복사/붙여넣기.

## `SdSheetColumn` (`sd-sheet-column`)

```ts
@Directive({ selector: "sd-sheet-column" })
class SdSheetColumn {
  key: InputSignal<string>; // required
  header: InputSignal<string | string[]>; // default ""
  headerStyle: InputSignal<string | undefined>;
  tooltip: InputSignal<string | undefined>;
  width: InputSignal<string | undefined>;
  fixed: InputSignal<boolean>; // default false
  hidden: InputSignal<boolean>; // default false
  collapse: InputSignal<boolean>; // default false
  disableSorting: InputSignal<boolean>; // default false
  disableResizing: InputSignal<boolean>; // default false
  ordering: InputSignal<number>; // default 0
}
interface SdSheetCellContext<T = unknown> {
  $implicit: T;
  item: T;
  index: number;
  depth: number;
  edit: boolean;
}
```

컬럼 설정 + 셀/헤더/요약 템플릿 호스트(컴포넌트 아닌 디렉티브).

- `key` — **required**. 컬럼 id(셀/헤더 템플릿·설정 record 매칭).
- `header` — 헤더 라벨. 배열이면 다단 그룹 헤더(인접 동일 텍스트 병합).
- `width` — 컬럼 너비(CSS). 저장 설정 width가 우선.
- `fixed` — 좌측 고정(sticky). `hidden` — 컬럼 제외(설정 override 가능). `collapse` — 접힘.
- `disableSorting` — 정렬 아이콘/클릭 제거. `disableResizing` — resize handle 숨김.
- `ordering` — 컬럼 정렬 순서(설정 override 가능).
- 템플릿 — `ng-template[cell]`(필수 셀 본문, context `SdSheetCellContext`), `#headerTpl`(커스텀 헤더), `#summaryTpl`(요약 행).
- `SdSheetCellContext` — `$implicit`/`item`(행 항목), `index`(표시 행 index), `depth`(트리 깊이, getChildrenFn 없으면 0), `edit`(이 셀 편집 모드 여부).

## `SdSheetColumnCellTemplate<T>` (`ng-template[cell]`)

```ts
@Directive({ selector: "ng-template[cell]" })
class SdSheetColumnCellTemplate<T> {
  cell: InputSignal<T[]>;     // required, [cell]="items()"
  static ngTemplateContextGuard<TContextItem>(...): _ctx is SdSheetCellContext<TContextItem>;
}
```

셀 본문 템플릿. `[cell]="items()"` 로 item 타입을 추론해 `let-item`/`let-index`/`let-depth`/`let-edit` 를 타입화함.

## `SdSheetConfigModal` (`sd-sheet-config-modal`)

컬럼 고정/순서/라벨/너비/숨김을 편집하는 모달 컨텐츠 컴포넌트(`SdModalContentDef<SdSheetConfig | undefined>`). 내부에 중첩 `SdSheet` 로 컬럼 행을 렌더.

- inputs(모두 required) — `sheetKey: string`, `controls: readonly SdSheetColumn[]`, `config: SdSheetConfig | undefined`.
- `close` output — OK 시 편집 결과 `SdSheetConfig`, Cancel 시 `undefined`, Reset(확인 후) 시 `{ columnRecord: {} }`.

## types (`types.ts`)

```ts
interface SdSheetColumnDef {
  // 해석된 컬럼 모델
  key: string;
  header: string | string[];
  headerStyle?: string;
  tooltip?: string;
  width?: string;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  disableSorting: boolean;
  disableResizing: boolean;
  ordering: number;
}
interface SdSheetHeaderDef {
  // 계산된 헤더 셀
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  fixed: boolean;
  colDef: SdSheetColumnDef | undefined;
  colIndex: number;
}
interface SdSheetConfig {
  // system config로 영속화
  columnRecord: Record<
    string,
    { width?: string; hidden?: boolean; fixed?: boolean; ordering?: number }
  >;
}
interface SdSheetItemKeydownEventParam<T> {
  item: T;
  event: KeyboardEvent;
}
interface SdSheetCellKeydownEventParam<T> {
  item: T;
  key: string;
  event: KeyboardEvent;
}
type SortingDef = { key: string; desc: boolean }; // useSortingManager에서 정의, sd-sheet에서 재export
```

- `SdSheetColumnDef` — 컬럼 input + 저장 설정을 합친 유효 컬럼 모델(hidden은 필터됨).
- `SdSheetHeaderDef` — 병합 colspan/rowspan 포함 헤더 셀(마지막 행 셀만 `colDef`).
- `SdSheetConfig` — 컬럼별 override(width/hidden/fixed/ordering).
- keydown param — 행/셀 keydown 이벤트 페이로드.
- `SortingDef` — 정렬 키 + 내림차순 여부.
