# @simplysm/angular — forms

폼 컨테이너 + 입력 컨트롤. 모든 컨트롤은 `value` model 기반. native form validity API 사용 (`SdForm`이 submit 시 reportValidity 호출).

## `<sd-form>`

```html
<sd-form (formSubmit)="onSubmit($event)" (formInvalid)="onInvalid()">
  <sd-textfield [type]="'text'" [(value)]="name" [required]="true" />
  <sd-button [type]="'submit'">저장</sd-button>
</sd-form>
```

- 내부에 hidden submit 버튼 자동 삽입(Enter 키 submit 지원).
- `requestSubmit()` 메서드 노출.
- invalid 시 `reportValidity` → `formInvalid` emit, valid 시 `formSubmit` emit.

## `<sd-textfield<K>>`

```html
<sd-textfield [type]="'number'" [(value)]="qty" [min]="0" [max]="999" [step]="1" />
<sd-textfield [type]="'date'" [(value)]="dt" />
<sd-textfield [type]="'format'" [format]="'XXX-XXXX-XXXX'" [(value)]="phone" />
```

`SdTextfieldTypes`: `number→number`, `text|password|color|email|format→string`, `date|month|year→DateOnly`, `datetime|datetime-sec→DateTime`, `time|time-sec→Time`. `sdTextfieldTypes` 배열로 키 목록 enum.

주요 input: `value` (model), `type` (required), `placeholder`, `title`, `inputStyle/Class`, `disabled/readonly/required` (booleanAttribute), `min/max/minlength/maxlength`, `pattern`, `validatorFn(value) => string | undefined` (커스텀 메시지), `format`, `step`, `autocomplete`, `useNumberComma` (default `true` — 숫자 표시 시 천단위 콤마), `minDigits` (display 시 최소 자릿수), `size`(`"sm"|"lg"`), `inline`, `inset`, `theme`.

readonly/disabled 상태에서는 `<input>` 비표시(`_contents` div만 노출).

## `<sd-textarea>`

`[(value)]: string`, `placeholder`, `title`, `minRows=1` (행수는 값 줄바꿈 수와 minRows 중 큰 값), `disabled/readonly/required`, `inline`, `inset`, `size`, `validatorFn`, `theme`, `inputStyle/Class`.

## `<sd-numpad>`

숫자 키패드. `[(value)]: number`, `text = signal<string|undefined>` (내부 표시값), `placeholder`, `required`, `inputDisabled` (입력란만 비활성), `useEnterButton` (ENT 버튼 노출), `useMinusButton` (- 버튼 노출), `(enterButtonClick)` 출력.

## `<sd-range<K>>`

`type: K` (TextfieldTypes 키), `[(from)]`, `[(to)]: SdTextfieldTypes[K]`, `required`, `disabled`, `inputStyle`. `to.min`은 `from` 으로 강제.

## `<sd-date-range-picker>`

`[(periodType)]: "일"|"월"|"범위" = "범위"`, `[(from)]: DateOnly`, `[(to)]: DateOnly`, `required`.
- `"일"`: 단일 date 입력. `to`는 `from` 따라감.
- `"월"`: month 입력. `from`은 1일, `to`는 말일 자동 설정.
- `"범위"`: from~to date 양쪽 입력. from > to 시 to를 from으로 보정.

## `<sd-checkbox>` / `<sd-switch>`

```html
<sd-checkbox [(value)]="agreed" [theme]="'primary'">동의</sd-checkbox>
<sd-switch [(value)]="enabled" [size]="'sm'" />
```

`value: boolean` (model), `canChangeFn(value) => boolean | Promise<boolean>` — false 면 변경 차단 (`setupModelHook` 사용). 공통: `disabled`, `size`, `inline`, `inset`, `theme`. checkbox 추가: `radio` (radio 모드 — 다시 클릭해도 false 안 됨), `icon` (체크 아이콘 변경, default `tablerCheck`), `contentStyle`, `theme` 에 `"white"` 옵션 추가(시트 헤더용).

## `<sd-checkbox-group<T>>` / `<sd-checkbox-group-item<T>>`

```html
<sd-checkbox-group [(value)]="selected">
  <sd-checkbox-group-item [value]="opt" *ngFor="let opt of options">{{ opt }}</sd-checkbox-group-item>
</sd-checkbox-group>
```

`SdCheckboxGroup`: `value: T[]` (model, default `[]`), `disabled`. `SdCheckboxGroupItem`: `value: T` (required), `inline`.

## 검증

- 컨트롤 내부에서 `setupInvalid(getMessage)` 사용 — 빈 문자열이면 valid, 그 외 메시지는 invalid 사유. 좌상단 빨간 점 인디케이터.
- `validatorFn` 은 컨트롤 입력값을 검사해 메시지 반환.
- `SdForm` submit 시 자동으로 reportValidity 호출 + invalid 인디케이터 표시.
