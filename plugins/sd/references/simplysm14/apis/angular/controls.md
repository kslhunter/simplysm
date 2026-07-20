# @simplysm/angular — 폼, 입력 컨트롤

버튼, 텍스트/날짜/숫자 입력, checkbox/switch, select/dropdown, form, collapse, tab, list, gap, pagination 컨트롤 군.
모두 standalone, OnPush, `ViewEncapsulation.None`.
값 컨트롤은 대부분 `value`/`from`/`to` 를 `model()` 로 노출하고 `required` 시 내부 `setupInvalid` 로 native validation에 참여함.

- 공통 lint/template 규칙: [client-rules.md](../../manuals/client-rules.md)
- `SdTab`/`SdTabItem` 사용법: [client-tab.md](../../manuals/client-tab.md)

공통 패턴(여러 컨트롤 공유):

- `theme` literal(8색) — 컨트롤 배경/링크 색을 해당 테마로 칠함.
  - 값: `"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"`.
  - `SdCheckbox` 만 `"white"` 추가.
- `size` — `"sm" | "lg"`(미지정=기본). padding/높이 단계. `SdButton` 만 `"xs"` 추가.
- `inline`(boolean) — `inline-block` + 자동 너비(기본은 full-width block).
- `inset`(boolean) — 테두리/라운드 제거(평면/오버레이 스타일).
- `disabled`/`readonly`(boolean) — 입력 차단. readonly/disabled/inset는 값 미리보기(`_contents`)를 렌더함.

## 버튼

### `SdButton` (`sd-button`)

```ts
class SdButton {
  type: InputSignal<"button" | "submit">; // default "button"
  theme: InputSignal<ButtonTheme | undefined>;
  inline: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"xs" | "sm" | "lg" | undefined>;
  disabled: InputSignal<boolean>;
  buttonStyle: InputSignal<string | undefined>;
  buttonClass: InputSignal<string | undefined>;
}
```

native `<button>` 을 감싸고 `<ng-content>` 를 투영함. ripple은 `!disabled()` 일 때 켜짐.

- `type` — `"button"`(기본) 일반 버튼, `"submit"` 폼 제출 버튼. native `type` 속성에 그대로.
- `theme` — 19개 literal. 미지정 시 기본(컨트롤 배경+primary 테두리).
  - 단색(테마 배경+반전 텍스트, hover 시 진해짐): `primary`/`secondary`/`info`/`success`/`warning`/`danger`/`gray`/`blue-gray`.
  - 링크형(배경, 테두리 투명, 색 텍스트만): `link-primary`/`link-secondary`/`link-info`/`link-success`/`link-warning`/`link-danger`/`link-gray`/`link-blue-gray`.
  - `link` — primary 텍스트.
  - `link-rev` — 어두운 배경용 반전 텍스트.
- `inline` — true면 `inline-block; width:auto`, false(기본)면 full-width block.
- `inset` — true면 테두리 없음, 라운드 0, primary 텍스트(플랫 링크형).
- `size` — `xs`(가장 작은 padding)/`sm`/`lg`. 미지정=기본 padding.
- `buttonStyle`/`buttonClass` — 내부 `<button>` 에 적용할 inline style/class.

### `SdAnchor` (`sd-anchor`)

```ts
class SdAnchor {
  disabled: InputSignal<boolean>; // default false
  theme: InputSignal<AnchorTheme>; // default "primary"
}
```

`cursor:pointer` 인 inline 링크. `<ng-content>` 투영.

- `disabled` — true면 `opacity:0.3; pointer-events:none`, tabindex 제거.
- `theme` — 8색(기본 `"primary"`) 링크 텍스트 색.
  - hover 시 밑줄+진한 색(coarse pointer에선 밑줄 없음).

### `SdAdditionalButton` (`sd-additional-button`)

```ts
class SdAdditionalButton {
  size: InputSignal<"sm" | "lg" | undefined>;
  inset: InputSignal<boolean>;
}
```

좌측에 자유 콘텐츠, 우측에 투영된 `sd-anchor`/`sd-button`(좌측 구분선)을 배치하는 테두리 컨테이너.
콘텐츠는 기본 `<ng-content>`, 버튼은 `<ng-content select="sd-anchor">`/`<ng-content select="sd-button">`.

- `size` — `"sm"`/`"lg"` 콘텐츠, 버튼 padding 단계.
- `inset` — true면 라운드 0, 테두리 없음.

### `SdModalSelectButton` (`sd-modal-select-button`)

```ts
class SdModalSelectButton<K, M extends keyof SelectModeValue<K> = keyof SelectModeValue<K>> {
  modal: InputSignal<SdSelectModalInfo<SdSelectModal<K>>>; // required
  value: ModelSignal<SelectModeValue<K>[M]>; // single→K, multi→K[]
  selectMode: InputSignal<M>; // default "single"
  modalOptions: InputSignal<SdModalOptions | undefined>;
  disabled: InputSignal<boolean>;
  required: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  searchIcon: InputSignal<string>; // default tablerSearch
}
interface SdSelectModal<TKey> extends SdModalContentDef<SelectModalOutputResult<TKey>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedKeys: InputSignal<TKey[]>;
}
type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<
  T,
  "selectMode" | "selectedKeys"
>;
```

선택값을 보여주고 검색 버튼으로 선택 모달을 띄워 key를 고르는 컨트롤. 모달 호출: [overlay.md](./overlay.md).

- `modal` — 띄울 모달 정의(`selectMode`/`selectedKeys` 는 버튼이 주입하므로 제외된 `SdSelectModalInfo`). **required**.
- `value` — 선택 key. `selectMode==="multi"` → key 배열, `"single"` → 단일 key.
- `selectMode` — `"single"`(기본)/`"multi"`. 모달에 전달되고 결과 해석 방식을 정함.
- `disabled` — true면 검색, 지우개 버튼 숨김.
- `required` — true면 지우개 버튼 숨김 + 빈 값일 때 `"선택된 항목이 없습니다."` invalid.
- `searchIcon` — 검색 버튼 아이콘(기본 `tablerSearch`).
- 동작
  - `onSearchClick` 은 `SdModalProvider.showAsync` 로 모달을 열고 결과의 `selectedKeys` 를 multi면 배열, single이면 `[0]` 로 `value` 에 반영.
  - `onEraseClick` 은 multi면 `[]`, single이면 `undefined`.

## 텍스트, 숫자, 날짜 입력

### `SdTextfield<K>` (`sd-textfield`)

```ts
class SdTextfield<K extends keyof SdTextfieldTypes> {
  type: InputSignal<K>;                          // required, 입력 종류
  value: ModelSignal<SdTextfieldTypes[K]>;       // type별 값 타입
  placeholder, title, inputStyle, inputClass: InputSignal<string | undefined>;
  disabled, readonly, required, inline, inset: InputSignal<boolean>;
  min, max: InputSignal<SdTextfieldTypes[K] | undefined>;
  minlength, maxlength, step, minDigits: InputSignal<number | undefined>;
  pattern, format, autocomplete: InputSignal<string | undefined>;
  validatorFn: InputSignal<(value: SdTextfieldTypes[K] | undefined) => string | undefined>;
  useNumberComma: InputSignal<boolean>;          // default true
  size: InputSignal<"sm" | "lg" | undefined>; theme: InputSignal<Theme8 | undefined>;
}
```

`type` 으로 native input type, 파싱, 검증, 표시 포맷이 한 번에 결정되는 타입 안전 입력 컨트롤.
`value` 타입은 `SdTextfieldTypes[type]` 로 추론됨.

- `type` — **required**. `SdTextfieldTypes` key 중 하나(아래).
- `value` — `type` 별 타입(number→`number`, date→`DateOnly` 등).
  - 빈 입력은 `undefined`.
  - 파싱 실패 시 직전 표시값 복원.
- `min`/`max` — `value` 와 같은 타입 경계. 검증 + native attr.
- `minlength`/`maxlength`/`pattern` — 문자열 타입 길이/정규식 검증.
- `validatorFn` — 추가 검증 함수. 반환 문자열이 invalid 메시지.
- `format` — `format` type의 마스크, datetime 표시 포맷.
- `useNumberComma` — number type 천 단위 콤마(기본 true). false면 콤마 없이 표시.
- `minDigits` — number 표시 최소 자릿수.
- `theme` — 8색 배경 tint.

#### `SdTextfieldTypes` / `sdTextfieldTypes`

`type` → 값 타입 매핑(13종). `sdTextfieldTypes` 는 같은 순서의 key 배열.

- `number` → `number`
  - native control은 `"text"`(콤마 허용), 입력에서 `[0-9-.]` 외 제거 후 parseFloat.
- `text`/`password`/`color`/`email` → `string`
  - `password` 표시는 `****`.
  - `color` 는 길이, pattern 검증 생략.
- `format` → `string`
  - `format` 마스크의 `X` 위치에만 값 문자를 채움(`XXX-XXXX` 등).
  - `|` 로 길이별 후보.
- `date`/`month`/`year` → `DateOnly`
  - native control `date`/`month`/`text`.
  - 표시 `yyyy-MM-dd`/`yyyy-MM`/`yyyy`.
- `datetime`/`datetime-sec` → `DateTime`
  - native `datetime-local`.
  - `-sec` 는 초 포함.
- `time`/`time-sec` → `Time`
  - native `time`.
  - `-sec` 는 초 포함.

### `SdTextarea` (`sd-textarea`)

```ts
class SdTextarea {
  value: ModelSignal<string>;
  minRows: InputSignal<number>;                  // default 1
  placeholder, title, inputStyle, inputClass: InputSignal<string | undefined>;
  disabled, readonly, required, inline, inset: InputSignal<boolean>;
  validatorFn: InputSignal<(value: string | undefined) => string | undefined>;
  size: InputSignal<"sm" | "lg" | undefined>; theme: InputSignal<Theme8 | undefined>;
}
```

자동 행 확장 textarea(resize 불가). `currRows = max(minRows, 줄 수)`.

- `value` — 문자열. 빈 값은 `undefined`.
- `minRows` — 최소 행 수(기본 1).
- `required` — 빈 값이면 `"값을 입력하세요."` invalid.

### `SdNumpad` (`sd-numpad`)

```ts
class SdNumpad {
  value: ModelSignal<number | undefined>;
  placeholder: InputSignal<string | undefined>;
  required, inputDisabled, useEnterButton, useMinusButton: InputSignal<boolean>;
  enterButtonClick: OutputEmitterRef<void>;
}
```

숫자 키패드 UI. 상단 `sd-textfield`(text) + 숫자/`C`/`BS`/`.` 버튼.

- `value` — 숫자 값. 키패드/필드 양방향 동기화.
- `required` — true면 값 없을 때 `ENT` 비활성.
- `inputDisabled` — 상단 텍스트필드 비활성(키패드는 사용 가능).
- `useEnterButton` — true면 `ENT` 버튼 표시.
- `useMinusButton` — true면 부호 토글 `-` 버튼 표시.
- `enterButtonClick` — `ENT` 누를 때 emit.
- 버튼 동작 — `C` 비움, `BS` 마지막 글자 삭제, `Minus` 선행 `-` 토글, 그 외 키는 append.

### `SdRange<K>` (`sd-range`)

```ts
class SdRange<K extends keyof SdTextfieldTypes> {
  type: InputSignal<K>;                 // required
  from: ModelSignal<SdTextfieldTypes[K]>;
  to: ModelSignal<SdTextfieldTypes[K]>;
  required, disabled: InputSignal<boolean>;
  inputStyle: InputSignal<string | undefined>;
}
```

같은 `type` 의 textfield 두 개를 `~` 로 잇는 범위 입력. `to` 의 `min` 은 `from()` 으로 묶여 상한이 하한보다 앞서지 않음.

### `SdDateRangePicker` (`sd-date-range-picker`)

```ts
class SdDateRangePicker {
  periodType: ModelSignal<"일" | "월" | "범위">; // default "범위"
  from: ModelSignal<DateOnly | undefined>;
  to: ModelSignal<DateOnly | undefined>;
  required: InputSignal<boolean>;
}
```

기간 종류 select + 날짜 입력. `periodType` 별로 UI/동기화가 달라짐.

- `periodType` — 변경 시 그에 맞게 `from`/`to` 동기화.
  - 값: `"일"`(단일일, `to=from`), `"월"`(월 단위, `from`=그 달 1일, `to`=말일로 스냅), `"범위"`(기본, from/to range).

## checkbox, switch

### `SdCheckbox` (`sd-checkbox`)

```ts
class SdCheckbox {
  value: ModelSignal<boolean>;                   // default false
  canChangeFn: InputSignal<(item: boolean) => boolean | Promise<boolean>>; // default () => true
  icon: InputSignal<string>;                     // default tablerCheck
  radio: InputSignal<boolean>;
  disabled, inline, inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  theme: InputSignal<Theme8 | "white" | undefined>;
  contentStyle: InputSignal<string | undefined>;
}
```

- `value` — 체크 상태. 클릭/Space로 토글.
- `canChangeFn` — `setupModelHook` 게이트. `false` 면 변경 차단, `true`/resolve면 반영.
- `radio` — true면 라디오 모드(둥근 dot, 클릭 시 항상 `true` 로만 설정, 해제 불가). false(기본)면 checkbox 토글.
- `icon` — checkbox 모드 체크 아이콘(기본 `tablerCheck`). radio 모드에선 dot 사용.
- `theme` — 8색 + `"white"`(체크박스 면 `--sd-bg-checkbox`+필드 테두리 `--sd-bd-field`, 체크 시 primary).

### `SdSwitch` (`sd-switch`)

```ts
class SdSwitch {
  value: ModelSignal<boolean>;                   // default false
  canChangeFn: InputSignal<(item: boolean) => boolean | Promise<boolean>>;
  disabled, inline, inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  theme: InputSignal<Theme8 | undefined>;        // "white" 없음
}
```

토글 스위치.

- `value` — 클릭/Space 토글.
- on 상태(`data-sd-on`) 트랙 배경=`--sd-bg-{theme}-solid`, 테마 미지정 시 success 색.

### `SdCheckboxGroup<T>` / `SdCheckboxGroupItem<T>` (`sd-checkbox-group` / `sd-checkbox-group-item`)

```ts
class SdCheckboxGroup<T> {
  value: ModelSignal<T[]>; // default []
  disabled: InputSignal<boolean>;
}
class SdCheckboxGroupItem<T> {
  value: InputSignal<T>; // required
  inline: InputSignal<boolean>;
}
```

- 그룹 `value` — 체크된 item value 배열. item이 체크되면 자기 `value` 를 push, 해제되면 strict `!==` 로 filter.
- item `value` — **required**. `disabled` 는 그룹에서 상속.

## select, dropdown

### `SdSelect<M, T>` (`sd-select`)

```ts
class SdSelect<M extends "single" | "multi", T> {
  selectMode: InputSignal<M>;                     // default "single"
  value: ModelSignal<SelectModeValue<any>[M]>;    // single→T, multi→T[]
  dropdownOpen: ModelSignal<boolean>;             // default false
  placeholder, contentClass, contentStyle: InputSignal<string | undefined>;
  disabled, inline, inset, required, hideSelectAll: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  multiSelectionDisplayDirection: InputSignal<"vertical" | undefined>;
  items: InputSignal<T[] | undefined>;
  trackByFn: InputSignal<(item: T, index: number) => unknown>;   // default identity
  getChildrenFn: InputSignal<(item: T) => T[] | undefined>;
}
type SelectModeValue<T> = { multi: T[]; single: T };
```

드롭다운 선택 컨트롤. `SdSelectItem` 을 투영하거나 `items` + `SdItemOfTemplate` 로 렌더.

- `selectMode` — `"single"`(기본): `value`=단일 T, 선택 시 set 후 닫힘. `"multi"`: `value`=T[], 선택 토글(닫지 않음), 전체선택/해제 바 + 항목별 체크박스.
- `value` — 선택값. multi면 배열, single이면 단일.
- `hideSelectAll` — multi 모드 전체선택 바 숨김.
- `multiSelectionDisplayDirection` — `"vertical"` 면 선택 표시를 줄바꿈, 미지정 시 `", "` 로 연결.
- `items`/`getChildrenFn`/`trackByFn` — 데이터 기반 렌더(트리는 `getChildrenFn` 으로 평탄화+depth).
- `required` — 빈 선택이면 `"선택된 항목이 없습니다."` invalid.
- 메서드 — `selectItem`(set/toggle 후 single은 닫기), `toggleItem`, `onSelectAll`/`onDeselectAll`, `open/closeDropdown`. 열린 동안 ArrowUp/Down으로 항목 이동.

### `SdSelectItem<T>` (`sd-select-item`)

```ts
class SdSelectItem<T> {
  value: InputSignal<T | undefined>;
  disabled, hidden: InputSignal<boolean>;
}
```

- `value` — 항목 값. multi면 `isSelected` 시 체크박스 표시.
- `disabled` — 선택 차단, 전체선택 제외.
- `hidden` — `display:none`, 전체선택 제외.
- 키보드 — Space는 항상 toggle(닫지 않음), Enter는 single이면 select(닫기), multi면 toggle.

### `SdSelectButton` (`sd-select-button`)

`sd-select` 내부에 투영하는 액션 버튼(입력 없음, ripple). select disabled면 숨김.

### `SdDropdown` (`sd-dropdown`) / `SdDropdownPopup` (`sd-dropdown-popup`)

```ts
class SdDropdown {
  open: ModelSignal<boolean>; // default false
  disabled: InputSignal<boolean>;
}
class SdDropdownPopup {} // 입력 없음, <ng-content> 투영
```

- `open` — 팝업 열림 상태(양방향). 열리면 popup 요소를 `document.body` 로 옮겨 host 근처 위치(뷰포트에 따라 위/왼쪽 flip), 모바일(`max-width:520px`)은 backdrop + 슬라이드업.
- `disabled` — true면 비포커스, 열기 차단.
- 키보드 — host에서 ArrowDown(열기/팝업 첫 요소 포커스), ArrowUp(닫기), Space(토글), Escape(닫기). popup은 내용 높이 300px 초과 시 스크롤.

## form

### `SdForm` (`sd-form`)

```ts
class SdForm {
  formSubmit: OutputEmitterRef<SubmitEvent>; // 검증 통과 시
  formInvalid: OutputEmitterRef<void>; // 검증 실패 시
  requestSubmit(): void;
  get formEl(): HTMLFormElement;
}
```

`novalidate` native `<form>` 래퍼. submit 시 `formEl.checkValidity()` 통과면 `formSubmit` emit, 실패면 `reportValidity()`(native 메시지 표시+첫 invalid 포커스) 후 `formInvalid` emit.

- `requestSubmit()` — 프로그램적으로 submit 트리거.
- 검증 통합 — 자식 컨트롤이 `setupInvalid` 로 등록한 hidden `.sd-invalid-input` 의 customValidity를 native form이 집계함.

## collapse, tab, list, gap, pagination

### `SdCollapse` (`sd-collapse`) / `SdCollapseIcon` (`sd-collapse-icon`)

```ts
class SdCollapse {
  open: InputSignal<boolean>;
} // default false
class SdCollapseIcon {
  icon: InputSignal<string>; // default tablerChevronDown
  open: InputSignal<boolean>; // default false
  openRotate: InputSignal<number>; // default 90
}
```

- `SdCollapse.open` — true면 콘텐츠 표시, false면 측정 높이만큼 음수 margin-top으로 접음(애니메이션, 첫 렌더는 무애니).
- `SdCollapseIcon.open` — true면 아이콘을 `openRotate` 도(기본 90) 회전. 펼침/접힘 표시용.

### `SdTab<T>` (`sd-tab`) / `SdTabItem<T>` (`sd-tab-item`)

```ts
class SdTab<T> {
  value: ModelSignal<T>;
} // 현재 활성 탭 값
class SdTabItem<T> {
  value: InputSignal<T>;
} // required
```

- `SdTab.value` — 활성 탭 값.
- `SdTabItem` 은 `value()===parent.value()` 일 때 활성(strict `===`).
  - item 클릭 시 `parent.value.set(value())`.

### `SdList` (`sd-list`) / `SdListItem` (`sd-list-item`)

```ts
class SdList { inset: InputSignal<boolean>; }              // default false
class SdListItem {
  layout: InputSignal<"accordion" | "flat">;  // default "accordion"
  open: ModelSignal<boolean>;                  // default false
  selected, readonly: InputSignal<boolean>;
  selectedIcon: InputSignal<string | undefined>;
  contentStyle, contentClass: InputSignal<string | undefined>;
}
```

- `SdList.inset` — true면 배경, 테두리 제거(중첩 list는 항상 카드 제거).
- `layout`
  - `"accordion"`(기본): children 있으면 클릭 토글, collapse 아이콘, ripple, 들여쓰기.
  - `"flat"`: 헤더형(작은 글씨, dimmed, `cursor:default`), children 항상 펼침.
- `open` — accordion 펼침 상태. children 있을 때 클릭 토글.
- `selected` — 선택 강조(bold+highlight).
- `selectedIcon` — children 없을 때 선택 색 아이콘 표시.
- `readonly` — 클릭 토글, ripple 비활성.

### `SdGap` (`sd-gap`)

```ts
class SdGap {
  height: InputSignal<GapSize | undefined>;
  heightPx: InputSignal<number | undefined>;
  width: InputSignal<GapSize | undefined>;
  widthPx: InputSignal<number | undefined>;
  widthEm: InputSignal<number | undefined>;
}
// GapSize = "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl"
```

빈 간격 요소. named 토큰(`--gap-*`) 또는 px/em으로 크기.

- `height`/`width` — `--gap-{key}` CSS 변수 크기(7단계).
- `heightPx`/`widthPx`/`widthEm` — 정확한 px/em 크기.
- display — width 입력이 있으면 `inline-block`(가로 간격), height 입력만 있으면 `block`(세로 간격), px/em이 `0` 이면 `none`(숨김).

### `SdPagination` (`sd-pagination`)

```ts
class SdPagination {
  currentPage: ModelSignal<number>; // default 0, 0-based
  totalPageCount: InputSignal<number>; // default 0
  visiblePageCount: InputSignal<number>; // default 10
}
```

- `currentPage` — **0-based** 현재 페이지(표시는 +1). 페이지 변경은 output이 아니라 이 model 양방향 바인딩으로 전달.
- `totalPageCount` — 총 페이지 수. `0` 이면 페이지 미표시, prev/next 비활성.
- `visiblePageCount` — 한 그룹에 보일 페이지 번호 수(기본 10).
- 메서드 — `goToPage`/`goToNextGroup`/`goToPrevGroup`/`goToFirst`/`goToLast` 가 `currentPage.set` 호출.
