# UI - Form

## Buttons

### `SdButton`

버튼 컴포넌트.

```typescript
@Component({ selector: "sd-button" })
class SdButton {
  type = input<"button" | "submit">("button");
  theme = input<"primary" | "secondary" | "info" | ... | "link" | "link-primary" | ... | "link-rev">();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  disabled = input(false, { transform: booleanAttribute });
  buttonStyle = input<string>();
  buttonClass = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `"button" \| "submit"` | `"button"` | 버튼 HTML 타입 |
| `theme` | `string \| undefined` | `undefined` | 테마 (primary, secondary, info, success, warning, danger, gray, blue-gray, link, link-primary, link-secondary, link-info, link-success, link-warning, link-danger, link-gray, link-blue-gray, link-rev) |
| `inline` | `boolean` | `false` | 인라인 표시 |
| `inset` | `boolean` | `false` | 테두리 없는 삽입 스타일 |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `buttonStyle` | `string \| undefined` | `undefined` | 버튼 인라인 스타일 |
| `buttonClass` | `string \| undefined` | `undefined` | 버튼 CSS 클래스 |

호스트 속성: `data-sd-theme`, `data-sd-inline`, `data-sd-size`, `data-sd-inset`, `data-sd-disabled`

### `SdAnchor`

앵커(인라인 버튼) 컴포넌트. 텍스트 내 클릭 가능 요소.

```typescript
@Component({ selector: "sd-anchor" })
class SdAnchor {
  disabled = input(false, { transform: booleanAttribute });
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">("primary");
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `disabled` | `boolean` | `false` | 비활성화 |
| `theme` | `string` | `"primary"` | 테마 색상 |

### `SdAdditionalButton`

추가 동작 버튼. 드롭다운 포함.

```typescript
@Component({ selector: "sd-additional-button" })
class SdAdditionalButton {
  size = input<"sm" | "lg">();
  inset = input(false, { transform: booleanAttribute });
}
```

### `SdModalSelectButton`

모달을 열어 선택하는 버튼 컴포넌트. 선택/지우기 버튼과 값 표시 영역으로 구성.

```typescript
@Component({ selector: "sd-modal-select-button" })
class SdModalSelectButton<T extends object, K, M extends keyof SelectModeValue<K>> {
  modal = input.required<SdSelectModalInfo<SdSelectModal<T>>>();
  value = model<SelectModeValue<K>[M]>();
  selectedItems = model<T[]>([]);
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<M>("single" as M);
  modalOptions = input<SdModalOptions>();
  searchIcon = input(tablerSearch);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `modal` | `SdSelectModalInfo<...>` | required | 모달 정보 |
| `value` | `SelectModeValue<K>[M]` | - | 선택된 값 (two-way) |
| `selectedItems` | `T[]` | `[]` | 선택된 항목 객체 배열 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `required` | `boolean` | `false` | 필수 (지우기 버튼 숨김) |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `selectMode` | `M` | `"single"` | 선택 모드 |
| `modalOptions` | `SdModalOptions \| undefined` | `undefined` | 모달 옵션 |
| `searchIcon` | `string` | `tablerSearch` | 검색 아이콘 |

## Inputs

### `SdTextfield`

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

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `keyof SdTextfieldTypes` | required | 입력 타입 (number, text, password, color, email, format, date, month, year, datetime, datetime-sec, time, time-sec) |
| `value` | `SdTextfieldTypes[K] \| undefined` | - | 값 (two-way) |
| `placeholder` | `string \| undefined` | `undefined` | 플레이스홀더 |
| `title` | `string \| undefined` | `undefined` | title 속성 (없으면 placeholder 사용) |
| `inputStyle` | `string \| undefined` | `undefined` | input 인라인 스타일 |
| `inputClass` | `string \| undefined` | `undefined` | input CSS 클래스 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `readonly` | `boolean` | `false` | 읽기 전용 |
| `required` | `boolean` | `false` | 필수 |
| `min` | `SdTextfieldTypes[K] \| undefined` | `undefined` | 최소값 |
| `max` | `SdTextfieldTypes[K] \| undefined` | `undefined` | 최대값 |
| `minlength` | `number \| undefined` | `undefined` | 최소 길이 |
| `maxlength` | `number \| undefined` | `undefined` | 최대 길이 |
| `pattern` | `string \| undefined` | `undefined` | 입력 패턴 (정규식) |
| `validatorFn` | `((value) => string \| undefined) \| undefined` | `undefined` | 커스텀 유효성 검증 함수 (에러 메시지 반환) |
| `format` | `string \| undefined` | `undefined` | format 타입에서 사용할 포맷 문자열 |
| `step` | `number \| undefined` | `undefined` | 증감 단위 |
| `autocomplete` | `string \| undefined` | `undefined` | autocomplete 속성 |
| `useNumberComma` | `boolean` | `true` | number 타입에서 천 단위 쉼표 사용 |
| `minDigits` | `number \| undefined` | `undefined` | number 타입 최소 자릿수 |
| `inline` | `boolean` | `false` | 인라인 표시 |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `theme` | `string \| undefined` | `undefined` | 테마 |

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

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `placeholder` | `string \| undefined` | `undefined` | 플레이스홀더 |
| `value` | `number \| undefined` | - | 값 (two-way) |
| `required` | `boolean` | `false` | 필수 |
| `inputDisabled` | `boolean` | `false` | 입력 필드 비활성화 |
| `useEnterButton` | `boolean` | `false` | 엔터 버튼 표시 |
| `useMinusButton` | `boolean` | `false` | 마이너스 버튼 표시 |

| Output | Type | Description |
|--------|------|-------------|
| `enterButtonClick` | `void` | 엔터 버튼 클릭 시 발생 |

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

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `periodType` | `"일" \| "월" \| "범위"` | `"범위"` | 기간 선택 타입 (two-way) |
| `from` | `DateOnly \| undefined` | - | 시작일 (two-way) |
| `to` | `DateOnly \| undefined` | - | 종료일 (two-way) |
| `required` | `boolean` | `false` | 필수 |

## Choice

### `SdStatePreset`

상태 프리셋 저장/불러오기 컴포넌트. 사용자 설정을 저장하고 복원한다.

```typescript
@Component({ selector: "sd-state-preset" })
class SdStatePreset {
  key = input.required<string>();
  state = model<any>();
  size = input<"sm" | "lg">();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | required | 프리셋 저장 키 |
| `state` | `any` | - | 상태 데이터 (two-way) |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |

### `SdStatePresetDef`

```typescript
interface SdStatePresetDef {
  name: string;
  state: any;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 프리셋 이름 |
| `state` | `any` | 저장된 상태 데이터 |

## Checkbox

### `SdCheckbox`

체크박스 컴포넌트.

```typescript
@Component({ selector: "sd-checkbox" })
class SdCheckbox {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);
  icon = input(tablerCheck);
  radio = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  theme = input<"primary" | "secondary" | ...>();
  contentStyle = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `boolean` | `false` | 체크 여부 (two-way) |
| `canChangeFn` | `(item: boolean) => boolean \| Promise<boolean>` | `() => true` | 값 변경 가능 여부 함수 |
| `icon` | `string` | `tablerCheck` | 체크 아이콘 |
| `radio` | `boolean` | `false` | 라디오 버튼 스타일 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `inline` | `boolean` | `false` | 인라인 표시 |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `theme` | `string \| undefined` | `undefined` | 테마 색상 |
| `contentStyle` | `string \| undefined` | `undefined` | 컨텐츠 인라인 스타일 |

### `SdSwitch`

스위치 토글 컴포넌트.

```typescript
@Component({ selector: "sd-switch" })
class SdSwitch {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input<string>();
}
```

### `SdCheckboxGroup`

체크박스 그룹 컴포넌트.

```typescript
@Component({ selector: "sd-checkbox-group" })
class SdCheckboxGroup<T> {
  value = model<T[]>([]);
  disabled = input(false, { transform: booleanAttribute });
}
```

### `SdCheckboxGroupItem`

체크박스 그룹 항목.

```typescript
@Component({ selector: "sd-checkbox-group-item" })
class SdCheckboxGroupItem<T> {
  value = input.required<T>();
  inline = input(false, { transform: booleanAttribute });
}
```

## Editor

### `SdTiptapEditor`

TipTap 기반 리치 텍스트 에디터.

```typescript
@Component({ selector: "sd-tiptap-editor" })
class SdTiptapEditor {
  value = model<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  placeholder = input<string>();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  extensions = input<AnyExtension[]>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string \| undefined` | - | HTML 콘텐츠 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `readonly` | `boolean` | `false` | 읽기 전용 |
| `required` | `boolean` | `false` | 필수 |
| `placeholder` | `string \| undefined` | `undefined` | 플레이스홀더 |
| `validatorFn` | `((value) => string \| undefined) \| undefined` | `undefined` | 커스텀 유효성 검증 함수 |
| `extensions` | `AnyExtension[] \| undefined` | `undefined` | 추가 TipTap 확장 |

## Select

### `SdSelect`

드롭다운 선택 컴포넌트. single/multi 모드를 지원한다.

```typescript
@Component({ selector: "sd-select" })
class SdSelect<T, M extends keyof SelectModeValue<T>> {
  selectMode = input("single" as M);
  value = model<SelectModeValue<any>[M]>();
  placeholder = input<string>();
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  required = input(false, { transform: booleanAttribute });
  hideSelectAll = input(false, { transform: booleanAttribute });
  multiSelectionDisplayDirection = input<"vertical">();
  items = input<T[]>();
  getChildrenFn = input<(item: T) => T[] | undefined>();
  contentClass = input<string>();
  contentStyle = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `selectMode` | `M` | `"single"` | 선택 모드 |
| `value` | `SelectModeValue<any>[M]` | - | 선택된 값 (two-way) |
| `placeholder` | `string \| undefined` | `undefined` | 플레이스홀더 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `inline` | `boolean` | `false` | 인라인 표시 |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `required` | `boolean` | `false` | 필수 |
| `hideSelectAll` | `boolean` | `false` | multi 모드에서 전체 선택 숨김 |
| `multiSelectionDisplayDirection` | `"vertical" \| undefined` | `undefined` | multi 모드 표시 방향 |
| `items` | `T[] \| undefined` | `undefined` | 항목 배열 (selectMode가 "multi"일 때 내부 목록 렌더링용) |
| `getChildrenFn` | `((item) => T[] \| undefined) \| undefined` | `undefined` | 트리 구조 자식 함수 |
| `contentClass` | `string \| undefined` | `undefined` | 컨텐츠 CSS 클래스 |
| `contentStyle` | `string \| undefined` | `undefined` | 컨텐츠 인라인 스타일 |

### `SelectModeValue`

```typescript
type SelectModeValue<T> = {
  multi: T[];
  single: T;
}
```

### `SdSelectItem`

드롭다운 선택 항목.

```typescript
@Component({ selector: "sd-select-item" })
class SdSelectItem<T> {
  value = input.required<T>();
  disabled = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
}
```

### `SdSelectButton`

버튼 스타일 선택 컴포넌트.

```typescript
@Component({ selector: "sd-select-button" })
class SdSelectButton<T> { }
```

## Form

### `SdForm`

폼 래퍼 컴포넌트. `<form>` 태그를 렌더링하며 submit 이벤트 처리 및 유효성 검증을 수행한다.

```typescript
@Component({ selector: "sd-form" })
class SdForm {
  formSubmit = output<SubmitEvent>();
  formInvalid = output();

  requestSubmit(): void;
}
```

| Output | Type | Description |
|--------|------|-------------|
| `formSubmit` | `SubmitEvent` | 유효성 검증 통과 시 발생 |
| `formInvalid` | `void` | 유효성 검증 실패 시 발생 (`reportValidity()` 호출 후) |

| Method | Description |
|--------|-------------|
| `requestSubmit()` | 프로그래밍 방식으로 submit 트리거 |
