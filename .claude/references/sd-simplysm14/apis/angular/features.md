# @simplysm/angular — 부가 기능(테마·주소·에디터·시각화·칸반·프리셋)

화면에 부분적으로 끼워 쓰는 독립 기능 컴포넌트·프로바이더. 테마(다크/폰트), 주소검색 모달, TipTap 리치에디터, 시각화(라벨/노트/진행률/달력/바코드/차트), 칸반 보드, 상태 프리셋.

## SdThemeProvider / SdThemeSelector

- `SdThemeProvider` — 루트 테마 프로바이더. `dark: WritableSignal<boolean>`(다크모드, body 클래스 토글), `fontSize: WritableSignal<number>`(루트 폰트크기 px), `fontSizePresets: readonly number[]`(`[12,14,16,20,24,28]`), `increaseFontSize()`/`decreaseFontSize()`(프리셋 단계 이동). `provideSdAngular` 가 localStorage 영속화 연결.
- `<sd-theme-selector>` — 드롭다운 UI. 폰트크기 ±버튼·다크모드 스위치로 프로바이더 조작. input 없음.

## SdAddressSearchModal

`<sd-address-search-modal>` — 다음(카카오) 우편번호 검색 모달. `SdModalContentDef<Address>` 구현(`SdModalProvider.showAsync` 의 type 으로 사용). 스크립트 동적 로드 후 임베드, 선택 시 결과 emit.

- `close = output<Address>()` — 선택 결과. `Address = { postNumber?; address?; buildingName? }`(결측 보존).
- input 없음. 스크립트 로드 실패 시 에러 메시지 표시.

## SdTiptapEditor

`<sd-tiptap-editor>` — TipTap 기반 리치텍스트 에디터(HTML 값, 툴바: 제목·굵게·기울임·밑줄·취소선·색상·리스트 등).

- `value = model<string>()` — HTML 콘텐츠. 빈 내용이면 `undefined`(결측 보존).
- `disabled`/`readonly` — 비활성/읽기전용(편집 불가, 툴바 숨김).
- `required` — 필수 검증(폼 연동).
- `placeholder` — 빈 상태 안내(미지정 확장 시 적용).
- `validatorFn?: (value) => string | undefined` — 커스텀 검증 메시지.
- `extensions?: AnyExtension[]` — TipTap 확장 직접 지정(미지정 시 기본 확장 + placeholder).
- `editor: WritableSignal<Editor | undefined>` — 내부 TipTap 인스턴스(@internal, 고급/테스트용).

## 시각화 컴포넌트

- `<sd-label>` — 인라인 라벨/배지. `theme`(공통 8색), `color?`(임의 배경색), `clickable`(호버 효과·커서).
- `<sd-note>` — 강조 박스. `theme`(공통 8색), `size`(`"sm"|"lg"`), `inset`.
- `<sd-progress>` — 진행률 막대. `value = input.required<number>()`(0~1, 퍼센트 표시·막대폭), `theme = input.required<...>()`(공통 8색), `size`, `inset`.
- `<sd-calendar>` — 월 달력에 항목 배치. 제네릭 `<T>`. `items = input.required<T[]>()`, `getItemDateFn = input.required<(item, index) => DateOnly>()`(항목 날짜), `yearMonth = input(...)`(표시 월, 기본 이번달 1일), `weekStartDay = input(0)`(주 시작 요일), `minDaysInFirstWeek = input(1)`. 셀 항목은 `<ng-template [itemOf]>`.
- `<sd-barcode>` — 바코드/QR SVG 렌더(bwip-js). `type = input.required<BarcodeType>()`(바코드 종류, `"qrcode"`/`"code128"`/`"ean13"` 등 다수 리터럴 유니온), `value = input<string>()`(인코딩 텍스트, 빈값이면 미표시).
- `<sd-echarts>` — ECharts 차트. `option = input.required<EChartsOption>()`(차트 옵션), `notMerge = input(false)`(setOption 병합 여부), `loading = input(false)`(로딩 스피너). 리사이즈 자동 반영.

## SdKanbanBoard / SdKanbanLane / SdKanban

드래그 가능한 칸반 보드. 보드 > 레인 > 카드 계층.

- `<sd-kanban-board>` — 보드 컨테이너. 제네릭 `<L, T>`. `selectedValues = model<T[]>([])`(선택된 카드 값), `drop = output<SdKanbanBoardDropInfo<L, T>>()`(드롭 시 `{ sourceKanbanValue?; targetLaneValue?; targetKanbanValue? }`).
- `<sd-kanban-lane>` — 레인(열). 제네릭 `<L, T>`. `value = input<L>()`(레인 값), `busy`(로딩), `useCollapse`(접기 버튼), `collapse = model(false)`. `#titleTpl`/`#toolTpl` 슬롯. 선택 가능 카드 있으면 전체선택 체크박스.
- `<sd-kanban>` — 카드. 제네릭 `<L, T>`. `value = input<T>()`(카드 값), `selectable`(Shift클릭 선택), `draggable`(드래그 이동), `contentClass`.

타입: `SdKanbanBoardDropInfo<L,T>`, `SdKanbanDragRef<L,T>`(`value()`/`heightOnDrag()`), `SdKanbanDropTarget<L,T>`(`targetLaneValue()`/`targetKanbanValue?()`).

## SdStatePreset

`<sd-state-preset>` — 화면 상태(필터 등)를 명명 프리셋으로 저장·복원(시스템설정 영속화). 제네릭 `<TState>`.

- `key = input.required<string>()` — 프리셋 저장 키(태그명과 결합).
- `state = model.required<TState>()` — 현재 상태(저장/적용 대상). 프리셋 클릭 시 이 값으로 복원.
- `size = input<"sm"|"lg">()` — 크기.
- ⭐버튼=현재 상태 새 프리셋 저장, 각 프리셋=클릭 적용/저장/삭제. `SdStatePresetDef<TState> = { name: string; state: TState }`.
