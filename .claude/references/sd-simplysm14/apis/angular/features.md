# @simplysm/angular — 기능 컴포넌트 (칸반·권한표·상태프리셋·테마선택·주소검색·에디터·시각화)

위 군에 들지 않는 도메인성/표시용 컴포넌트 모음. 특정 화면 기능을 붙일 때 개별로 읽힘.

## 칸반 (드래그 보드)

### SdKanbanBoard<L, T> (`sd-kanban-board`)

레인(`L`)·카드(`T`) 드래그 보드의 루트. 드래그 종료 시 drop 정보 emit.

- `selectedValues: model<T[]>` — Shift+클릭으로 선택된 카드 값들.
- `drop: output<SdKanbanBoardDropInfo<L, T>>` — 카드 drop 시 발화.
- `SdKanbanBoardDropInfo<L, T> = { sourceKanbanValue?: T; targetLaneValue?: L; targetKanbanValue?: T }` — 옮긴 카드·대상 레인·대상 카드(앞에 끼움).
- `SdKanbanDragRef`/`SdKanbanDropTarget` — 내부 드래그/드롭 인터페이스.

### SdKanbanLane<L, T> (`sd-kanban-lane`)

레인(컬럼). 카드들을 담고 drop 대상이 됨.

- `value: input<L>` — 레인 값(drop 시 `targetLaneValue`).
- `busy: boolean` — 레인 busy 오버레이.
- `useCollapse: boolean` — 접기 토글 표시. `collapse: model<boolean>` — 접힘 상태.
- 슬롯: `#titleTpl`(제목), `#toolTpl`(도구). 전체선택 체크박스는 선택 가능 카드가 있을 때.

### SdKanban<L, T> (`sd-kanban`)

카드. 드래그 소스 + 선택 대상.

- `value: input<T>` — 카드 값.
- `draggable: boolean` — true 면 드래그 가능.
- `selectable: boolean` — true 면 Shift+클릭 선택 가능.
- `contentClass: string` — 카드 본문 클래스.
- 사용: `<sd-kanban-board (drop)="onDrop($event)"><sd-kanban-lane [value]="lane"><sd-kanban [value]="card" [draggable]="true">...</sd-kanban></sd-kanban-lane></sd-kanban-board>`.

## SdPermissionTable<TModule> (`sd-permission-table`)

권한 트리를 표로 표시·편집(use/edit 체크박스). `SdAppStructureProvider.getPermissionsByStructure(...)` 결과를 입력.

- `value: model<Record<string, boolean>>` — `<코드>.<use|edit>` → 부여 여부 맵.
- `items: SdPermission<TModule>[]` — 권한 트리(routing-appstructure.md 의 `SdPermission`).
- `disabled: boolean` — 편집 비활성(조회).

## SdStatePreset<TState> (`sd-state-preset`)

화면 검색/필터 상태를 이름붙은 프리셋으로 저장·복원(즐겨찾기). 프리셋은 `injectSdSystemConfigResource` 로 영속.

- `key: input.required<string>` — 프리셋 저장 키.
- `state: model.required<TState>` — 현재 상태(프리셋 적용 시 이 모델에 set). 저장은 현재 state 를 스냅샷.
- `size: "sm"|"lg"` — 버튼 크기.
- `SdStatePresetDef<TState> = { name: string; state: TState }` — 저장된 프리셋 1개.
- 별(추가)·저장·삭제 동작은 내장(이름 prompt/덮어쓰기 confirm 모달 사용).

## SdThemeProvider 관련 — SdThemeSelector (`sd-theme-selector`)

글자 크기 증감 + 다크모드 스위치를 담은 드롭다운 UI. 내부에서 `SdThemeProvider`(infra.md)를 조작.

- (입력 없음) 탑바 등에 `<sd-theme-selector />` 로 배치. 글자 크기는 `fontSizePresets` 단계, 다크는 `dark` 토글.

## SdAddressSearchModal (`sd-address-search-modal`)

다음(카카오) 우편번호 검색 모달(`SdModalContentDef<Address>`). 외부 스크립트를 동적 로드해 임베드.

- `close: output<Address>` — 선택한 주소 emit.
- `initialized: Signal<boolean>` — 스크립트 로드 완료 여부.
- `Address = { postNumber?: string; address?: string; buildingName?: string }` — 결과(각 필드 결측 가능).
- 사용: `const addr = await this._sdModal.showAsync({ type: SdAddressSearchModal, title: "주소 검색", inputs: {} }); if (!addr) return;`.

## SdTiptapEditor (`sd-tiptap-editor`)

Tiptap 기반 리치 텍스트(HTML) 에디터. 툴바 내장.

- `value: model<string>` — HTML 문자열.
- `disabled: boolean` — 비활성. `readonly: boolean` — 읽기 전용.
- `required: boolean` — 빈 값이면 invalid. `validatorFn: (value) => string | undefined` — 커스텀 검증.
- `placeholder: string` — 빈 에디터 안내.
- `extensions: AnyExtension[]` — 추가 Tiptap 확장.

## 시각화·표시 컴포넌트 (features/visual)

### SdLabel (`sd-label`)

배지/태그. `<ng-content>` 본문.

- `theme: "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"` — 배경 색(미지정=회색 darker). 상태 표시에 의미별 색.
- `color: string` — 임의 배경색 직접 지정(theme 대신).
- `clickable: boolean` — true 면 포인터 커서 + hover 효과.

### SdNote (`sd-note`)

안내 박스(연한 배경). `<ng-content>` 본문.

- `theme: "primary"|...|"blue-gray"` — 박스 색(미지정=회색 lightest).
- `size: "sm"|"lg"` — 패딩.
- `inset: boolean` — 테두리 제거.

### SdProgress (`sd-progress`)

가로 진행 바 + 퍼센트 텍스트.

- `value: input.required<number>` — 진행값(0~1, percent 파이프로 표시).
- `theme: input.required<...>` — 바 색(필수).
- `size: "sm"|"lg"` / `inset: boolean` — 크기/테두리.

### SdCalendar<T> (`sd-calendar`)

월 달력 그리드에 항목을 날짜별로 배치. 항목 템플릿으로 셀 내용 렌더.

- `items: input.required<T[]>` — 표시할 항목들.
- `getItemDateFn: input.required<(item, index) => DateOnly>` — 항목의 날짜 추출.
- `yearMonth: input<DateOnly>` — 표시 연월(기본 이번 달 1일).
- `weekStartDay: number` — 주 시작 요일(0=일, 기본 0). `minDaysInFirstWeek: number` — 첫 주 최소 일수(기본 1).
- 항목 템플릿: `<ng-template [itemOf]="items()" let-item="item">`(필수).

### SdBarcode (`sd-barcode`)

바코드/QR 등을 SVG 로 렌더(bwip-js).

- `type: input.required<BarcodeType>` — 바코드 종류. `BarcodeType` 은 `"code128"|"qrcode"|"ean13"|"datamatrix"|...`(bwip-js 의 100+ 심볼로지 리터럴 유니온). 대표: `"code128"`(범용 1D), `"qrcode"`(QR), `"ean13"`/`"upca"`(상품), `"datamatrix"`(소형 2D).
- `value: string` — 인코딩할 데이터(빈 값이면 미렌더).

### SdEcharts (`sd-echarts`)

ECharts 차트(SVG 렌더). 리사이즈 자동 대응.

- `option: input.required<echarts.EChartsOption>` — 차트 옵션. 변경 시 재설정.
- `notMerge: boolean` — true 면 옵션 병합 없이 교체(기본 false=병합).
- `loading: boolean` — true 면 로딩 인디케이터.
