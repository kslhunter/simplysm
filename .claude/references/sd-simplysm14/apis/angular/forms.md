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
- invalid 시 reportValidity → `formInvalid` emit.

## `<sd-textfield<K>>`

```html
<sd-textfield [type]="'number'" [(value)]="qty" [min]="0" [max]="999" [step]="1" />
<sd-textfield [type]="'date'" [(value)]="dt" />
<sd-textfield [type]="'format'" [format]="'XXX-XXXX-XXXX'" [(value)]="phone" />
```

`SdTextfieldTypes`: `number→number`, `text|password|color|email|format→string`, `date|month|year→DateOnly`, `datetime|datetime-sec→DateTime`, `time|time-sec→Time`. `sdTextfieldTypes` 배열로 키 목록 enum.

주요 input: `value` (model), `type` (required), `placeholder`, `title`, `inputStyle/Class`, `disabled/readonly/required` (booleanAttribute), `min/max/minlength/maxlength`, `pattern`, `validatorFn(value) => string | undefined` (커스텀 메시지), `format`, `step`, `autocomplete`, `minDigits`, `size`, `theme`.

## `<sd-textarea>`

`[(value)]: string`, `placeholder`, `title`, `minRows=1`, `size`, `validatorFn`, `theme`, `inputStyle/Class`.

## `<sd-numpad>`

숫자 키패드. `[(value)]: number`, `placeholder`.

## `<sd-range<K>>`

`type: K` (TextfieldTypes 키), `[(from)]`, `[(to)]: SdTextfieldTypes[K]`, `inputStyle`.

## `<sd-date-range-picker>`

`[(periodType)]: "일"|"월"|"범위" = "범위"`, `[(from)]: DateOnly`, `[(to)]: DateOnly`.

## `<sd-checkbox>` / `<sd-switch>`

```html
<sd-checkbox [(value)]="agreed" [theme]="'primary'">동의</sd-checkbox>
<sd-switch [(value)]="enabled" [size]="'sm'" />
```

`value: boolean` (model), `canChangeFn(value) => boolean | Promise<boolean>` — false 면 변경 차단. `radio` (checkbox만), `disabled`, `size`, `inline`, `inset`, `theme`, `contentStyle` (checkbox).

## `<sd-checkbox-group<T>>` / `<sd-checkbox-group-item<T>>`

`<sd-checkbox-group [(value)]="selected"> <sd-checkbox-group-item [value]="opt">{{opt}}</sd-checkbox-group-item> ... </sd-checkbox-group>`. value: `T[]` (다중).

## 검증

- 컨트롤 내부에서 `setupInvalid(getMessage)` 사용 (cf. directives). 빈 문자열이면 valid.
- `validatorFn` 은 컨트롤 입력값을 검사해 메시지 반환.
- `SdForm` submit 시 자동으로 reportValidity 호출 + invalid 인디케이터 표시.
