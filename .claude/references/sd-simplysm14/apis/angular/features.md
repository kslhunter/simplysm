# @simplysm/angular — 기능 컴포넌트(주소검색·에디터·시각화·칸반)

특정 도메인 기능을 제공하는 독립 컴포넌트 묶음. 필요한 화면에서 개별적으로 가져다 씀.

## 주소 검색

- **SdAddressSearchModal** — 다음(카카오) 우편번호 검색 모달 컴포넌트. `SdModalContentDef<Address>` 구현이라 `SdModalProvider.showAsync({ type: SdAddressSearchModal, ... })` 로 띄움. 외부 스크립트(daum postcode) 를 동적 로드. `close = output<Address>()`.
- **Address** — `{ postNumber: string | undefined; address: string | undefined; buildingName: string | undefined }`. 결측은 undefined 보존.

## 에디터

- **SdTiptapEditor** `<sd-tiptap-editor [(value)]="...">` — tiptap 기반 리치텍스트 에디터(HTML 문자열).
  - value = model<string>() — HTML 본문.
  - disabled/readonly/required: boolean — 비활성/읽기전용/필수(빈 값 검증).
  - placeholder?: string.
  - validatorFn?: (value) => string | undefined — 커스텀 검증 메시지.
  - extensions?: AnyExtension[] — 추가 tiptap 확장.

## 시각화

- **SdLabel** `<sd-label>` — 작은 배지/태그. `theme`(8색), `color?: string`(임의 배경색), `clickable: boolean`(호버 강조 + 커서).
- **SdNote** `<sd-note>` — 안내 박스. `theme`(8색), `size`("sm"|"lg"), `inset: boolean`.
- **SdProgress** `<sd-progress [theme]="..." [value]="...">` — 진행률 막대. `theme: input.required`(8색), `value: input.required<number>`(0~1, 백분율 표시·막대 폭은 0~100% clamp), `size`("sm"|"lg"), `inset: boolean`.
- **SdCalendar<T>** `<sd-calendar [items]="..." [getItemDateFn]="...">` — 월간 달력에 항목 배치.
  - items: input.required<T[]>.
  - getItemDateFn: input.required<(item, index) => DateOnly> — 항목의 날짜.
  - yearMonth: input(기본 이번 달 1일) — 표시 월.
  - weekStartDay: number(기본 0=일요일) / minDaysInFirstWeek: number(기본 1) — 주 시작·첫 주 기준.
  - (contentChild) `itemOf` 템플릿 필수 — 날짜 칸 항목 렌더.
- **SdBarcode** `<sd-barcode [type]="..." [value]="...">` — bwip-js 로 바코드 SVG 렌더. `type: input.required<BarcodeType>`(qrcode/code128/ean13 등 다수 — `BarcodeType` 유니온 참조), `value?: string`(빈 값이면 미표시).
- **SdEcharts** `<sd-echarts [option]="...">` — ECharts 차트. `option: input.required<echarts.EChartsOption>`, `notMerge: boolean`(기본 false, true 면 옵션 병합 대신 교체), `loading: boolean`(로딩 오버레이).

## 칸반

- **SdKanbanBoard<L, T>** `<sd-kanban-board>` — 칸반 보드 컨테이너(드래그 앤 드롭 조율).
  - selectedValues = model<T[]>([]) — 선택된 카드 값(Shift+클릭 다중 선택).
  - (output) drop: `SdKanbanBoardDropInfo<L,T>` = `{ sourceKanbanValue?; targetLaneValue?; targetKanbanValue? }` — 드롭 시 발생(소스 카드→대상 레인/카드).
- **SdKanbanLane<L, T>** `<sd-kanban-lane [value]="...">` — 레인(열). `value?: L`(레인 식별), `busy: boolean`, `useCollapse: boolean`(접기 버튼) + `collapse = model(false)`, `toolTpl`/`titleTpl`(도구·제목 템플릿). 전체선택 체크박스(선택가능 카드 있을 때).
- **SdKanban<L, T>** `<sd-kanban [value]="...">` — 카드. `value?: T`, `selectable: boolean`(Shift+클릭 선택 허용), `draggable: boolean`(드래그 허용), `contentClass?: string`. 드래그 시 다른 카드/레인 위에 드롭 위치 표시.
- 타입: **SdKanbanBoardDropInfo<L,T>**(위), **SdKanbanDragRef<L,T>**(`{ value(); heightOnDrag() }`), **SdKanbanDropTarget<L,T>**(`{ targetLaneValue(); targetKanbanValue?() }`) — 보드 내부 드래그/드롭 대상 규약.
