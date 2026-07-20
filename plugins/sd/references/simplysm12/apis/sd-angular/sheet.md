# @simplysm/sd-angular — sheet (sd-sheet 데이터 그리드)

`sd-sheet` 는 컬럼 고정/리사이즈/정렬/선택/페이징/트리, 셀 편집을 지원하는 테이블 그리드.
컬럼은 `<sd-sheet-column>` 디렉티브 + `<ng-template cell>` 로 정의.
사용자별 컬럼 구성은 `key` 와 SdSystemConfig 로 영속화.

## `sd-sheet` (SdSheetControl<T>)

### 데이터/표시
- **items: T[]**(기본 []) — 행 데이터.
- **trackByFn: (item, index) => any**(기본 item 자신) — 행 추적.
- **key: string (required)** — 컬럼 구성 저장 키(SdSystemConfig: `sd-sheet.<key>`).
- **hideConfigBar: boolean** — 우측 설정 톱니바 숨김.
- **inset: boolean** — 외곽선 없는 inset 스타일.
- **contentStyle: string** — 내용 영역 스타일.
- **getItemCellClassFn / getItemCellStyleFn: (item: T, colKey: string) => string | undefined** — 셀별 클래스/스타일.

### 정렬
- **sorts: model<ISdSortingDef[]>**(기본 []) — 정렬 정의 배열(`{ key; desc }`). 헤더 클릭으로 토글.
- **useAutoSort: boolean** — true 면 sorts 로 items 를 클라이언트 정렬(false 면 sorts 만 emit, 서버 정렬용).

### 페이징
- **currentPage: model<number>**(기본 0, 0-base).
- **totalPageCount: number**(기본 0) — 서버 페이징 총 페이지.
- **visiblePageCount: number**(기본 10) — 페이지 버튼 노출 수.
- **itemsPerPage: number** — 지정 시 클라이언트 페이징(items 분할).

### 트리
- **getChildrenFn: (item: T, index: number) => T[] | undefined** — 자식 행 반환(트리 모드).
- **expandedItems: model<T[]>**(기본 []) — 펼쳐진 행.

### 선택
- **selectMode: "single" | "multi"** — 선택 모드(미지정 시 선택 비활성).
- **selectedItems: model<T[]>**(기본 []).
- **autoSelect: "click" | "focus"** — 행 클릭/포커스 시 자동 선택.
- **getItemSelectableFn: (item: T) => boolean | string** — 선택 가능 여부(string=불가 사유 툴팁).

### 포커스/이벤트
- **focusMode: "row" | "cell"**(기본 cell) — 키보드 포커스 단위.
- **itemKeydown / cellKeydown: output<ISdSheetItemKeydownEventParam<T>>** — 행/셀 키다운(`{ item; key?; event }`).

## `<sd-sheet-column>` (SdSheetColumnDirective<T>)
- **key: string (required)** — 컬럼 식별, 구성 저장 키.
- **fixed: boolean** — 좌측 고정.
- **header: string | string[]** — 헤더 텍스트(배열이면 다단 헤더/그룹핑).
- **headerStyle / tooltip / width: string** — 헤더 스타일, 툴팁, 너비(예 `"100px"`).
- **disableSorting / disableResizing / hidden / collapse: boolean** — 정렬, 리사이즈 비활성, 숨김, 접기.
- 자식 `<ng-template cell let-item>` 필수(셀 본문), 선택적 `#headerTpl`/`#summaryTpl`.

## `SdSheetColumnCellTemplateDirective` (`ng-template[cell]`)
셀 템플릿. context `SdSheetColumnCellTemplateContext<T>` = `{ $implicit: T; item: T; index: number; depth: number; edit: boolean }`(edit=현재 셀 편집모드 여부).

## `sd-sheet-config-modal` (SdSheetConfigModal<T>, implements ISdModal<ISdSheetConfig>)
컬럼 고정/너비/순서/숨김 편집 모달(설정바에서 자동 호출).
- **sheetKey: string (required)**, **controls: readonly SdSheetColumnDirective<T>[] (required)**, **config: ISdSheetConfig | undefined (required)**.
- **close: output<ISdSheetConfig | undefined>** — 변경된 구성.

## 타입
- **ISdSheetConfig** `{ columnRecord: Record<string, ISdSheetConfigColumn | undefined> | undefined }`.
- **ISdSheetConfigColumn** `{ fixed?; width?; displayOrder?; hidden? }` — 컬럼별 사용자 구성.
- **ISdSheetColumnDef<T>** `{ control: SdSheetColumnDirective<T>; fixed: boolean; width; headerStyle }` — 레이아웃 계산 결과.
- **ISdSheetHeaderDef** `{ control; fixed; width; style; text; colspan; rowspan; isLastRow }` — 다단 헤더 셀.
- **ISdSheetItemKeydownEventParam<T>** `{ item: T; key?: string; event: KeyboardEvent }`.

## 내부 엔진 클래스 (SdSheetControl 가 생성자 주입; 직접 사용 드묾)
구현 세부로 export 됨. 시트 동작 커스터마이즈/디버깅 시에만 참조.
- **SdSheetLayoutEngine<T>** — config+컬럼으로 columnDefs/headerDefs(고정, 순서, 숨김, 다단 헤더) 계산.
- **SdSheetCellAgent** — 셀 주소(r,c), 편집모드 상태 관리.
- **SdSheetColumnFixingManager** — 고정 컬럼 left offset 계산.
- **SdSheetDomAccessor** — 시트 DOM 셀/행 접근.
- **SdSheetFocusIndicatorRenderer** — 포커스 셀 인디케이터 렌더.
- **SdSheetSelectRowIndicatorRenderer<T>** — 선택 행 인디케이터 렌더.
