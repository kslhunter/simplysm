# @simplysm/angular — 시트(sd-sheet)

다건 목록·편집 표(그리드). 컬럼 디렉티브 + 셀 템플릿으로 구성하며, 선택·정렬·페이지·트리펼침·셀 편집·컬럼 고정/리사이즈/설정저장을 내장. `sd-crud-list` 는 이 시트를 감싼 표준 골격(crud.md). 셀 본문·정렬·폭 규약은 client-component.md "시트 컬럼·셀 표준" 을 따름.

## SdSheet<TItem>

selector `sd-sheet`. 직속 자식으로 `<sd-sheet-column>` 들을 둠.

입력:
- `key: string` — 컬럼 구성(폭/숨김/순서) 영속화 키. 지정 시 `injectSdSystemConfigResource` 로 저장/복원. 사용자별 컬럼 설정을 유지하려면 지정.
- `items: TItem[]` — 행 데이터.
- `trackByFn: (item, index) => unknown` — 행 키 함수(기본은 item 자체). 선택 키·재렌더 추적.
- `selectMode: "single"|"multi"` — 행 선택 모드. 미지정 시 선택 비활성. 다중 선택 화면이면 `"multi"`.
- `autoSelect: "click"|"focus"` — 자동 선택 트리거. `"click"` = 클릭 시 선택, `"focus"` = 포커스 이동만으로 선택. 키보드 위주 화면이면 `"focus"`.
- `getItemSelectableFn: (item) => boolean | string` — 행 선택 가능 여부(문자열 반환 시 불가 사유).
- `getChildrenFn: (item, index) => TItem[] | undefined` — 자식 행 반환(트리 모드). 값이 있으면 펼침 토글 표시.
- `useAutoSort: boolean` — 클라이언트 정렬. true 면 `sorts` 변경 시 시트가 `items` 를 직접 정렬. 서버측 정렬/페이징이면 false 로 두고 외부에서 재조회.
- `visiblePageCount: number` — 페이지네이터가 한 번에 보이는 페이지 번호 수(기본 10).
- `totalPageCount: number` — 서버 페이징 총 페이지 수(서버 페이징 시 지정, `itemsPerPage` 와 택일).
- `itemsPerPage: number` — 클라이언트 페이징 시 페이지당 행 수(0 이면 페이징 안 함).
- `focusMode: "row"|"cell"` — 키보드 포커스 단위(기본 `"cell"`). `"row"` = 행 전체 이동, `"cell"` = 셀 단위 이동. 셀 편집·복사 화면이면 `"cell"`.
- `inset: boolean` — 테두리/모서리 없는 inset 스타일.
- `contentStyle: string` — 본문 인라인 스타일.
- `getItemCellClassFn`/`getItemCellStyleFn: (item, colKey) => ...` — 셀별 클래스/스타일.
- `hideConfigBar: boolean` — 상단 컬럼 설정 바 숨김.

출력/모델:
- `itemKeydown: output<{ item, event }>` — 행 단위 키다운.
- `cellKeydown: output<{ item, key, event }>` — 셀 단위 키다운(`key` 는 컬럼 키).
- `selectedKeys: model<unknown[]>` — 선택된 행 키 배열(`trackByFn` 결과).
- `expandedItems: model<TItem[]>` — 펼쳐진 트리 행.
- `sorts: model<SortingDef[]>` — 정렬 상태(`{ key, desc }[]`).
- `currentPage: model<number>` — 현재 페이지(0 기반).

```html
<sd-sheet [items]="items()" [(selectedKeys)]="selectedKeys" selectMode="single"
  [trackByFn]="trackByFn" [(currentPage)]="page" [totalPageCount]="pageLength()">
  <sd-sheet-column [key]="'name'" [header]="'이름'">
    <ng-template [cell]="items()" let-item="item"><div class="p-xs-sm">{{ item.name }}</div></ng-template>
  </sd-sheet-column>
</sd-sheet>
```

## SdSheetColumn<T>

`sd-sheet-column` 디렉티브. 컬럼 1개를 정의.

- `key: input.required<string>` — 컬럼 식별 키(정렬·셀 키다운·구성 저장 단위).
- `header: string | string[]` — 헤더 텍스트. 배열이면 다단(그룹) 헤더.
- `headerStyle: string` — 헤더 셀 인라인 스타일.
- `tooltip: string` — 헤더 툴팁.
- `width: string` — 컬럼 폭(미지정이 기본=자동). px 지정은 명시 지시 시에만.
- `fixed: boolean` — 좌측 고정 컬럼.
- `hidden: boolean` — 숨김.
- `collapse: boolean` — 접힘(헤더만, 폭 최소).
- `disableSorting: boolean` — 정렬 비활성.
- `disableResizing: boolean` — 폭 리사이즈 비활성.
- `ordering: number` — 컬럼 표시 순서.
- 컨텐츠: `<ng-template [cell]="items()" let-item="item">`(셀 본문), `#headerTpl`(커스텀 헤더), `#summaryTpl`(요약 행).

셀 컨텍스트(`SdSheetCellContext`): `$implicit`/`item`/`index`/`depth`(트리 깊이)/`edit`(편집 모드 여부).

## SdSheetColumnCellTemplate<T>

`ng-template[cell]` 디렉티브. 셀 본문 템플릿에 타입 가드를 부여.

- `cell: input.required<T[]>` — 타입 추론용 더미(보통 `items()` 전달). 실제 데이터는 `<sd-sheet>` 의 `items` 가 보유.

## SdSheetConfigModal

컬럼 폭/숨김/고정/순서를 사용자에게 편집시키는 모달(`SdModalContentDef<SdSheetConfig>`). 시트 설정 바에서 자동 호출되므로 직접 띄울 일은 드묾.

## 타입 (types)

- `SdSheetColumnDef` — 컬럼 해석 결과(`key`/`header`/`width`/`fixed`/`hidden`/`collapse`/`disableSorting`/`disableResizing`/`ordering` 등).
- `SdSheetHeaderDef` — 다단 헤더 셀 정의(`text`/`colspan`/`rowspan`/`isLastRow`/`fixed`/`colDef`/`colIndex`).
- `SdSheetConfig` — 영속화되는 컬럼별 사용자 설정(`columnRecord[key] = { width?, hidden?, fixed?, ordering? }`).
- `SdSheetItemKeydownEventParam<T>` — `{ item, event }`(행 키다운 페이로드).
- `SdSheetCellKeydownEventParam<T>` — `{ item, key, event }`(셀 키다운 페이로드).
