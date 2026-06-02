# @simplysm/angular — 시트 (sd-sheet)

데이터 그리드. 정렬·선택·페이징·컬럼 고정·셀 편집·트리 확장·컬럼 설정 영속을 한 컴포넌트로 다룸. 컬럼은 `sd-sheet-column` 디렉티브로 선언하고 셀은 `ng-template[cell]` 로 그림.

## SdSheet<TItem>

`<sd-sheet [items]="..." [trackByFn]="...">`.

### Inputs
- key?: string — 지정 시 컬럼 폭/순서/숨김/고정 상태를 `SdSystemConfigProvider` 에 영속하고 설정 버튼(톱니) 노출. 사용자 컬럼 커스터마이즈를 저장하려면 지정.
- items: TItem[] — 표시 데이터(기본 []).
- trackByFn: (item, index) => unknown — 행 식별 키. 선택키도 이 값 기준. 기본 `(item) => item`.
- selectMode?: "single"|"multi" — 행 선택 모드. 미지정 시 선택 비활성. single=단일 행, multi=다중 + 헤더 전체선택 체크박스.
- autoSelect?: "click"|"focus" — 행 자동 선택 트리거. "click"=행 클릭 시 선택, "focus"=셀 포커스 이동만으로 선택. 키보드 위주면 "focus".
- getItemSelectableFn?: (item) => boolean | string — 행 선택 가능 여부. string 반환 시 그 사유로 선택 불가.
- getChildrenFn?: (item, index) => TItem[] | undefined — 트리 자식. 지정 시 확장(▶) 토글 표시.
- useAutoSort: boolean — 클라이언트 정렬. true 면 sorts 변경 시 sd-sheet 가 items 를 직접 정렬. 서버측 정렬/페이징이면 false 로 두고 외부에서 items 재조회.
- visiblePageCount: number — 페이지네이션 한 그룹 표시 수(기본 10).
- totalPageCount: number — 서버측 페이징 시 전체 페이지 수.
- itemsPerPage: number — >0 이면 클라이언트 페이징(페이지당 행 수).
- focusMode: "row"|"cell" — 키보드 포커스 단위(기본 cell). "row"=행 전체 이동, "cell"=셀 단위 이동(셀 편집·복사 화면이면 cell).
- inset: boolean — 테두리 제거(컨테이너 내부 삽입).
- contentStyle?: string — 스크롤 영역 인라인 스타일.
- getItemCellClassFn?/getItemCellStyleFn?: (item, colKey) => ... — 셀별 클래스/스타일 동적 지정.
- hideConfigBar: boolean — 상단 도구 바(설정·페이지네이션) 숨김.
- columnControlsInput: readonly SdSheetColumn[] — 템플릿이 아닌 코드로 컬럼을 넘길 때(투영 `sd-sheet-column` 과 합쳐짐).

### Outputs / Models
- (output) itemKeydown: `SdSheetItemKeydownEventParam<TItem>` = `{ item; event: KeyboardEvent }` — 행에서 키 입력.
- (output) cellKeydown: `SdSheetCellKeydownEventParam<TItem>` = `{ item; key: string; event }` — 셀에서 키 입력(key=컬럼 key).
- (model) selectedKeys: unknown[] — 선택된 행 키 배열(trackByFn 값).
- (model) expandedItems: TItem[] — 확장된 트리 행.
- (model) sorts: SortingDef[] — 정렬 상태(`{ key; desc }[]`, 헤더 클릭으로 토글, selection-managers.md 참조).
- (model) currentPage: number — 현재 페이지(0 기반).

## SdSheetColumn<T>

`<sd-sheet-column [key]="...">` 디렉티브. 컬럼 1개 정의.
- key: input.required<string> — 컬럼 식별·정렬/설정 키.
- header: string | string[] — 헤더 텍스트(배열이면 다단 헤더 그룹).
- headerStyle?: string — 헤더 셀 스타일.
- tooltip?: string — 헤더 툴팁.
- width?: string — 컬럼 폭.
- fixed: boolean — 좌측 고정 컬럼.
- hidden: boolean — 숨김.
- collapse: boolean — 접힘(폭 축소).
- disableSorting: boolean — 정렬 비활성.
- disableResizing: boolean — 폭 조절 비활성.
- ordering: number — 컬럼 정렬 순서(기본 0).
- (contentChild) cellTplRef: `ng-template[cell]` 필수 — 셀 본문. headerTpl/summaryTpl 템플릿으로 커스텀 헤더·요약 행.

## SdSheetColumnCellTemplate<T>

`<ng-template cell let-item="item" ...>` 디렉티브. 컬럼 셀 본문 템플릿 규약. 컨텍스트 `SdSheetCellContext<T>` = `{ $implicit; item; index; depth; edit }`(edit=현재 셀 편집모드 여부). `cell = input.required<T[]>()` 로 항목 배열 타입 추론.

```html
<sd-sheet [items]="rows()" [trackByFn]="trackByFn" [(selectedKeys)]="selectedKeys" selectMode="multi">
  <sd-sheet-column key="name" header="이름" [fixed]="true">
    <ng-template cell let-item="item">{{ item.name }}</ng-template>
  </sd-sheet-column>
</sd-sheet>
```

## SdSheetConfigModal

컬럼 설정(폭/순서/고정/숨김) 편집 모달 컴포넌트. `SdSheet` 가 설정 버튼 클릭 시 내부적으로 띄움. 직접 사용 드묾.

## 타입(types.ts)

- **SdSheetColumnDef** — 내부 계산된 컬럼 정의(`key; header; headerStyle; tooltip; width; fixed; hidden; collapse; disableSorting; disableResizing; ordering`).
- **SdSheetHeaderDef** — 헤더 셀 레이아웃 정의(`text; colspan; rowspan; isLastRow; fixed; colDef; colIndex`).
- **SdSheetConfig** — 영속되는 설정(`columnRecord: Record<key, { width?; hidden?; fixed?; ordering? }>`).
- **SdSheetItemKeydownEventParam<T>** / **SdSheetCellKeydownEventParam<T>** — 위 output 이벤트 형태.
