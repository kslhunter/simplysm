# UI - Form

## Buttons

### `SdButton`

버튼 컴포넌트.

```typescript
@Component({ selector: "sd-button" })
class SdButton {
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `inline` | `boolean` | `false` | 인라인 표시 |
| `inset` | `boolean` | `false` | 테두리 없는 삽입 스타일 |
| `disabled` | `boolean` | `false` | 비활성화 |

호스트 속성: `data-sd-theme`, `data-sd-size`, `data-sd-disabled`

### `SdAnchor`

앵커(인라인 버튼) 컴포넌트. 텍스트 내 클릭 가능 요소.

```typescript
@Component({ selector: "sd-anchor" })
class SdAnchor {
  disabled = input(false, { transform: booleanAttribute });
}
```

### `SdAdditionalButton`

추가 동작 버튼. 드롭다운 포함.

```typescript
@Component({ selector: "sd-additional-button" })
class SdAdditionalButton {
  inset = input(false, { transform: booleanAttribute });
}
```

### `SdModalSelectButton`

모달을 열어 선택하는 버튼 컴포넌트. 선택/지우기 버튼과 값 표시 영역으로 구성.

```typescript
@Component({ selector: "sd-modal-select-button" })
class SdModalSelectButton<T> {
  modal = input.required<SdSelectModalInfo<SdSelectModal<T>>>();
  value = model<SelectModeValue<any>[any]>();
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  selectMode = input<"single" | "multi">("single");
  searchIcon = input(tablerSearch);
  modalOptions = input<SdModalOptions>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `modal` | `SdSelectModalInfo<...>` | required | 모달 정보 |
| `value` | `any` | - | 선택된 값 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `required` | `boolean` | `false` | 필수 (지우기 버튼 숨김) |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `selectMode` | `"single" \| "multi"` | `"single"` | 선택 모드 |
| `searchIcon` | `string` | `tablerSearch` | 검색 아이콘 |
| `modalOptions` | `SdModalOptions \| undefined` | - | 모달 옵션 |

## Inputs

### `SdTextfield`

텍스트 입력 컴포넌트. 13가지 타입을 지원한다.

```typescript
@Component({ selector: "sd-textfield" })
class SdTextfield<K extends keyof SdTextfieldTypes> {
  type = input.required<K>();
  value = model<SdTextfieldTypes[K] | undefined>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  useNumberComma = input(true, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  placeholder = input<string>();
  format = input<string>();
  min = input<SdTextfieldTypes[K]>();
  max = input<SdTextfieldTypes[K]>();
  step = input<number>();
  size = input<"sm" | "lg">();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `keyof SdTextfieldTypes` | required | 입력 타입 (number, text, password, color, email, format, date, month, year, datetime, datetime-sec, time, time-sec) |
| `value` | `SdTextfieldTypes[K] \| undefined` | - | 값 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `readonly` | `boolean` | `false` | 읽기 전용 |
| `required` | `boolean` | `false` | 필수 |
| `useNumberComma` | `boolean` | `true` | number 타입에서 천 단위 쉼표 사용 |
| `inline` | `boolean` | `false` | 인라인 표시 |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `format` | `string \| undefined` | - | format 타입에서 사용할 포맷 문자열 |

### `SdTextarea`

멀티라인 텍스트 입력 컴포넌트.

```typescript
@Component({ selector: "sd-textarea" })
class SdTextarea {
  value = model<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
}
```

### `SdNumpad`

숫자 패드 컴포넌트.

```typescript
@Component({ selector: "sd-numpad" })
class SdNumpad {
  value = model<number | undefined>();
  required = input(false, { transform: booleanAttribute });
  inputDisabled = input(false, { transform: booleanAttribute });
  useEnterButton = input(false, { transform: booleanAttribute });
  useMinusButton = input(false, { transform: booleanAttribute });
}
```

### `SdRange`

범위 슬라이더 컴포넌트.

```typescript
@Component({ selector: "sd-range" })
class SdRange<K extends keyof SdTextfieldTypes> {
  type = input.required<K>();
  from = model<SdTextfieldTypes[K] | undefined>();
  to = model<SdTextfieldTypes[K] | undefined>();
  required = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
}
```

### `SdDateRangePicker`

날짜 범위 선택기.

```typescript
@Component({ selector: "sd-date-range-picker" })
class SdDateRangePicker {
  from = model<DateOnly | undefined>();
  to = model<DateOnly | undefined>();
  required = input(false, { transform: booleanAttribute });
}
```

## Choice

### `SdStatePreset`

상태 프리셋 저장/불러오기 컴포넌트. 사용자 설정을 저장하고 복원한다.

```typescript
@Component({ selector: "sd-state-preset" })
class SdStatePreset {
  key = input.required<string>();
}
```

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
  icon = input(tablerCheck);
  radio = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `boolean` | `false` | 체크 여부 (two-way) |
| `icon` | `string` | `tablerCheck` | 체크 아이콘 |
| `radio` | `boolean` | `false` | 라디오 버튼 스타일 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `inline` | `boolean` | `false` | 인라인 표시 |
| `inset` | `boolean` | `false` | 삽입 스타일 |

### `SdSwitch`

스위치 토글 컴포넌트.

```typescript
@Component({ selector: "sd-switch" })
class SdSwitch {
  value = model(false);
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
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
}
```

## Select

### `SdSelect`

드롭다운 선택 컴포넌트. single/multi/multi-with-header 모드를 지원한다.

```typescript
@Component({ selector: "sd-select" })
class SdSelect<T, M extends keyof SelectModeValue<T>> {
  value = model<SelectModeValue<T>[M]>();
  selectMode = input("single" as M);
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  hideSelectAll = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
}
```

### `SelectModeValue`

```typescript
type SelectModeValue<T> = {
  single: T | undefined;
  multi: T[];
  "multi-with-header": T[];
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

폼 래퍼 컴포넌트. submit 이벤트 처리, 유효성 검증, busy 관리.

```typescript
@Component({ selector: "sd-form" })
class SdForm { }
```

`<form>` 태그를 렌더링하며 submit 이벤트를 처리한다.
