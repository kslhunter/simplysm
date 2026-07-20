# @simplysm/sd-angular — UI controls (폼, 레이아웃, 내비게이션, 시각화, 리스트)

- sd-* 표준 컨트롤. 모두 standalone, OnPush.
- `boolean` input 은 transformBoolean(빈 attribute=true).
- 공통 테마 리터럴 `Theme = "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"`(컨트롤별 추가 값 명시).
- 시트(sd-sheet)는 [sheet.md](./sheet.md), 데이터/공유데이터 화면은 [features.md](./features.md), 오버레이 provider 는 [overlay.md](./overlay.md).

## 폼 — 버튼

### `sd-button` (SdButtonControl)

- **type: "button" | "submit"**(기본 `"button"`) — submit 이면 form 제출.
- **theme** — Theme + link 변형(`link`, `link-primary`…`link-blue-gray`, `link-rev`).
- **inline / inset: boolean** — 인라인 표시 / 외곽선 없는 inset.
- **size: "sm" | "lg"** — 크기. **disabled: boolean**.
- **buttonStyle / buttonClass: string** — 내부 button 요소 스타일/클래스. ripple 효과 포함.

### `sd-anchor` (SdAnchorControl)

- **disabled: boolean** — 비활성(cursor, 이벤트 차단). **theme** — Theme + `link-*` 변형.

### `sd-additional-button` (SdAdditionalButtonControl)

표시값 + 액션버튼 결합용. **size: "sm"|"lg"**, **inset: boolean**.

### `sd-select-button` (SdSelectButtonControl)

ripple 만 적용된 선택 버튼 컨테이너(입력 없음).

### `sd-modal-select-button` (SdModalSelectButtonControl)

모달로 값 선택하는 버튼.

- **modal: TSdSelectModalInfo<ISdSelectModal<T>> (required)** — 띄울 선택 모달.
- **value: model<single이면 K, multi면 K[]>** — 선택값(selectMode 에 따른 타입).
- **selectMode: "single" | "multi"**(기본 single) — 선택 모드.
- **disabled / required / inset: boolean**, **size: "sm"|"lg"**, **searchIcon**(기본 tabler search), **selectedItems: model<T[]>**.

## 폼 — 선택/토글

### `sd-checkbox` (SdCheckboxControl)

- **value: model<boolean>**(기본 false) — 체크 상태.
- **canChangeFn: (item: boolean) => boolean | Promise<boolean>**(기본 항상 true) — 변경 허용 검증(setupModelHook).
- **icon**(기본 tabler check), **radio: boolean**(라디오 모양), **disabled/inline/inset: boolean**, **size: "sm"|"lg"**, **theme**(Theme+`white`), **contentStyle: string**.

### `sd-checkbox-group` / `sd-checkbox-group-item`

- group: **value: model<T[]>**(기본 []), **disabled: boolean**. item: **value: T (required)**, **inline: boolean**.

### `sd-switch` (SdSwitchControl)

- **value: model<boolean>**(기본 false), **disabled/inline/inset: boolean**, **size: "sm"|"lg"**, **theme**.

### `sd-select` / `sd-select-item` (SdSelectControl<M, T>)

드롭다운 선택. ng-content 로 `<sd-select-item>` 또는 `[itemOf]` 템플릿.

- **value: model<single이면 T, multi면 T[]>** / **open: model<boolean>** — 선택값, 드롭다운 열림.
- **selectMode: "single" | "multi"**(기본 single).
- **items: T[]** / **trackByFn** / **getChildrenFn: (item,index,depth) => T[]** — 트리 선택 지원.
- **required/disabled/inline/inset: boolean**, **size: "sm"|"lg"**.
- **hideSelectAll: boolean** — 다중모드 전체선택 숨김. **multiSelectionDisplayDirection: "vertical"|"horizontal"** — 다중 선택칩 방향.
- **contentClass/contentStyle/placeholder: string**.
- **sd-select-item**: **value: any**, **disabled/hidden: boolean**.

### `sd-state-preset` (SdStatePresetControl)

필터/뷰 상태 프리셋 저장, 복원 버튼군.

- **state: model<any>** — 현재 상태. **key: string (required)** — 저장 키. **size: "sm"|"lg"**.
- **ISdStatePreset** `{ name: string; state: any }`.

## 폼 — 입력

### `sd-textfield` (SdTextfieldControl<K extends keyof TSdTextfieldTypes>)

- **type: K (required)** — 입력 종류.
  - **TSdTextfieldTypes**: number→number; text/password/color/email/format→string; date/month/year→DateOnly; datetime/datetime-sec→DateTime; time/time-sec→Time.
  - (`sdTextfieldTypes` 는 키 배열 상수)
- **value: model<TSdTextfieldTypes[K]>** — 값(타입 자동).
- **placeholder/title/inputStyle/inputClass: string**.
- **disabled/readonly/required: boolean**.
- **min/max: TSdTextfieldTypes[K]**, **minlength/maxlength/step/minDigits: number**, **pattern: string** — 검증.
- **validatorFn: (value) => string | undefined** — 커스텀 검증(메시지 반환).
- **format: string** — 표시 포맷. **autocomplete: string**. **useNumberComma: boolean**(기본 true) — number 천단위 콤마.
- **inline/inset: boolean**, **size: "sm"|"lg"**, **theme**.

### `sd-textarea` (SdTextareaControl)

- **value: model<string>**, **placeholder/title: string**, **minRows: number**(기본 1).
- **disabled/readonly/required/inline/inset: boolean**, **size: "sm"|"lg"**, **theme**.
- **validatorFn: (value: string|undefined) => string|undefined**, **inputStyle/inputClass: string**.

### `sd-range` (SdRangeControl<K>)

from-to 범위 입력(sd-textfield 두 개).

- **type: K (required)**, **from/to: model<TSdTextfieldTypes[K]>**, **inputStyle: string**, **required/disabled: boolean**.

### `sd-date-range-picker` (SdDateRangePicker)

- **periodType: model<"일"|"월"|"범위">**(기본 "범위") — 기간 단위.
- **from/to: model<DateOnly>**, **required: boolean**.

### `sd-numpad` (SdNumpadControl)

숫자 키패드(키오스크).

- **value: model<number>**, **placeholder: string**, **required/inputDisabled/useEnterButton/useMinusButton: boolean**.
- **enterButtonClick: output** — Enter 버튼 클릭.

### `sd-quill-editor` (SdQuillEditorControl)

- **value: model<string>** — HTML 내용. **disabled: boolean**.

### `sd-form` (SdFormControl)

- **submit: output<SubmitEvent>** — 검증 통과 제출. **invalid: output** — 검증 실패.
- **formElRef** — 내부 form 요소 참조. `requestSubmit()` 로 제출 트리거.

## 레이아웃

### `sd-dock-container` / `sd-dock`

가장자리 도킹 레이아웃.

- **sd-dock-container**: **contentClass: string**, dockControls 자식.
- **sd-dock**: **key: string**(크기 저장), **position: "top"|"bottom"|"right"|"left"**(기본 top), **resizable: boolean**.

### `sd-pane` (`[sd-pane]`) / `sd-card` / `sd-table` (`[sd-table]`)

- sd-pane: 스크롤 가능 내용 영역.
- sd-card: 카드 박스.
- sd-table: 테이블 스타일.

### `sd-flex` (`sd-flex,[sd-flex]`) / `[sd-flex-grow]`

- sd-flex: **vertical/inline: boolean**. flex 컨테이너.
- sd-flex-grow: **`sd-flex-grow`: "auto"|"fill"|"min" (required)** — flex 자식 성장 방식.

### `sd-grid` (`[sd-grid]`) / `sd-grid-item`

- item: **colSpan: number**(기본 1), **colSpanSm/colSpanXs/colSpanXxs: number** — 반응형 span.

### `sd-form-box` / `sd-form-box-item` / `sd-form-table`

폼 라벨-입력 정렬 레이아웃. sd-form-box: **inline: boolean**.

### `sd-gap` (SdGapControl)

간격 박스. **height/width: "xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl"**, **heightPx/widthPx/widthEm: number**.

### `sd-view` / `sd-view-item` (SdViewControl)

값에 따라 자식 view-item 하나만 표시(탭 없는 스위처).

- view: **value: any**(현재), **fill: boolean**. view-item: **value: any**(매칭 키).

### `sd-kanban-board` / `sd-kanban-lane` / `sd-kanban` (제네릭 `<L, T>`)

드래그 칸반. board: **selectedValues: model<T[]>**, **drop: output<ISdKanbanBoardDropInfo<L,T>>**(`{ sourceKanbanValue?; targetLaneValue?; targetKanbanValue? }`).

- lane: **value: L**, **busy/useCollapse: boolean**, **collapse: model<boolean>**, `toolTpl`/`titleTpl`.
- kanban: **value: T**, **selectable/draggable: boolean**, **contentClass: string**.

## 내비게이션

### `sd-sidebar-container` / `sd-sidebar` / `sd-sidebar-menu` / `sd-sidebar-user`

- sidebar-menu: **menus: ISdSidebarMenu[]**(`{ title; codeChain; url?; icon?; children? }`), **layout: "accordion"|"flat"**, **getMenuIsSelectedFn: (menu) => boolean**.
- sidebar-user: **userMenu: ISidebarUserMenu**(`{ title; menus: { title; onClick }[] }`), **menuTitle: string**.

### `sd-topbar-container` / `sd-topbar` / `sd-topbar-menu` / `sd-topbar-user`

- topbar: **sidebarContainer: SdSidebarContainerControl** — 연결된 사이드바(햄버거 토글).
- topbar-menu: **menus: ISdTopbarMenu[]**(`{ title; codeChain; url?; icon?; children? }`), **getMenuIsSelectedFn**.
- topbar-user: **menus: { title; onClick }[] (required)**.

### `sd-tab` / `sd-tab-item` (SdTabControl)

- tab: **value: model<any>**. tab-item: **value: any**.

### `sd-tabview` / `sd-tabview-item` (제네릭 `<T>`)

탭 + 내용 전환.

- tabview: **value: model<T>**.
- tabview-item: **value: T (required)**, **header: string**.

### `sd-collapse` / `sd-collapse-icon`

- collapse: **open: boolean** — 펼침(높이 애니메이션).
- collapse-icon: **icon**(기본 tabler chevron-down), **open: boolean**, **openRotate: number**(기본 90, 열림 시 회전각).

### `sd-pagination` (SdPaginationControl)

- **currentPage: model<number>**(기본 0, 0-base), **totalPageCount: number**(기본 0), **visiblePageCount: number**(기본 10).

## 시각화

### `sd-barcode` (SdBarcodeControl)

bwip-js 로 SVG 바코드 렌더.

- **type: TBarcodeType (required)** — 바코드 종류(`code128`/`qrcode`/`ean13`/`datamatrix` 등 bwip-js 전체 bcid).
- **value: string** — 인코딩 텍스트.

### `sd-calendar` (SdCalendarControl<T>)

월 달력에 항목 배치.

- **items: T[] (required)**, **getItemDateFn: (item,index) => DateOnly (required)** — 항목→날짜 매핑.
- **yearMonth: DateOnly**(기본 이번 달 1일) — 표시 연월.
- **weekStartDay: number**(기본 0=일), **minDaysInFirstWeek: number**(기본 1).
- `[itemOf]` 셀 템플릿 필수(context = `{ $implicit; item; index; depth }`).

### `sd-echarts` (SdEchartsControl)

- **option: echarts.EChartsOption (required)** — 차트 옵션. **loading: boolean**(기본 false).

### `sd-label` (SdLabelControl)

- **theme** — Theme. **color: string** — 직접 색상(theme 대신). **clickable: boolean** — 클릭 커서.

### `sd-note` (SdNoteControl)

안내 박스. **theme**, **size: "sm"|"lg"**, **inset: boolean**.

### `sd-progress` (SdProgressControl)

- **theme (required)**, **value: number (required)** — 0-100 진행률. **inset: boolean**, **size: "sm"|"lg"**.

## 리스트

### `sd-list` / `sd-list-item`

- list: **inset: boolean**.
- list-item:
  - **open: model<boolean>**(아코디언 펼침), **selected: boolean**, **selectedIcon: string**.
  - **layout: "flat"|"accordion"**(기본 accordion), **readonly: boolean**, **contentStyle/contentClass: string**, `toolTpl`.
  - 자식 `sd-list` 중첩 지원.

## 오버레이 컨트롤 (provider 가 주로 동적생성; 직접 사용 가능)

### `sd-modal` (SdModalControl)

- **open: model<boolean>**, **title: string (required)**, **key: string**.
- **hideHeader/hideCloseButton/useCloseByBackdrop/useCloseByEscapeKey/resizable: boolean**, **movable: boolean**(기본 true), **float/fill: boolean**.
- **heightPx/widthPx/minHeightPx/minWidthPx: number**, **position: "bottom-right"|"top-right"**, **headerStyle: string**, **actionTplRef: TemplateRef**.

### `sd-busy-container` (SdBusyContainerControl)

- **busy: boolean**, **message: string**, **type: "spinner"|"bar"|"cube"**, **progressPercent: number**.

### `sd-toast` / `sd-toast-container`

- toast: **open/useProgress: boolean**, **theme: "info"|"success"|"warning"|"danger"**, **progress: number**(기본 0), **message: string**.
- toast-container: **overlap: boolean** — 새 토스트가 기존 것 대체.
