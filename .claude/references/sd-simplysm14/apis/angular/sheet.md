# @simplysm/angular — 시트 (sd-sheet)

다건 목록·편집 표(그리드). 컬럼 디렉티브 + 셀 템플릿으로 구성하며, 선택·정렬·페이지·트리펼침·셀 편집·컬럼 고정/리사이즈/설정저장을 내장. `sd-crud-list` 는 이 시트를 감싼 표준 골격(crud.md). 셀 본문·정렬·폭 규약은 client-component.md "시트 컬럼·셀 표준" 을 따름.

## SdSheet<TItem> (`sd-sheet`)

### 입력

- `key: string` — 시트 설정(컬럼 폭/숨김/고정/순서) 저장 키. 지정하면 설정 버튼 + `SdSystemConfigProvider` 영속·복원. 없으면 설정 비활성.
- `items: TItem[]` — 표시할 행 데이터.
- `trackByFn: (item, index) => unknown` — 행 추적/선택 키 함수(기본 item 자체). 선택은 이 반환값을 키로 사용.
- `selectMode: "single"|"multi"` — 선택 모드. 미지정이면 선택 비활성. single 은 행 화살표, multi 는 체크박스(전체선택 헤더).
- `autoSelect: "click"|"focus"` — 자동 선택 트리거. `"click"` = 행/셀 클릭 시 선택, `"focus"` = 셀 포커스 이동만으로 선택. 키보드 위주 화면이면 `"focus"`.
- `getItemSelectableFn: (item) => boolean | string` — 행 선택 가능 여부. `false`/문자열(사유) 면 선택 불가(문자열은 툴팁으로 표시).
- `getChildrenFn: (item, index) => TItem[] | undefined` — 트리 자식 함수. 지정 시 펼침 기능 활성(들여쓰기 + 토글).
- `useAutoSort: boolean` — 클라이언트 정렬. true 면 `sorts` 변경 시 시트가 직접 `items` 정렬. 서버 페이징/정렬이면 false(외부에서 재조회). `sd-crud-list` 는 `totalPageCount===0` 일 때만 true.
- `totalPageCount: number` — 서버 페이징 총 페이지 수. >0 이면 서버 페이징 모드(시트는 slice 안 함).
- `itemsPerPage: number` — 클라이언트 페이징 페이지당 행 수. >0 이면 시트가 직접 slice. `totalPageCount` 와 택일.
- `visiblePageCount: number` — 페이지네이터 표시 번호 개수(기본 10).
- `focusMode: "row"|"cell"` — 키보드 포커스 단위. `"cell"`(기본) = 셀 단위 이동·셀 포커스 표시, `"row"` = 행 단위(셀 표시 없음). 셀 편집/복사 화면이면 `"cell"`.
- `inset: boolean` — 테두리·radius 제거(컨테이너 내장).
- `contentStyle: string` — 스크롤 컨테이너 인라인 스타일.
- `getItemCellClassFn: (item, colKey) => string` / `getItemCellStyleFn: (item, colKey) => string | undefined` — 셀별 클래스/스타일(삭제행 취소선 등).
- `hideConfigBar: boolean` — 상단 설정/페이지 바 숨김.
- `columnControlsInput: readonly SdSheetColumn[]` — 템플릿 외부에서 컬럼 디렉티브를 주입(투영 컬럼과 합쳐짐). `sd-crud-list` 가 투영 컬럼을 시트로 전달할 때 사용.

### 출력·모델

- `selectedKeys: model<unknown[]>` — 선택된 행 키 배열(`trackByFn` 반환값). single 도 배열(길이 0/1).
- `expandedItems: model<TItem[]>` — 펼쳐진 트리 항목.
- `sorts: model<SortingDef[]>` — 정렬 상태(`{ key; desc }[]`). 헤더 클릭으로 토글(Shift=다중). `useAutoSort` 면 직접 정렬, 아니면 외부 재조회 트리거.
- `currentPage: model<number>` — 현재 페이지(0-based).
- `itemKeydown: output<SdSheetItemKeydownEventParam<TItem>>` — 행에서 키 입력(`{ item; event }`).
- `cellKeydown: output<SdSheetCellKeydownEventParam<TItem>>` — 셀에서 키 입력(`{ item; key; event }`. key=컬럼 key).

### 컬럼·셀

#### SdSheetColumn<T> (`sd-sheet-column`)

컬럼 정의 디렉티브. `<sd-sheet>`(또는 `sd-crud-list`) 직속 자식으로 둠.

- `key: input.required<string>` — 컬럼 식별 키(설정 저장·셀 키).
- `header: string | string[]` — 헤더 텍스트(배열이면 다단 헤더로 그룹).
- `headerStyle: string` — 헤더 셀 스타일.
- `tooltip: string` — 헤더 도움말(? 표시).
- `width: string` — 컬럼 폭(미지정=자동). px 지정은 명시 지시 시만(client-component.md).
- `fixed: boolean` — 좌측 고정 컬럼.
- `hidden: boolean` — 숨김.
- `collapse: boolean` — 접힘 컬럼.
- `disableSorting: boolean` — 헤더 클릭 정렬 비활성.
- `disableResizing: boolean` — 폭 드래그 리사이즈 비활성.
- `ordering: number` — 컬럼 정렬 순서.
- 템플릿: `<ng-template [cell]="items()" let-item="item">`(필수, 셀 본문), `#headerTpl`(헤더 커스텀), `#summaryTpl`(요약 행).
- `SdSheetCellContext<T> = { $implicit; item: T; index: number; depth: number; edit: boolean }` — 셀 컨텍스트. `let-edit="edit"` 로 편집 모드 여부.

#### SdSheetColumnCellTemplate<T> (`ng-template[cell]`)

셀 본문 템플릿 디렉티브. `cell: input.required<T[]>` 는 타입 추론용 더미(실제 데이터는 시트 `items`). `let-item`/`let-index`/`let-depth`/`let-edit` 컨텍스트 제공.

사용:
```html
<sd-sheet [items]="items()" [(selectedKeys)]="selectedKeys" selectMode="single" [trackByFn]="trackByFn">
  <sd-sheet-column [key]="'name'" [header]="'이름'">
    <ng-template [cell]="items()" let-item="item">
      <div class="p-xs-sm">{{ item.name }}</div>
    </ng-template>
  </sd-sheet-column>
</sd-sheet>
```

#### SdSheetConfigModal (`sd-sheet-config-modal`)

컬럼 폭/순서/고정/숨김을 사용자가 조정하는 설정 모달(`SdModalContentDef<SdSheetConfig | undefined>`). `key` 있는 시트의 설정 버튼이 자동으로 띄움 → 직접 호출 불필요.

- `sheetKey: input.required<string>` / `controls: input.required<readonly SdSheetColumn[]>` / `config: input.required<SdSheetConfig | undefined>` — 대상 시트 키·컬럼들·현재 설정.
- `close: output<SdSheetConfig | undefined>` — 변경된 설정(취소 시 undefined).

### 타입 (data/sheet/types)

- `SdSheetColumnDef` — 내부 계산된 컬럼 정의(`key/header/headerStyle/tooltip/width/fixed/hidden/collapse/disableSorting/disableResizing/ordering`).
- `SdSheetHeaderDef` — 헤더 셀 렌더 정의(`text/colspan/rowspan/isLastRow/fixed/colDef/colIndex`).
- `SdSheetConfig = { columnRecord: Record<string, { width?; hidden?; fixed?; ordering? }> }` — 영속되는 시트 설정.
- `SdSheetItemKeydownEventParam<T> = { item: T; event: KeyboardEvent }`.
- `SdSheetCellKeydownEventParam<T> = { item: T; key: string; event: KeyboardEvent }`.

### 요약 행

컬럼 중 하나라도 `#summaryTpl` 을 가지면 헤더 하단에 요약 행이 고정 렌더(warning 배경). 집계 값은 시트가 계산하지 않으므로 화면에서 `computed` 로 만들어 넣음(client-component.md).
