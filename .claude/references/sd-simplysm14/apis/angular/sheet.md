# @simplysm/angular — 시트 (sd-sheet)

선택·다중정렬·트리확장·컬럼 고정/숨김/리사이즈·페이지네이션·셀편집·설정 영속화를 갖춘 데이터 그리드. 컬럼은 `<sd-sheet-column>` 디렉티브 + `<ng-template [cell]>` 셀 템플릿으로 선언. 선택/정렬/확장은 selection-managers 컴포저블을 내부 사용.

## SdSheet

`<sd-sheet>` — 데이터 그리드. 제네릭 `<TItem>`.

inputs:
- `key = input<string>()` — 설정 영속화 키. 지정 시 설정 버튼·컬럼폭/순서/고정/숨김을 `SdSystemConfigProvider` 에 저장.
- `items = input<TItem[]>([])` — 표시 데이터.
- `trackByFn = input<(item, index) => unknown>` — 행 키 추출. 기본 `(item) => item`. 선택키·정렬 추적 기준.
- `selectMode: "single"|"multi"` — 선택 모드. 미지정 시 선택 비활성. multi 면 헤더 전체선택 체크박스.
- `autoSelect: "click"|"focus"` — 자동 선택 트리거. `"click"` = 행/셀 클릭 시 선택, `"focus"` = 셀 포커스 시 선택. 키보드 위주 화면이면 `"focus"`.
- `getItemSelectableFn?: (item) => boolean | string` — 행 선택 가능 여부. `string` 반환 시 비활성 + 그 문자열을 툴팁 사유로 표시.
- `getChildrenFn?: (item, index) => TItem[] | undefined` — 트리 자식. 지정 시 확장 토글 컬럼 노출.
- `useAutoSort = input(false)` — 클라이언트 정렬. true 면 `sorts` 변경 시 시트가 직접 `items` 정렬. 서버측 정렬/페이징이면 false 로 두고 외부에서 재조회.
- `visiblePageCount = input(10)`/`totalPageCount = input(0)`/`itemsPerPage = input(0)` — 페이지네이션. `totalPageCount>0` 면 서버 페이징, `itemsPerPage>0` 면 클라이언트 페이징.
- `focusMode: "row"|"cell"` — 키보드 포커스 단위. `"row"` = 행 강조만, `"cell"` = 셀 단위 포커스/편집. 기본 `"cell"`.
- `inset = input(false)` — 테두리 없는 삽입형.
- `contentStyle` — 스크롤 컨테이너 인라인 스타일.
- `getItemCellClassFn?: (item, colKey) => string` / `getItemCellStyleFn?: (item, colKey) => string | undefined` — 셀별 동적 클래스/스타일.
- `hideConfigBar = input(false)` — 상단 설정/페이지 바 숨김.
- `columnControlsInput = input<readonly SdSheetColumn[]>([])` — 투영 외 추가 컬럼 컨트롤(예: CRUD 목록이 삭제 컬럼 주입).

outputs:
- `itemKeydown = output<SdSheetItemKeydownEventParam<TItem>>()` — 행에서 키 입력(`{ item, event }`).
- `cellKeydown = output<SdSheetCellKeydownEventParam<TItem>>()` — 셀에서 키 입력(`{ item, key, event }`, key=컬럼키).

models(양방향):
- `selectedKeys = model<unknown[]>([])` — 선택 행 키 배열.
- `expandedItems = model<TItem[]>([])` — 펼친 트리 항목.
- `sorts = model<SortingDef[]>([])` — 정렬 정의(`{ key, desc }[]`). 헤더 클릭으로 토글(Shift=다중).
- `currentPage = model(0)` — 현재 페이지(0-base).

## SdSheetColumn

`<sd-sheet-column>` 디렉티브 — 컬럼 정의. 제네릭 `<T>`.

- `key = input.required<string>()` — 컬럼 식별키(설정 저장·정렬·이벤트 기준).
- `header: string | string[]` — 헤더 텍스트. 배열이면 다단(그룹) 헤더.
- `headerStyle`/`tooltip` — 헤더 스타일·툴팁.
- `width` — 컬럼 폭(CSS 값).
- `fixed = input(false)` — 좌측 고정.
- `hidden = input(false)` — 숨김.
- `collapse = input(false)` — 접힘.
- `disableSorting = input(false)` — 정렬 비활성.
- `disableResizing = input(false)` — 폭 조절 비활성.
- `ordering = input(0)` — 컬럼 정렬 순서.
- 셀 본문은 `<ng-template [cell]="items()" let-item="item" let-edit="edit">`, 헤더 커스텀은 `#headerTpl`, 합계행은 `#summaryTpl`.

`SdSheetCellContext<T>` (셀 템플릿 컨텍스트): `$implicit`/`item`(행 데이터), `index`(행 인덱스), `depth`(트리 깊이), `edit`(현재 셀 편집모드 여부).

## SdSheetColumnCellTemplate

`<ng-template [cell]>` 디렉티브 — 셀 본문 템플릿 마커. `cell = input.required<T[]>()` 로 타입 추론용 items 를 받아 `SdSheetCellContext<T>` 컨텍스트 타입 가드 제공.

## SdSheetConfigModal

`<sd-sheet-config-modal>` — 시트 설정(컬럼 표시/순서/고정/폭) 편집 모달. `sd-sheet` 의 설정 버튼이 내부적으로 띄움. 직접 사용은 드묾.

## 타입

- `SdSheetColumnDef` — 해석된 컬럼 정의(`key`/`header`/`width`/`fixed`/`hidden`/`collapse`/`disableSorting`/`disableResizing`/`ordering`/`headerStyle`/`tooltip`).
- `SdSheetHeaderDef` — 헤더 셀 메타(`text`/`colspan`/`rowspan`/`isLastRow`/`fixed`/`colDef`/`colIndex`).
- `SdSheetConfig` — 영속화 형태. `columnRecord: Record<키, { width?; hidden?; fixed?; ordering? }>`.
- `SdSheetItemKeydownEventParam<T>` — `{ item, event }`.
- `SdSheetCellKeydownEventParam<T>` — `{ item, key, event }`.
- `SortingDef`(re-export) — `{ key: string; desc: boolean }`.

```html
<sd-sheet [items]="rows()" [(selectedKeys)]="sel" [selectMode]="'multi'"
          [(sorts)]="sorts" [useAutoSort]="true" key="order-sheet">
  <sd-sheet-column key="name" header="이름" [fixed]="true">
    <ng-template [cell]="rows()" let-item="item">{{ item.name }}</ng-template>
  </sd-sheet-column>
</sd-sheet>
```
