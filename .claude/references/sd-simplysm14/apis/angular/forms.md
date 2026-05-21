# @simplysm/angular — forms

폼 컨테이너 + 값 입력 컨트롤. 모든 입력 컨트롤은 `value` model 기반. native form validity API 활용.

## SdForm — `<sd-form>`

```ts
formSubmit = output<SubmitEvent>();
formInvalid = output();
```

- 내부에 native `<form>` 구성. 자식 `<sd-textfield required>` 등 native invalid 상태가 있으면 submit 막고 `formInvalid` 발화. 모두 valid 면 `formSubmit` 발화.

```html
<sd-form (formSubmit)="onSubmit()"><sd-textfield type="text" required [(value)]="name"/></sd-form>
```

## SdTextfield — `<sd-textfield>`

```ts
class SdTextfield<K extends keyof SdTextfieldTypes>
value = model<SdTextfieldTypes[K]>();
type = input.required<K>();
placeholder = input<string>(); title = input<string>();
inputStyle = input<string>(); inputClass = input<string>();
disabled = input(false); readonly = input(false); required = input(false);
min/max = input<SdTextfieldTypes[K]>(); minlength/maxlength = input<number>();
pattern = input<string>();
validatorFn = input<(value) => string|undefined>();
format = input<string>(); step = input<number>(); autocomplete = input<string>();
useNumberComma = input(true); minDigits = input<number>();
inline = input(false); inset = input(false); size = input<"sm"|"lg">();
theme = input<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray">();

type SdTextfieldTypes = {
  number: number; text: string; password: string; color: string; email: string;
  format: string; date: DateOnly; month: DateOnly; year: DateOnly;
  datetime: DateTime; "datetime-sec": DateTime; time: Time; "time-sec": Time;
}
const sdTextfieldTypes: (keyof SdTextfieldTypes)[]
```

- `type` — 위 13개 중 1개. 각 타입별 핸들러가 파싱/포맷/입력 제한 담당. `number` 는 콤마 표시, `date`/`month`/`year` 는 `DateOnly`, `datetime[-sec]` 는 `DateTime`, `time[-sec]` 는 `Time`, `format` 은 `format` 입력에 따른 자유 포맷.
- `value` — 양방향. 타입에 맞는 객체/숫자/문자열.
- `format` — `type=format` 또는 표시 포맷팅용. `XXX-XXXX` 같은 패턴(`X` 자리).
- `validatorFn` — 반환 문자열이 있으면 invalid 메시지로 표시. undefined 면 통과.
- `useNumberComma` — `type=number` 기본 true. 천 단위 콤마 표시.
- `minDigits` — `type=number` 정수부 자릿수(부족 시 0 패딩).
- `min`/`max`/`minlength`/`maxlength`/`pattern`/`required` — native 검증으로 위임.
- `inline`/`inset`/`size`/`theme` — 레이아웃 옵션. `inset` 은 sd-sheet/모달 셀 안에 박힌 룩.
- `readonly` — 편집 차단(포커스 가능). `disabled` — 포커스 불가.

```html
<sd-textfield type="number" [(value)]="qty" [min]="0" />
<sd-textfield type="date" [(value)]="dueDate" required />
```

## SdTextarea — `<sd-textarea>`

```ts
value = model<string>();
placeholder/title/inputStyle/inputClass = input<string>(); minRows = input<number>(1);
disabled/readonly/required/inline/inset = input(false);
size = input<"sm"|"lg">();
validatorFn = input<(v) => string|undefined>();
theme = input<...8 themes>();
```

- 멀티라인 입력. `minRows` 만큼 시작 높이 확보, 내용 늘면 자동 확장.

## SdNumpad — `<sd-numpad>`

```ts
value = model<number>(); placeholder = input<string>();
required = input(false); inputDisabled = input(false);
useEnterButton = input(false); useMinusButton = input(false);
enterButtonClick = output();
```

- 터치용 숫자 패드. `useEnterButton` true 면 엔터 키 노출, 클릭 시 `enterButtonClick` 발화. `useMinusButton` true 면 부호 토글 키 노출. `inputDisabled` true 면 상단 표시 영역의 직접 타이핑 차단(패드만 사용).

## SdRange — `<sd-range>`

```ts
class SdRange<K extends keyof SdTextfieldTypes>
type = input.required<K>(); from = model<SdTextfieldTypes[K]>(); to = model<SdTextfieldTypes[K]>();
inputStyle = input<string>(); required = input(false); disabled = input(false);
```

- `SdTextfield` 2개를 `~` 로 묶은 범위 입력. `type` 은 `SdTextfield` 와 동일 키.

## SdDateRangePicker — `<sd-date-range-picker>`

```ts
periodType = model<"일"|"월"|"범위">("범위");
from = model<DateOnly>(); to = model<DateOnly>();
required = input(false);
```

- `periodType` — `일`: 단일 날짜(`from`=`to`), `월`: 단일 월, `범위`: from/to 자유 범위. 사용자가 토글 가능.

## SdSelect — `<sd-select>`

```ts
class SdSelect<M extends "single"|"multi", T>
selectMode = input("single" as M);
value = model<SelectModeValue<any>[M]>();      // single → T, multi → T[]
placeholder = input<string>();
disabled/inline/inset/required = input(false); size = input<"sm"|"lg">();
hideSelectAll = input(false);
multiSelectionDisplayDirection = input<"vertical">();
items = input<T[]>(); trackByFn = input<(item, index) => unknown>((item) => item);
getChildrenFn = input<(item: T) => T[]|undefined>();
contentClass = input<string>(); contentStyle = input<string>();
dropdownOpen = model(false);

type SelectModeValue<T> = { multi: T[]; single: T };
```

- 드롭다운 셀렉트. `items` 를 직접 주거나, content projection 으로 `<sd-select-item>` 나열.
- `selectMode` — `single`: 단일 선택, `multi`: 체크박스 다중 선택(`hideSelectAll` false 면 전체 선택 옵션 노출).
- `getChildrenFn` — 트리형 선택지. 자식 있는 노드 펼침.
- `multiSelectionDisplayDirection` — multi 모드에서 선택값 표시 방향. `vertical` 만.
- `dropdownOpen` — 양방향. 외부에서 강제 열림 제어 가능.
- `<ng-content>` — 표시 영역 커스텀 템플릿 또는 `<sd-select-item>` 리스트.

## SdSelectItem — `<sd-select-item>`

```ts
class SdSelectItem<T> { value = input<T|undefined>(); disabled = input(false); hidden = input(false); }
```

- `SdSelect` 자식. content projection 으로 표시할 옵션. `hidden` true 면 필터링 결과 등으로 숨김.

## SdSelectButton — `<sd-select-button>`

- `SdSelect` 트리거 버튼 슬롯. inputs 없음. `<sd-select>` 내부에 표시 영역 커스터마이즈 시 content projection 으로 사용.

## SdCheckbox — `<sd-checkbox>`

```ts
value = model(false);
canChangeFn = input<(item: boolean) => boolean|Promise<boolean>>(() => true);
icon = input(tablerCheck); radio = input(false);
disabled = input(false); size = input<"sm"|"lg">();
inline = input(false); inset = input(false);
theme = input<...8 themes>(); contentStyle = input<string>();
```

- `radio` true 면 라디오 룩(원형). false 면 체크박스(사각).
- `canChangeFn` — 변경 직전 호출, false 반환·Promise<false> 면 무시. 비동기 확인용.
- `icon` — 체크 상태 아이콘. 기본 `tablerCheck`.

## SdSwitch — `<sd-switch>`

```ts
value = model(false);
canChangeFn = input<(item) => boolean|Promise<boolean>>(() => true);
disabled = input(false); inline = input(false); inset = input(false);
size = input<"sm"|"lg">(); theme = input<...8 themes>();
```

- 토글 스위치. `SdCheckbox` 와 의미 같지만 룩만 슬라이더.

## SdCheckboxGroup — `<sd-checkbox-group>`

```ts
class SdCheckboxGroup<T> { value = model<T[]>([]); disabled = input(false); }
```

- 자식 `<sd-checkbox-group-item>` 들을 묶어 `value` 배열로 관리.

## SdCheckboxGroupItem — `<sd-checkbox-group-item>`

```ts
class SdCheckboxGroupItem<T> { value = input.required<T>(); inline = input(false); }
```

- 그룹의 단일 옵션. `value` 가 그룹 배열에 있으면 체크 상태.

## SdDropdown — `<sd-dropdown>`

```ts
open = model(false); disabled = input(false);
```

- 트리거 + 팝업 컨테이너. content projection 으로 트리거와 `<sd-dropdown-popup>` 을 함께 둠.

## SdDropdownPopup — `<sd-dropdown-popup>`

- `SdDropdown` 의 팝업 슬롯. inputs 없음. content projection 으로 내용 채움.

```html
<sd-dropdown [(open)]="open">트리거<sd-dropdown-popup>...팝업 내용...</sd-dropdown-popup></sd-dropdown>
```

## 주의

- `value` model 인 컨트롤은 모두 `[(value)]="..."` 양방향.
- 입력 컨트롤은 `<sd-form>` 안에 두면 invalid 시 native `:invalid` 처리됨. `SdInvalid` 디렉티브로 커스텀 invalid 표시 추가 가능 ([infrastructure.md](./infrastructure.md)).
