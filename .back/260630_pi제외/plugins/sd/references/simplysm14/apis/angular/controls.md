# @simplysm/angular — 폼·입력 컨트롤

버튼, 입력, 선택, 폼, collapse/tab/list/gap/pagination을 화면 폼·필터·셀 안에서 함께 쓰는 군이다. `SdTab`/`SdTabItem` 사용법: [client-tab.md](../../manuals/client-tab.md)

## 버튼·앵커

### `SdButton` — `<sd-button>`

```ts
class SdButton {
  type: InputSignal<"button" | "submit">;
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"|"link"|"link-primary"|"link-secondary"|"link-info"|"link-success"|"link-warning"|"link-danger"|"link-gray"|"link-blue-gray"|"link-rev" | undefined>;
  inline: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"xs" | "sm" | "lg" | undefined>;
  disabled: InputSignal<boolean>;
  buttonStyle: InputSignal<string | undefined>;
  buttonClass: InputSignal<string | undefined>;
}
```

- `type` — 내부 `<button type>` 값. 기본 `"button"`; form submit이면 `"submit"`.
- `theme` — 색/링크 스타일. 일반 테마는 배경색 버튼, `"link*"` 는 투명 배경 링크형 버튼, `"link-rev"` 는 역색 텍스트 링크형이다.
- `inline` — true면 내부 button이 inline-block + width auto가 된다.
- `inset` — true면 border/radius를 제거하고 primary 색 텍스트형으로 표시한다.
- `size` — `"xs"`, `"sm"`, `"lg"` 는 padding 크기를 바꾼다. 미지정은 기본 padding.
- `disabled` — 내부 button disabled와 host disabled 스타일을 켠다. ripple도 비활성화된다.
- `buttonStyle` — 내부 button의 `[style]` 문자열.
- `buttonClass` — 내부 button의 `[class]` 문자열.

### `SdAnchor` — `<sd-anchor>`

```ts
class SdAnchor {
  disabled: InputSignal<boolean>;
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray">;
}
```

- `disabled` — true면 opacity를 낮추고 pointer event를 막으며 tabindex를 제거한다.
- `theme` — 텍스트 색상 테마. hover 때 같은 테마의 darker 색과 underline을 적용한다. 기본 `"primary"`.

### `SdAdditionalButton` — `<sd-additional-button>`

```ts
class SdAdditionalButton {
  size: InputSignal<"sm" | "lg" | undefined>;
  inset: InputSignal<boolean>;
}
```

- `size` — content와 우측 button/anchor padding을 `"sm"` 또는 `"lg"` 크기로 바꾼다.
- `inset` — true면 wrapper border/radius를 제거한다.
- content projection — 기본 content는 `._content`, projected `sd-anchor`/`sd-button` 은 `._button` 영역에 들어간다.

### `SdModalSelectButton<K, M>` — `<sd-modal-select-button>`

```ts
interface SdSelectModal<TKey> extends SdModalContentDef<SelectModalOutputResult<TKey>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedKeys: InputSignal<TKey[]>;
}
type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<T, "selectMode" | "selectedKeys">;
class SdModalSelectButton<K, M extends keyof SelectModeValue<K> = keyof SelectModeValue<K>> {
  modal: InputSignal<SdSelectModalInfo<SdSelectModal<K>>>;
  value: ModelSignal<SelectModeValue<K>[M] | undefined>;
  disabled: InputSignal<boolean>;
  required: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  selectMode: InputSignal<M>;
  modalOptions: InputSignal<SdModalOptions | undefined>;
  searchIcon: InputSignal<string>;
}
```

- `SdSelectModal.selectMode` — modal content가 받을 선택 모드 input. 버튼이 자신의 `selectMode` 를 주입한다.
- `SdSelectModal.selectedKeys` — modal content가 받을 현재 선택 key 배열 input.
- `modal` — 열 modal type/title/inputs. `selectMode`/`selectedKeys` 는 버튼이 덮어 주입한다.
- `value` — 단일 모드면 key 또는 `undefined`, 다중 모드면 key 배열.
- `disabled` — true면 eraser/search button을 숨긴다.
- `required` — true이고 값이 없거나 빈 배열이면 hidden validity에 “선택된 항목이 없습니다.”를 설정한다.
- `inset` — border/radius를 제거한다.
- `size` — `"sm"`/`"lg"` padding을 적용한다.
- `selectMode` — `"single"` 은 결과 첫 key를 value로, `"multi"` 는 result `selectedKeys` 배열을 value로 쓴다. 기본 `"single"`.
- `modalOptions` — provider 호출 option input으로 선언되어 있으나 현재 `onSearchClick` 에서는 `showAsync` 두 번째 인자로 전달하지 않는다.
- `searchIcon` — 검색 버튼에 표시할 icon 문자열. 기본 `tablerSearch`.

## 텍스트·숫자·날짜 입력

### `SdTextfieldTypes` / `sdTextfieldTypes`

```ts
type SdTextfieldTypes = {
  number: number; text: string; password: string; color: string; email: string; format: string;
  date: DateOnly; month: DateOnly; year: DateOnly; datetime: DateTime; "datetime-sec": DateTime;
  time: Time; "time-sec": Time;
};
const sdTextfieldTypes: (keyof SdTextfieldTypes)[];
```

- `"number"` — model은 number, control은 text, 입력 문자열에서 숫자/`.`/`-` 외 문자를 제거해 parse한다.
- `"text"`/`"password"`/`"email"`/`"color"` — model은 string, control type은 같은 문자열이다.
- `"format"` — model은 string, `format` 의 `X` 마스크로 표시하고 parse 때 format 리터럴 문자를 제거한다.
- `"date"`/`"month"`/`"year"` — model은 `DateOnly`; control type은 각각 date/month/text, 표시 format은 `yyyy-MM-dd`/`yyyy-MM`/`yyyy`.
- `"datetime"`/`"datetime-sec"` — model은 `DateTime`; control type은 `datetime-local`, 초 포함 타입은 step 기본값이 1이다.
- `"time"`/`"time-sec"` — model은 `Time`; 초 포함 타입은 step 기본값이 1이다.
- `sdTextfieldTypes` — 위 key들을 문자열 배열로 노출한다.

### `SdTextfield<K>` — `<sd-textfield>`

```ts
class SdTextfield<K extends keyof SdTextfieldTypes> {
  value: ModelSignal<SdTextfieldTypes[K] | undefined>;
  type: InputSignal<K>;
  placeholder: InputSignal<string | undefined>;
  title: InputSignal<string | undefined>;
  inputStyle: InputSignal<string | undefined>;
  inputClass: InputSignal<string | undefined>;
  disabled: InputSignal<boolean>;
  readonly: InputSignal<boolean>;
  required: InputSignal<boolean>;
  min: InputSignal<SdTextfieldTypes[K] | undefined>;
  max: InputSignal<SdTextfieldTypes[K] | undefined>;
  minlength: InputSignal<number | undefined>;
  maxlength: InputSignal<number | undefined>;
  pattern: InputSignal<string | undefined>;
  validatorFn: InputSignal<((value: SdTextfieldTypes[K] | undefined) => string | undefined) | undefined>;
  format: InputSignal<string | undefined>;
  step: InputSignal<number | undefined>;
  autocomplete: InputSignal<string | undefined>;
  useNumberComma: InputSignal<boolean>;
  minDigits: InputSignal<number | undefined>;
  inline: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray" | undefined>;
}
```

- `value` — type별 model 값. input이 빈 문자열이면 `undefined` 로 설정한다.
- `type` — handler key. parsing, display text, validation, native input type을 결정한다.
- `placeholder` — input placeholder와 readonly/disabled 표시 placeholder.
- `title` — title attribute. 없으면 placeholder를 title로 쓴다.
- `inputStyle` — input과 readonly display div에 전달할 style 문자열.
- `inputClass` — input과 readonly display div에 전달할 class 문자열.
- `disabled` — true면 input을 렌더하지 않고 display div를 비활성 스타일로 보인다.
- `readonly` — true면 input을 렌더하지 않고 display div만 보인다.
- `required` — 값이 없으면 “값을 입력하세요.” validity 메시지를 만든다.
- `min`/`max` — number/DateOnly/DateTime/Time 타입에서 tick/값 하한·상한을 검증한다.
- `minlength`/`maxlength` — color를 제외한 string handler에서 문자열 길이를 검증한다.
- `pattern` — string handler에서 `new RegExp(pattern)` 으로 검증한다. 잘못된 pattern이면 `SdError` 를 throw한다.
- `validatorFn` — handler 검증 뒤 추가 메시지를 반환할 수 있는 함수.
- `format` — `"format"` 타입의 `X` 마스크와 parse 리터럴 제거 기준.
- `step` — native step. 없으면 handler 기본값(`"any"` 또는 초 단위 1)을 쓴다.
- `autocomplete` — input autocomplete attribute.
- `useNumberComma` — number 표시 시 comma formatting 사용 여부. false면 `toString(10)`.
- `minDigits` — number display text의 최소 자릿수 formatting.
- `inline` — host를 inline-block으로 만든다.
- `inset` — border/radius 제거, display div와 input을 겹쳐 셀 내장형으로 만든다.
- `size` — `"sm"`/`"lg"` padding을 적용한다.
- `theme` — input background를 해당 테마의 lightest 색으로 바꾼다.

### `SdTextarea` — `<sd-textarea>`

```ts
class SdTextarea {
  value: ModelSignal<string | undefined>;
  placeholder: InputSignal<string | undefined>;
  title: InputSignal<string | undefined>;
  minRows: InputSignal<number>;
  disabled: InputSignal<boolean>;
  readonly: InputSignal<boolean>;
  required: InputSignal<boolean>;
  inline: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  validatorFn: InputSignal<((value: string | undefined) => string | undefined) | undefined>;
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray" | undefined>;
  inputStyle: InputSignal<string | undefined>;
  inputClass: InputSignal<string | undefined>;
}
```

- `value` — textarea 문자열. 입력값이 빈 문자열이면 `undefined`.
- `placeholder` — textarea placeholder와 display placeholder.
- `title` — title attribute. 없으면 placeholder를 쓴다.
- `minRows` — textarea rows의 최소값. 실제 rows는 `max(minRows, value.split("\n").length)`.
- `disabled` — input 대신 display div를 비활성 스타일로 보인다.
- `readonly` — input 대신 display div만 보인다.
- `required` — 값이 없으면 “값을 입력하세요.” validity 메시지를 만든다.
- `inline` — host를 inline-block으로 만든다.
- `inset` — border/radius 제거, display div와 textarea를 겹친다.
- `size` — `"sm"`/`"lg"` padding을 적용한다.
- `validatorFn` — 추가 validity 메시지를 반환할 수 있는 함수.
- `theme` — 배경을 해당 테마의 lightest 색으로 바꾼다.
- `inputStyle`/`inputClass` — textarea와 display div에 전달한다.

### `SdNumpad` — `<sd-numpad>`

```ts
class SdNumpad {
  value: ModelSignal<number | undefined>;
  placeholder: InputSignal<string | undefined>;
  required: InputSignal<boolean>;
  inputDisabled: InputSignal<boolean>;
  useEnterButton: InputSignal<boolean>;
  useMinusButton: InputSignal<boolean>;
  enterButtonClick: OutputEmitterRef<void>;
}
```

- `value` — keypad text를 `num.parseFloat` 한 number model.
- `placeholder` — 상단 textfield placeholder.
- `required` — 상단 textfield required와 Enter button disabled 조건에 쓰인다.
- `inputDisabled` — 상단 textfield disabled 상태.
- `useEnterButton` — true면 `ENT` button을 렌더하고 클릭 시 output emit.
- `useMinusButton` — true면 `-` button을 렌더하고 부호를 토글한다.
- `enterButtonClick` — `ENT` 클릭 시 emit한다.

### `SdRange<K>` — `<sd-range>`

```ts
class SdRange<K extends keyof SdTextfieldTypes> {
  type: InputSignal<K>;
  from: ModelSignal<SdTextfieldTypes[K] | undefined>;
  to: ModelSignal<SdTextfieldTypes[K] | undefined>;
  inputStyle: InputSignal<string | undefined>;
  required: InputSignal<boolean>;
  disabled: InputSignal<boolean>;
}
```

- `type` — 두 textfield에 공통으로 넘길 type.
- `from` — 시작 값 model.
- `to` — 종료 값 model. 두 번째 textfield의 `min` 은 `from()` 이다.
- `inputStyle` — 두 textfield에 전달할 style.
- `required` — 두 textfield required.
- `disabled` — 두 textfield disabled.

### `SdDateRangePicker` — `<sd-date-range-picker>`

```ts
class SdDateRangePicker {
  periodType: ModelSignal<"일" | "월" | "범위">;
  from: ModelSignal<DateOnly | undefined>;
  to: ModelSignal<DateOnly | undefined>;
  required: InputSignal<boolean>;
}
```

- `periodType` — `"일"` 은 `to = from`, `"월"` 은 from을 월초로 맞추고 to를 월말로 맞춘다, `"범위"` 는 date range를 직접 입력한다. 기본 `"범위"`.
- `from` — 시작일 또는 선택 월/일 값.
- `to` — 종료일. 범위 모드에서 from이 to보다 뒤면 to를 from으로 보정한다.
- `required` — 내부 date/month/range 입력의 required.

## checkbox·switch

### `SdCheckbox` — `<sd-checkbox>`

```ts
class SdCheckbox {
  value: ModelSignal<boolean>;
  canChangeFn: InputSignal<(item: boolean) => boolean | Promise<boolean>>;
  icon: InputSignal<string>;
  radio: InputSignal<boolean>;
  disabled: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  inline: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"|"white" | undefined>;
  contentStyle: InputSignal<string | undefined>;
}
```

- `value` — checked 상태 model.
- `canChangeFn` — 값 변경 전 가드. false/Promise false면 변경하지 않는다.
- `icon` — checkbox indicator icon. 기본 `tablerCheck`; radio 모드에서는 내부 점 div를 쓴다.
- `radio` — true면 클릭/space가 항상 true로 set하고 원형 indicator를 쓴다.
- `disabled` — true면 opacity를 낮추고 pointer event를 막는다.
- `size` — `"sm"`/`"lg"` 높이·padding을 적용한다.
- `inline` — inline-block + border 제거 스타일.
- `inset` — border 제거와 중앙 정렬 스타일.
- `theme` — indicator 색. `"white"` 는 흰 배경 indicator 테마.
- `contentStyle` — content 영역 style 문자열.

### `SdSwitch` — `<sd-switch>`

```ts
class SdSwitch {
  value: ModelSignal<boolean>;
  canChangeFn: InputSignal<(item: boolean) => boolean | Promise<boolean>>;
  disabled: InputSignal<boolean>;
  inline: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray" | undefined>;
}
```

- `value` — on/off 상태 model.
- `canChangeFn` — 값 변경 전 가드.
- `disabled` — true면 handle opacity를 낮춘다.
- `inline` — inline-block + border 제거 스타일.
- `inset` — border 제거 스타일.
- `size` — `"sm"`/`"lg"` padding을 적용한다.
- `theme` — on 상태 배경 테마. 미지정 on 배경은 success.

### `SdCheckboxGroup<T>` / `SdCheckboxGroupItem<T>`

```ts
class SdCheckboxGroup<T> {
  value: ModelSignal<T[]>;
  disabled: InputSignal<boolean>;
}
class SdCheckboxGroupItem<T> {
  value: InputSignal<T>;
  inline: InputSignal<boolean>;
}
```

- `SdCheckboxGroup.value` — 선택된 item value 배열.
- `SdCheckboxGroup.disabled` — 모든 child item checkbox의 disabled 계산에 쓰인다.
- `SdCheckboxGroupItem.value` — 이 항목이 group 배열에 넣고 뺄 값.
- `SdCheckboxGroupItem.inline` — 내부 `SdCheckbox` inline input으로 전달한다.

## select·dropdown

### `SelectModeValue<T>`

```ts
type SelectModeValue<T> = { multi: T[]; single: T };
```

- `single` — 단일 선택 model 값 타입.
- `multi` — 다중 선택 model 배열 타입.

### `SdSelect<M, T>` — `<sd-select>`

```ts
class SdSelect<M extends "single" | "multi", T> {
  selectMode: InputSignal<M>;
  value: ModelSignal<SelectModeValue<any>[M] | undefined>;
  placeholder: InputSignal<string | undefined>;
  disabled: InputSignal<boolean>;
  inline: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  required: InputSignal<boolean>;
  hideSelectAll: InputSignal<boolean>;
  multiSelectionDisplayDirection: InputSignal<"vertical" | undefined>;
  items: InputSignal<T[] | undefined>;
  trackByFn: InputSignal<(item: T, index: number) => unknown>;
  getChildrenFn: InputSignal<((item: T) => T[] | undefined) | undefined>;
  contentClass: InputSignal<string | undefined>;
  contentStyle: InputSignal<string | undefined>;
  dropdownOpen: ModelSignal<boolean>;
}
```

- `selectMode` — `"single"` 은 선택 시 값 set 후 dropdown close, `"multi"` 는 배열에 토글하고 전체선택 bar를 표시할 수 있다. 기본 `"single"`.
- `value` — 현재 선택 값. multi면 배열이어야 선택 표시가 된다.
- `placeholder` — 선택 표시가 없을 때 보여줄 텍스트.
- `disabled` — dropdown disabled와 control icon 숨김.
- `inline` — host width auto.
- `inset` — border/radius 제거와 focus outline 스타일.
- `size` — `"sm"`/`"lg"` padding.
- `required` — 값이 없거나 빈 배열이면 “선택된 항목이 없습니다.” validity 메시지를 만든다.
- `hideSelectAll` — multi mode에서 전체선택/전체해제 bar를 숨긴다.
- `multiSelectionDisplayDirection` — `"vertical"` 이면 선택 항목 표시 separator를 div padding으로 만든다. 미지정이면 comma separator.
- `items` — `ng-template[itemOf]` 렌더링에 쓸 데이터 배열.
- `trackByFn` — `items` 렌더 track key. 기본 item 자체.
- `getChildrenFn` — tree item flatten 시 자식 배열을 반환한다.
- `contentClass`/`contentStyle` — select control content div에 전달한다.
- `dropdownOpen` — dropdown open 상태 model.

### `SdSelectItem<T>` — `<sd-select-item>`

```ts
class SdSelectItem<T> {
  value: InputSignal<T | undefined>;
  disabled: InputSignal<boolean>;
  hidden: InputSignal<boolean>;
}
```

- `value` — parent `SdSelect` 에 set/toggle할 item value.
- `disabled` — true면 클릭/키보드 선택을 막고 disabled style을 적용한다.
- `hidden` — true면 item을 display none 처리한다.
- 선택 키 — click은 parent `selectItem`, Space는 close 없이 toggle, Enter는 single이면 select+close, multi면 toggle한다.

### `SdSelectButton` — `<sd-select-button>`

```ts
class SdSelectButton {}
```

- projection — `SdSelect` 내부에 보조 button처럼 투영된다.
- 동작 — ripple을 항상 켜고 content를 그대로 표시한다.

### `SdDropdown` / `SdDropdownPopup`

```ts
class SdDropdown {
  open: ModelSignal<boolean>;
  disabled: InputSignal<boolean>;
  popupElRef: Signal<ElementRef<HTMLElement>>;
}
class SdDropdownPopup {}
```

- `open` — popup을 body로 옮겨 표시할지 결정한다.
- `disabled` — true면 tabindex 제거와 open 차단.
- `popupElRef` — content child `SdDropdownPopup` 의 element ref. required content child다.
- desktop position — host rect 기준으로 viewport 하단/상단, 좌/우 중 공간이 큰 방향에 배치한다.
- mobile position — max-width 520px media query면 backdrop을 만들고 popup을 화면 하단 sheet처럼 표시한다.
- key 동작 — host ArrowDown/Space로 open, ArrowUp/Escape로 close, open 상태 ArrowDown은 popup 첫 tabbable로 focus 이동한다.
- `SdDropdownPopup` resize — 내부 scrollHeight가 300px를 넘으면 height를 300px로 cap하고, 아니면 height style을 제거한다.

## form·collapse·tab·list·gap·pagination

### `SdForm` — `<sd-form>`

```ts
class SdForm {
  formElRef: Signal<ElementRef<HTMLFormElement>>;
  get formEl(): HTMLFormElement;
  formSubmit: OutputEmitterRef<SubmitEvent>;
  formInvalid: OutputEmitterRef<void>;
  requestSubmit(): void;
}
```

- `formElRef`/`formEl` — 내부 `<form novalidate>` element.
- `formSubmit` — submit event에서 `checkValidity()` 가 true면 emit한다.
- `formInvalid` — invalid면 `reportValidity()` 후 emit한다.
- `requestSubmit` — 내부 form의 native `requestSubmit()` 호출.

### `SdCollapse` / `SdCollapseIcon`

```ts
class SdCollapse { open: InputSignal<boolean> }
class SdCollapseIcon {
  icon: InputSignal<string>;
  open: InputSignal<boolean>;
  openRotate: InputSignal<number>;
}
```

- `SdCollapse.open` — true면 content margin-top을 빈 값으로, false면 `-contentHeight` 로 접는다.
- `SdCollapse` resize — content height가 바뀌면 닫힘 margin 계산값을 갱신한다.
- `SdCollapseIcon.icon` — 표시할 icon 문자열. 기본 `tablerChevronDown`.
- `SdCollapseIcon.open` — true면 rotate transform을 적용한다.
- `SdCollapseIcon.openRotate` — open일 때 회전 각도. 기본 90.

### `SdTab<T>` / `SdTabItem<T>` — `<sd-tab>` / `<sd-tab-item>`

사용법: [client-tab.md](../../manuals/client-tab.md)

```ts
class SdTab<T> { value: ModelSignal<T | undefined> }
class SdTabItem<T> { value: InputSignal<T> }
```

- `SdTab.value` — 현재 선택 tab 값 model.
- `SdTabItem.value` — 클릭 시 parent tab value에 set할 값.
- 선택 표시 — item은 parent value와 자신의 value가 strict equal이면 selected style을 적용한다.

### `SdList` / `SdListItem`

```ts
class SdList { inset: InputSignal<boolean> }
class SdListItem {
  layout: InputSignal<"accordion" | "flat">;
  open: ModelSignal<boolean>;
  selected: InputSignal<boolean>;
  selectedIcon: InputSignal<string | undefined>;
  readonly: InputSignal<boolean>;
  contentStyle: InputSignal<string | undefined>;
  contentClass: InputSignal<string | undefined>;
}
```

- `SdList.inset` — true면 list border/background/padding을 제거한다.
- `layout` — `"accordion"` 은 child list를 collapsible로 표시, `"flat"` 은 child를 항상 열고 parent content를 section label처럼 표시한다.
- `open` — accordion child collapse 상태 model.
- `selected` — selected background/font style을 적용한다.
- `selectedIcon` — child가 없을 때 앞쪽 icon을 표시하고 selected 여부로 색을 바꾼다.
- `readonly` — true면 content click이 open 토글을 하지 않는다.
- `contentStyle`/`contentClass` — content div에 전달한다.
- `toolTpl` content child — 있으면 item 우측 tool 영역에 렌더한다.

### `SdGap` — `<sd-gap>`

```ts
class SdGap {
  height: InputSignal<"xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl" | undefined>;
  heightPx: InputSignal<number | undefined>;
  width: InputSignal<"xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl" | undefined>;
  widthPx: InputSignal<number | undefined>;
  widthEm: InputSignal<number | undefined>;
}
```

- `height` — CSS gap token height를 host data attribute로 적용한다.
- `heightPx` — pixel height style.
- `width` — CSS gap token width를 host data attribute로 적용한다.
- `widthPx` — pixel width style.
- `widthEm` — em width style.
- display — width 계열 값이 있으면 inline-block, height 계열만 있으면 block, width/height 값 중 0이 있으면 none.

### `SdPagination` — `<sd-pagination>`

```ts
class SdPagination {
  currentPage: ModelSignal<number>;
  totalPageCount: InputSignal<number>;
  visiblePageCount: InputSignal<number>;
}
```

- `currentPage` — 0-base 현재 page model.
- `totalPageCount` — 전체 page 수. 0이면 표시 page와 prev/next가 비활성이다.
- `visiblePageCount` — 한 그룹에 보여줄 page 번호 수. 기본 10.
- 이동 동작 — first/last는 0/`totalPageCount - 1`, prev/next group은 group index 기준으로 `visiblePageCount` 단위 이동한다.
