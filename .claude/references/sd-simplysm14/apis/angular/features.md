# @simplysm/angular — 부가 기능(칸반·권한표·상태프리셋·테마·주소·에디터·시각화)

위 군에 들지 않는 도메인성/표시용 컴포넌트 모음. 특정 화면 기능을 붙일 때 개별로 읽힘.

## 칸반 보드 (드래그 앤 드롭)

레인-카드 보드. `sd-kanban-board` > `sd-kanban-lane` > `sd-kanban` 중첩.

### SdKanbanBoard<L, T> — `sd-kanban-board`
- `selectedValues: model<T[]>` — 선택된 카드 값(Shift+클릭 다중 선택).
- `drop: output<SdKanbanBoardDropInfo<L, T>>` — 카드 드롭 시 emit. `{ sourceKanbanValue?, targetLaneValue?, targetKanbanValue? }`(이동한 카드/대상 레인/대상 카드 값).

### SdKanbanLane<L, T> — `sd-kanban-lane`
- `value: input<L>` — 레인 식별 값(드롭 대상).
- `busy: boolean` — 레인 busy 표시.
- `useCollapse: boolean` — 접기 버튼 노출.
- `collapse: model<boolean>` — 접힘 상태.
- 슬롯: `#titleTpl`(레인 제목), `#toolTpl`(도구). 자식 `sd-kanban` 들 배치.

### SdKanban<L, T> — `sd-kanban`
- `value: input<T>` — 카드 값.
- `selectable: boolean` — Shift+클릭 선택 가능.
- `draggable: boolean` — 드래그 가능.
- `contentClass: string` — 카드 클래스.

```html
<sd-kanban-board [(selectedValues)]="selected" (drop)="onDrop($event)">
  <sd-kanban-lane [value]="'todo'"><sd-kanban [value]="task" [draggable]="true">{{ task.title }}</sd-kanban></sd-kanban-lane>
</sd-kanban-board>
```

## SdPermissionTable — `sd-permission-table`

권한 트리(`SdPermission[]`)를 체크박스 표로 편집. routing-appstructure.md 의 `SdAppStructureProvider.getPermissionsByStructure()` 결과를 입력.
- `value: model<Record<string, boolean>>` — `"코드.액션"→보유` 권한 맵(체크 상태).
- `items: input<SdPermission<TModule>[]>` — 권한 트리.
- `disabled: boolean` — 읽기 전용.

## SdStatePreset<TState> — `sd-state-preset`

화면 상태(필터 등)를 이름 붙여 저장·복원하는 프리셋 바. 프리셋은 `injectSdSystemConfigResource(key)` 로 영속.
- `key: input.required<string>` — 프리셋 저장 키(화면 식별).
- `state: model.required<TState>` — 현재 화면 상태. 프리셋 클릭 시 이 모델에 복원, 저장 시 현재 값을 프리셋에 기록.
- `size: "sm"|"lg"` — 크기.
- `SdStatePresetDef<TState>` — `{ name: string; state: TState }`(저장 단위).

## SdThemeSelector — `sd-theme-selector`

글자 크기 증감 + 다크모드 토글 드롭다운. `SdThemeProvider`(infra.md)를 조작. 입력 없음.

## SdAddressSearchModal — `sd-address-search-modal`

다음(Daum) 우편번호 검색 모달(`SdModalContentDef<Address>`). 스크립트를 동적 로드해 표시, 선택 시 주소 emit.
- `close: output<Address>` — 선택 결과. `Address` = `{ postNumber?: string; address?: string; buildingName?: string }`(미입력 필드는 undefined 보존).

```ts
const addr = await sdModal.showAsync({ type: SdAddressSearchModal, title: "주소 검색", inputs: {} });
```

## SdTiptapEditor — `sd-tiptap-editor`

리치텍스트(Tiptap) 에디터. 색상·정렬·목록 툴바 내장.
- `value: model<string>` — HTML 값.
- `disabled`/`readonly`/`required: boolean` — 상태.
- `placeholder: string` — 빈 상태 안내.
- `validatorFn: (value) => string | undefined` — 커스텀 검증(반환 문자열이 오류).
- `extensions: AnyExtension[]` — 추가 Tiptap 확장.

보조 헬퍼 `useTiptapToolbar(opt)` — 에디터 시그널을 받아 툴바 상태/명령을 반환(`activeStates`/`activeColor`/`execCmd`/`refreshActiveStates`/`toggleColorPicker`/`applyColor` 등). `TiptapActiveStates` 는 h1/h2/bold/italic/underline/strike/bulletList/orderedList/blockquote/codeBlock/align* 의 활성 여부 맵.

## 시각화 컴포넌트

### SdLabel — `sd-label`
배지/태그.
- `theme` — 테마 계열(미지정=기본 회색).
- `color: string` — 직접 색상 지정.
- `clickable: boolean` — 클릭 가능 스타일.

### SdNote — `sd-note`
강조 노트 블록.
- `theme` — 테마 계열.
- `size: "sm"|"lg"`, `inset: boolean`.

### SdProgress — `sd-progress`
진행 바.
- `theme: input.required<테마 계열>` — 바 색상(필수).
- `value: input.required<number>` — 진행값(0~1, 내부에서 0~100% 클램프).
- `size: "sm"|"lg"`, `inset: boolean`.

### SdCalendar<T> — `sd-calendar`
월 단위 달력에 항목 배치.
- `items: input.required<T[]>` — 표시 항목.
- `getItemDateFn: input.required<(item, index) => DateOnly>` — 항목의 날짜.
- `yearMonth: DateOnly` — 표시 연월(기본 이번 달 1일).
- `weekStartDay: number` — 주 시작 요일(기본 0=일).
- `minDaysInFirstWeek: number` — 첫 주 최소 일수(기본 1).
- 컨텐츠: `<ng-template [itemOf]>` 로 날짜 셀 항목 렌더.

### SdBarcode — `sd-barcode`
바코드/QR SVG 렌더(bwip-js).
- `type: input.required<BarcodeType>` — 심볼 종류(`qrcode`/`code128`/`ean13`/`datamatrix` 등 다수, `BarcodeType` union).
- `value: string` — 인코딩할 데이터(빈 값이면 미표시).

### SdEcharts — `sd-echarts`
ECharts 차트(SVG 렌더).
- `option: input.required<echarts.EChartsOption>` — 차트 옵션. 변경 시 갱신.
- `notMerge: boolean` — 옵션 set 시 기존과 병합하지 않고 교체.
- `loading: boolean` — 로딩 오버레이.
