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

**스타일 적용**: 배경/색상/테두리/패딩 등 시각적 스타일은 내부 `<button>`에 적용되므로 `buttonClass`/`buttonStyle`을 사용한다. 호스트(`<sd-button>`)에 직접 `class`/`style`을 줘도 버튼 외형은 변경되지 않는다.

#### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — `[type]="'submit'"` 검색 버튼, `[theme]="'link-info'"` 새로고침 버튼
- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — 저장/등�� 버튼
- [crud-list.md §11 확장 G: 엑셀 업로드/다운로드](./recipes/crud-list.md#11-확장-g-엑셀-업로드다운로드) — 엑셀 업로드/다운로드 버튼
- [crud-detail.md §3 최소 뼈대: 읽기 전용 상세 폼](./recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — 새로고침 버튼
- [crud-detail.md §5 확장 A: 편집/저장](./recipes/crud-detail.md#5-확장-a-편집저장) — 저장 버튼
- [crud-detail.md §6 확장 B: 삭제/복구 토글](./recipes/crud-detail.md#6-확장-b-삭제복구-토글) — 삭제/복구 버튼
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 하단 확인/취소/삭제/복구 버튼

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

#### 실사용 예

- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — 인라인 버튼 (행 수정 링크)
- [crud-list.md §7 확장 C: inline 삭제 열](./recipes/crud-list.md#7-확장-c-inline-삭제-열) — `[theme]="'danger'"` 삭제 토글
- [crud-list.md §10 확장 F: 모달 편집 모드](./recipes/crud-list.md#10-확장-f-모달-편집-모드) — 행 클릭 편집 모달 열기
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 우측 상단 액션
- [crud-detail.md §10 확장 F: 복합 상세](./recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 행 삭제 아이콘

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

**스타일 적용**: 배경/테두리/패딩/텍스트 정렬 등 입력 영역 스타일은 내부 `<input>`(및 readonly/disabled 시 표시되는 `._contents`)에 적용되므로 `inputClass`/`inputStyle`을 사용한다. 호스트(`<sd-textfield>`)에 직접 `class`/`style`을 줘도 입력 영역 외형은 변경되지 않는다. 미리 정의된 테마 색상은 `theme` input으로 지정한다.

#### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 필터 텍스트 입력
- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — 시트 셀 내 사용 (`[inset]="true" [size]="'sm'" [readonly]="!edit"`)
- [crud-detail.md §3 최소 뼈대: 읽기 전용 상세 폼](./recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — form 내 `[readonly]="true"` 필드
- [crud-detail.md §5 확장 A: 편집/저장](./recipes/crud-detail.md#5-확장-a-편집저장) — form 내 편집 가능 필드
- [crud-detail.md §10 확장 F: 복합 상세](./recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 하위 컬렉션 시트 셀 내 사용

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

**스타일 적용**: 배경/테두리/패딩 등 입력 영역 스타일은 내부 `<textarea>`(및 readonly/disabled 시 표시되는 `._contents`)에 적용되므로 `inputClass`/`inputStyle`을 사용한다. 호스트(`<sd-textarea>`)에 직접 `class`/`style`을 줘도 입력 영역 외형은 변경되지 않는다. 미리 정의된 테마 색상은 `theme` input으로 지정한다.

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

**스타일 적용**: 입력 요소 스타일은 내부 `<input>`에 적용되므로 `inputStyle`을 사용한다(클래스 input 없음). 호스트(`<sd-range>`)에 직접 `class`/`style`을 줘도 입력 영역 외형은 변경되지 않는다.

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

**스타일 적용**: `contentStyle`은 체크박스 옆 라벨 텍스트(`._contents`) 영역에만 적용된다. 인디케이터 박스의 배경/색상은 `theme` input으로 변경한다(별도 class/style input 없음). 호스트(`<sd-checkbox>`)에 직접 `class`/`style`을 주면 전체 영역 layout/여백 정도만 영향을 주며 인디케이터 외형은 바뀌지 않는다.

#### 실사용 예

- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — 필터의 "삭제항목 포함" 체크박스

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
| `contentClass` | `string \| undefined` | `undefined` | 선택값이 표시되는 영역에 추가할 CSS 클래스 |
| `contentStyle` | `string \| undefined` | `undefined` | 선택값이 표시되는 영역에 적용할 인라인 스타일 |

**스타일 적용**: `contentClass`/`contentStyle`은 트리거 영역(선택값 텍스트와 드롭다운 화살표가 함께 놓인 박스)에만 적용된다. 드롭다운으로 펼쳐지는 팝업 영역은 이 input으로 스타일링할 수 없다. 호스트(`<sd-select>`)에 직접 `class`/`style`을 주면 전체 영역 layout/여백/너비 정도에만 영향을 준다.

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

#### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 필터 폼 `(formSubmit)` + `<sd-button [type]="'submit'">` 검색 트리거
- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — `#formCtrl` 템플릿 변수 + `formCtrl.requestSubmit()` 프로그래밍 방식 저장
- [crud-detail.md §3 최소 뼈대: 읽기 전용 상세 폼](./recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — 읽기 전용 필드 배치 컨테이너
- [crud-detail.md §5 확장 A: 편집/저장](./recipes/crud-detail.md#5-확장-a-편집저장) — `(formSubmit)` + `requestSubmit()` 저장 트리거

### `SdSharedDataSelect`

공유 데이터 드롭다운 선택 컴포넌트. 검색 기능 포함. 전체 API는 [`features.md`](./features.md#sdshareddata select)를 참조한다.

시트 셀 내 사용:

```html
<sd-sheet-column [header]="'거래처'" [key]="'vendorId'">
  <ng-template [cell]="items()" let-item let-edit="edit">
    <sd-shared-data-select
      [items]="sharedVendors()"
      [inset]="true"
      [size]="'sm'"
      [disabled]="!canEdit()"
      [readonly]="!edit"
      [(value)]="item.vendorId"
      (valueChange)="mark(items)"
    >
      <ng-template [itemOf]="sharedVendors()">
        <div class="flex-row gap-sm">
          <div>{{ item.__searchText }}</div>
        </div>
      </ng-template>
    </sd-shared-data-select>
  </ng-template>
</sd-sheet-column>
```

일반 form 내 사용:

```html
<sd-shared-data-select
  [items]="sharedUsers()"
  [(value)]="data().permCopySourceId"
  (valueChange)="mark(data)"
>
  <ng-template [itemOf]="sharedUsers()">
    <div>{{ item.__searchText }}</div>
  </ng-template>
</sd-shared-data-select>
```

- `items`에는 앱 공용 `useSharedSignal`(또는 `SdSharedDataProvider.getHandle()`)이 반환하는 공유 데이터 배열을 바인딩한다.
- `<ng-template [itemOf]>` 내부에서 드롭다운 항목의 표시 형태를 정의한다. `item.__searchText`가 기본 검색 대상이다.
- 시트 셀 내 사용 시 `[inset]="true" [size]="'sm'"`를 반드시 지정한다 ([셀 내용 작성 지침](./ui-data.md#sdsheetcolumncelltemplate) 참조).

#### 실사용 예

- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — 시트 셀 내 공유 데이터 드롭다운
- [crud-detail.md §9 확장 E: 보조 기능 영역](./recipes/crud-detail.md#9-확장-e-보조-기능-영역) — 보조 form 셀렉터
