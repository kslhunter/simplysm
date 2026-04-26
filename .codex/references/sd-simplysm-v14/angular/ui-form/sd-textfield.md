# `SdTextfield`

> **읽어야 하는 상황**: 한 줄 텍스트, 숫자, 날짜, 시간, 색상 등을 입력받을 때. 여러 줄 텍스트는 [`SdTextarea`](./sd-textarea.md), 리치 텍스트는 [`SdTiptapEditor`](../features/sd-tiptap-editor.md) 참조.

텍스트 입력 컴포넌트. 13가지 타입을 지원한다.

```typescript
@Component({ selector: "sd-textfield" })
class SdTextfield<K extends keyof SdTextfieldTypes> {
  value = model<SdTextfieldTypes[K]>();
  type = input.required<K>();
  placeholder = input<string>();
  title = input<string>();
  inputStyle = input<string>();
  inputClass = input<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  min = input<SdTextfieldTypes[K]>();
  max = input<SdTextfieldTypes[K]>();
  minlength = input<number>();
  maxlength = input<number>();
  pattern = input<string>();
  validatorFn = input<(value: SdTextfieldTypes[K] | undefined) => string | undefined>();
  format = input<string>();
  step = input<number>();
  autocomplete = input<string>();
  useNumberComma = input(true, { transform: booleanAttribute });
  minDigits = input<number>();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input<string>();
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `type` | input (required) | `keyof SdTextfieldTypes` | - | 입력 타입 (number, text, password, color, email, format, date, month, year, datetime, datetime-sec, time, time-sec) |
| `value` | model | `SdTextfieldTypes[K] \| undefined` | - | 값 (two-way) |
| `placeholder` | input | `string \| undefined` | `undefined` | 플레이스홀더 |
| `title` | input | `string \| undefined` | `undefined` | title 속성 |
| `inputStyle` | input | `string \| undefined` | `undefined` | input 인라인 스타일 |
| `inputClass` | input | `string \| undefined` | `undefined` | input CSS 클래스 |
| `disabled` | input | `boolean` | `false` | 비활성화 |
| `readonly` | input | `boolean` | `false` | 읽기 전용 |
| `required` | input | `boolean` | `false` | 필수 |
| `min` | input | `SdTextfieldTypes[K] \| undefined` | `undefined` | 최소값 |
| `max` | input | `SdTextfieldTypes[K] \| undefined` | `undefined` | 최대값 |
| `minlength` | input | `number \| undefined` | `undefined` | 최소 길이 |
| `maxlength` | input | `number \| undefined` | `undefined` | 최대 길이 |
| `pattern` | input | `string \| undefined` | `undefined` | 입력 패턴 (정규식) |
| `validatorFn` | input | `((value) => string \| undefined) \| undefined` | `undefined` | 커스텀 유효성 검증 함수 (에러 메시지 반환) |
| `format` | input | `string \| undefined` | `undefined` | format 타입에서 사용할 포맷 문자열 |
| `step` | input | `number \| undefined` | `undefined` | 증감 단위 |
| `autocomplete` | input | `string \| undefined` | `undefined` | autocomplete 속성 |
| `useNumberComma` | input | `boolean` | `true` | number 타입에서 천 단위 쉼표 사용 |
| `minDigits` | input | `number \| undefined` | `undefined` | number 타입 최소 자릿수 |
| `inline` | input | `boolean` | `false` | 인라인 표시 |
| `inset` | input | `boolean` | `false` | 삽입 스타일 |
| `size` | input | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `theme` | input | `string \| undefined` | `undefined` | 테마 |

**스타일 적용**: 입력 영역 스타일은 `inputClass`/`inputStyle`을 사용한다. 호스트(`<sd-textfield>`)에 직접 `class`/`style`을 줘도 입력 영역 외형은 변경되지 않는다.

## Related Types

### `SdTextarea`

멀티라인 텍스트 입력 컴포넌트.

```typescript
@Component({ selector: "sd-textarea" })
class SdTextarea {
  value = model<string>();
  placeholder = input<string>();
  title = input<string>();
  minRows = input<number>(1);
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  theme = input<string>();
  inputStyle = input<string>();
  inputClass = input<string>();
}
```

### `SdNumpad`

숫자 패드 컴포넌트.

```typescript
@Component({ selector: "sd-numpad" })
class SdNumpad {
  placeholder = input<string>();
  value = model<number>();
  required = input(false, { transform: booleanAttribute });
  inputDisabled = input(false, { transform: booleanAttribute });
  useEnterButton = input(false, { transform: booleanAttribute });
  useMinusButton = input(false, { transform: booleanAttribute });
  enterButtonClick = output();
}
```

### `SdRange`

범위 슬라이더 컴포넌트.

```typescript
@Component({ selector: "sd-range" })
class SdRange<K extends keyof SdTextfieldTypes> {
  type = input.required<K>();
  from = model<SdTextfieldTypes[K]>();
  to = model<SdTextfieldTypes[K]>();
  inputStyle = input<string>();
  required = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
}
```

### `SdDateRangePicker`

날짜 범위 선택기.

```typescript
@Component({ selector: "sd-date-range-picker" })
class SdDateRangePicker {
  periodType = model<"일" | "월" | "범위">("범위");
  from = model<DateOnly>();
  to = model<DateOnly>();
  required = input(false, { transform: booleanAttribute });
}
```
