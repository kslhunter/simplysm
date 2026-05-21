# @simplysm/angular — sheet

데이터 그리드. 컬럼·셀 템플릿·정렬·페이징·선택·확장 트리·컬럼 설정 모달 내장.

## SdSheet — `<sd-sheet>`

```ts
class SdSheet<TItem>
key = input<string>();
items = input<TItem[]>([]);
trackByFn = input<(item: TItem, index: number) => unknown>((i) => i);
selectMode = input<"single"|"multi">();
autoSelect = input<"click"|"focus">();
getItemSelectableFn = input<(item) => boolean|string>();
getChildrenFn = input<(item, index) => TItem[]|undefined>();
useAutoSort = input(false);
visiblePageCount = input(10);
totalPageCount = input(0);
itemsPerPage = input(0);
focusMode = input<"row"|"cell">("cell");
inset = input(false);
contentStyle = input<string>();
getItemCellClassFn = input<(item, colKey: string) => string>();
getItemCellStyleFn = input<(item, colKey: string) => string|undefined>();
hideConfigBar = input(false);

itemKeydown = output<SdSheetItemKeydownEventParam<TItem>>();
cellKeydown = output<SdSheetCellKeydownEventParam<TItem>>();

selectedKeys = model<unknown[]>([]);
expandedItems = model<TItem[]>([]);
sorts = model<SortingDef[]>([]);
currentPage = model(0);

columnControlsInput = input<readonly SdSheetColumn[]>([]);  // 동적 컬럼 주입용
```

- `key` — 지정 시 `SdSystemConfigProvider` 키 `sd-sheet.<key>` 로 컬럼 width/hidden/fixed/ordering 자동 저장·복원. 미지정이면 세션 한정.
- `items` + `trackByFn` — 데이터와 키 추출. 트리는 `getChildrenFn` 으로 자식 반환(`expandedItems` 양방향 model 로 펼침 상태).
- `selectMode` — `single`/`multi`. 미지정이면 선택 안 함. `selectedKeys` 는 `trackByFn` 반환값 배열.
- `autoSelect` — `click`: 행 클릭 시 선택, `focus`: 포커스만 들어가도 선택. 미지정이면 명시적 체크박스만.
- `getItemSelectableFn` — true 면 선택 가능, false/string 이면 불가(string 은 사유 툴팁).
- `useAutoSort` — true 면 `sorts` 변경 시 클라이언트 자체 정렬. false 면 서버 사이드 페치 가정.
- `totalPageCount`/`itemsPerPage`/`visiblePageCount`/`currentPage` — 페이지네이션. `totalPageCount=0` 이면 페이지바 숨김.
- `focusMode` — `row` 면 행 단위 포커스, `cell` 면 셀 단위(엑셀형).
- `inset` — 컨테이너 안에 박힌 룩(보더 제거).
- `getItemCellClassFn`/`getItemCellStyleFn` — 셀별 동적 class/style.
- `hideConfigBar` — 상단 컬럼 설정 바(컬럼 표시/순서 조작) 숨김.
- `itemKeydown`/`cellKeydown` — 단축키 처리. focusMode 에 따라 둘 중 1개 활용.
- 자식: `<sd-sheet-column>` 들을 content projection 으로 배치.

```html
<sd-sheet [items]="rows()" [trackByFn]="trackById" [(selectedKeys)]="sel" selectMode="multi" key="invoice-list">
  <sd-sheet-column key="no" header="번호" width="80px" />
  <sd-sheet-column key="name" header="이름">
    <ng-template cell [cell]="rows()" let-item>{{ item.name }}</ng-template>
  </sd-sheet-column>
</sd-sheet>
```

## SdSheetColumn — `<sd-sheet-column>` (Directive)

```ts
class SdSheetColumn<T = unknown>
key = input.required<string>();
header = input<string|string[]>("");        // 배열이면 다단 헤더
headerStyle = input<string>();
tooltip = input<string>();
width = input<string>();                     // CSS 값 ("120px"·"1fr")
fixed = input(false);                        // 좌측 고정 컬럼
hidden = input(false);
collapse = input(false);                     // 접힘(헤더만 좁게)
disableSorting = input(false);
disableResizing = input(false);
ordering = input(0);                         // 표시 순서 weight

interface SdSheetCellContext<T = unknown> { ... }   // 셀 템플릿 컨텍스트
```

- `key` — 정렬·설정 저장 식별자. 시트 내 unique.
- `header` 배열 — `["상위", "하위"]` 형태로 2단·3단 헤더 그룹화. 인접 컬럼이 같은 상위 헤더면 머지.
- `fixed` — 좌측 sticky.
- `ordering` — 사용자가 드래그로 바꾼 순서가 우선. 같은 ordering 끼리는 선언 순서.

## SdSheetColumnCellTemplate — `<ng-template cell>` (Directive)

```ts
class SdSheetColumnCellTemplate<T> { cell = input.required<T[]>(); }
```

- `<sd-sheet-column>` 안의 셀 템플릿 마커. `[cell]` 에 items 배열 바인딩(type guard 용도). let-item, let-index, let-depth 사용 가능.

## SdSheetConfigModal — `<sd-sheet-config-modal>` (SdModalContentDef)

```ts
sheetKey = input.required<string>();
controls = input.required<readonly SdSheetColumn[]>();
config = input.required<SdSheetConfig|undefined>();
close = output<SdSheetConfig|undefined>();
```

- 컬럼 표시/숨김/순서/너비 설정 모달. `SdSheet` 내부에서 호출. 직접 부를 일은 거의 없음.

## 타입

```ts
interface SdSheetColumnDef {
  key, header, headerStyle, tooltip, width, fixed, hidden, collapse,
  disableSorting, disableResizing, ordering
}
interface SdSheetHeaderDef {
  text, colspan, rowspan, isLastRow, fixed, colDef, colIndex
}
interface SdSheetConfig {
  columnRecord: Record<string, { width?, hidden?, fixed?, ordering? }>;
}
interface SdSheetItemKeydownEventParam<T> { item: T; event: KeyboardEvent; }
interface SdSheetCellKeydownEventParam<T> { item: T; key: string; event: KeyboardEvent; }
```

- `SdSheetCellContext<T>` 는 셀 템플릿 안에서 노출되는 context 타입(item/index/depth/edit mode 등).

## 주의

- `key` 지정 시 `SdSystemConfigProvider` 가 부착되어 있어야 영구 저장. 미부착이면 `SdLocalStorageProvider` 경유.
- `selectMode=multi` 일 때 `selectedKeys` 는 `trackByFn` 반환 키. `items` 와 별개 배열.
- 트리(`getChildrenFn`) + 정렬(`useAutoSort=true`) 동시 사용 시 정렬은 각 depth 안에서만 적용.
