# @simplysm/angular — 시트(sd-sheet)

다건 목록·편집 표(그리드). 컬럼 디렉티브 + 셀 템플릿으로 구성하며 선택·정렬·페이지·트리펼침·셀 편집·컬럼 고정/리사이즈/설정저장을 내장. `sd-crud-list` 가 이 시트를 감싼 표준 골격([crud.md](./crud.md)). 셀 본문·요약 행 작성 규약은 [client-component.md](../../manuals/client-component.md) 의 '시트 컬럼·셀 표준' 참조.

## `SdSheet<TItem>` — `<sd-sheet>`

- `items: TItem[]` (기본 `[]`) — 행 데이터.
- `trackByFn: (item, index) => unknown` (기본 `(item) => item`) — 행 식별/추적.
- `selectMode: "single"|"multi"|undefined` — `"multi"` = 체크박스 피처 컬럼 + 헤더 전체선택 + shift-click 범위 선택; `"single"` = 행별 화살표 셀렉터; `undefined` = 선택 UI 없음.
- `autoSelect: "click"|"focus"|undefined` — `"click"` = 행/셀 클릭 시 선택; `"focus"` = 셀 포커스 시 선택; `undefined` = 자동 선택 없음.
- `getItemSelectableFn: (item) => boolean | string | undefined` — 행별 선택 가능 여부. `true`=가능, `false`=불가, `string`=불가+사유 툴팁.
- `getChildrenFn: (item, index) => TItem[] | undefined` — 설정 시 트리펼침 활성(펼침 피처 컬럼·depth·caret).
- `useAutoSort: boolean` (기본 false) — true 면 표시 전 클라이언트 정렬(정렬 매니저). 서버 정렬/페이징이면 false.
- `itemsPerPage: number` (기본 0) — 클라이언트 페이징 크기(`0`=페이징 없음).
- `totalPageCount: number` (기본 0) — 외부 총 페이지 수(서버 페이징). `0` 이면 `items`/`itemsPerPage` 로 산출.
- `visiblePageCount: number` (기본 10) — 페이지 번호 표시 개수.
- `key: string` — 컬럼 설정 영속화 키(`injectSdSystemConfigResource`). 설정 시 설정(톱니) 버튼 표시. 설정 모달은 key 없으면 throw.
- `focusMode: "row"|"cell"` (기본 `"cell"`) — `"cell"` = 포커스 셀 강조; `"row"` = 셀 인디케이터 숨기고 행만 강조.
- `inset: boolean` (기본 false) — true 면 테두리·라운드 제거(다른 컨테이너 내장용).
- `hideConfigBar: boolean` (기본 false) — true 면 상단 도구 바(설정 버튼+페이지네이션) 숨김.
- `contentStyle: string` — 스크롤 컨테이너 인라인 스타일.
- `getItemCellClassFn: (item, colKey) => string | undefined` / `getItemCellStyleFn: (item, colKey) => string | undefined` — 셀별 클래스/스타일.
- `columnControlsInput: readonly SdSheetColumn[]` (기본 `[]`) — 투영 컬럼과 합쳐질 프로그래밍 컬럼.
- model: `selectedKeys: unknown[]` (선택 키) / `expandedItems: TItem[]` (펼친 행) / `sorts: SortingDef[]` (정렬) / `currentPage: number` (0-base).
- output: `itemKeydown: SdSheetItemKeydownEventParam<TItem>` (`{ item, event }`) / `cellKeydown: SdSheetCellKeydownEventParam<TItem>` (`{ item, key, event }`).
- 주요 메서드: `onConfigButtonClick()` — `SdSheetConfigModal` 열어 컬럼 설정 영속화(key 없으면 throw). `onHeaderClick(event, cell)` — 정렬 토글(shift=다중 정렬).

```html
<sd-sheet [items]="items()" [trackByFn]="trackByFn" [(selectedKeys)]="selectedKeys" [(currentPage)]="page" [totalPageCount]="pageLength()">
  <sd-sheet-column [key]="'name'" [header]="'이름'">
    <ng-template [cell]="items()" let-item="item"><div class="p-xs-sm">{{ item.name }}</div></ng-template>
  </sd-sheet-column>
</sd-sheet>
```

## `SdSheetColumn<T>` — `<sd-sheet-column>` (디렉티브)

컬럼 1개 선언. `sd-sheet`/`sd-crud-list` 직속 자식으로 두면 자동 투영.

- `key: string` (required) — 컬럼 키(설정·셀/헤더 템플릿 lookup·정렬 키). select 별칭과 일치시키면 서버 정렬에 컬럼 분기 없이 처리([client-crud.md](../../manuals/client-crud.md)).
- `header: string | string[]` (기본 `""`) — 헤더 텍스트; `string[]` = 다단/그룹 헤더.
- `headerStyle: string` / `tooltip: string` — 헤더 셀 스타일/툴팁.
- `width: string` — 컬럼 폭(미지정=자동; px 지정은 명시 지시 시만, 매뉴얼 '폭 약속').
- `fixed: boolean` — true 면 좌측 고정(sticky).
- `hidden: boolean` — true 면 미렌더.
- `collapse: boolean` — 레이아웃 엔진 collapse 플래그.
- `disableSorting: boolean` — true 면 헤더 정렬 클릭·아이콘 비활성.
- `disableResizing: boolean` — true 면 리사이저 핸들 제거.
- `ordering: number` (기본 0) — 컬럼 순서 가중치(작을수록 앞).
- 콘텐츠: `[cell]` 셀 템플릿(필수, `SdSheetColumnCellTemplate`), `#headerTpl`(커스텀 헤더), `#summaryTpl`(요약 행 셀).

## `SdSheetColumnCellTemplate<T>` — `ng-template[cell]` (디렉티브)

`<ng-template [cell]="items()">` 를 셀 본문으로 표시하고 컨텍스트 타입을 좁힘.

- `cell: T[]` (required) — items 배열(타입 추론용 더미, 실제 데이터는 `sd-sheet` 의 `[items]` 보유).
- 정적 `ngTemplateContextGuard` — 컨텍스트를 `SdSheetCellContext<T>` 로 좁힘.

셀 컨텍스트 `SdSheetCellContext<T>` 필드: `$implicit: T` / `item: T` / `index: number`(표시 페이지 내 행 인덱스) / `depth: number`(트리 깊이) / `edit: boolean`(인라인 편집 모드 여부). 템플릿에서 `let-item="item"`·`let-index="index"`·`let-depth="depth"`·`let-edit="edit"` 로 받음.

## `SdSheetConfigModal` — `<sd-sheet-config-modal>`

컬럼 설정(고정·순서·폭·숨김) 편집 모달. `SdModalContentDef<SdSheetConfig | undefined>` 구현. `sd-sheet` 가 설정 버튼 클릭 시 자동으로 띄움 — 화면에서 직접 다룰 일은 드묾.

- `sheetKey: string` (required) / `controls: readonly SdSheetColumn[]` (required) / `config: SdSheetConfig | undefined` (required).
- `close: SdSheetConfig | undefined` — OK 시 빌드된 설정, 취소 시 `undefined`, 초기화 확정 시 `{ columnRecord: {} }`.

## 타입

- `SdSheetColumnDef` — `{ key: string; header: string|string[]; headerStyle?: string; tooltip?: string; width?: string; fixed: boolean; hidden: boolean; collapse: boolean; disableSorting: boolean; disableResizing: boolean; ordering: number }`. 컬럼 디렉티브에서 파생한 정규화 정의.
- `SdSheetHeaderDef` — `{ text: string; colspan: number; rowspan: number; isLastRow: boolean; fixed: boolean; colDef: SdSheetColumnDef | undefined; colIndex: number }`. 다단 헤더 셀 1개 정의.
- `SdSheetConfig` — `{ columnRecord: Record<string, { width?: string; hidden?: boolean; fixed?: boolean; ordering?: number }> }`. 사용자별 영속 설정.
- `SdSheetItemKeydownEventParam<T>` — `{ item: T; event: KeyboardEvent }`. `itemKeydown` 페이로드.
- `SdSheetCellKeydownEventParam<T>` — `{ item: T; key: string; event: KeyboardEvent }`. `cellKeydown` 페이로드(`key`=컬럼 키).
- `SdSheetCellContext<T>` — 위 셀 컨텍스트(`sd-sheet-column.ts` 에서 export).
- `SortingDef` — `{ key: string; desc: boolean }`(`sd-sheet.ts` 재export; 정렬 매니저 원본은 [shared-data.md](./shared-data.md)).
