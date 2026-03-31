# UI Form

Form controls: buttons, text inputs, checkboxes, select dropdowns, editors, and form containers.

## `SdButtonControl`

Themed button with ripple effect.

```typescript
@Component({ selector: "sd-button" })
class SdButtonControl {
  type = input<"button" | "submit">("button");
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray" | "link" | "link-primary" | "link-secondary" | "link-info" | "link-success" | "link-warning" | "link-danger" | "link-gray" | "link-blue-gray" | "link-rev">();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  disabled = input(false, { transform: booleanAttribute });
  buttonStyle = input<string>();
  buttonClass = input<string>();
}
```

## `SdAnchorControl`

Inline anchor/link-style clickable element.

```typescript
@Component({ selector: "sd-anchor" })
class SdAnchorControl {
  disabled = input(false, { transform: booleanAttribute });
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">("primary");
}
```

## `SdAdditionalButtonControl`

Layout component that renders main content and button/anchor slots side by side.

```typescript
@Component({ selector: "sd-additional-button" })
class SdAdditionalButtonControl {
  size = input<"sm" | "lg">();
  inset = input(false, { transform: booleanAttribute });
}
```

## `SdModalSelectButtonControl`

Button that opens a selection modal. Manages value/selectedItems state.

```typescript
@Component({ selector: "sd-modal-select-button" })
class SdModalSelectButtonControl {
  selectMode = input<"single" | "multi">("single");
  value = model<TSelectModeValue<any>>();
  selectedItems = model<Record<string, unknown>[]>([]);
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  modal = input<TSdSelectModalInfo<any>>();
  modalOptions = input<ISdModalOptions>();
  size = input<"sm" | "lg">();
  inset = input(false, { transform: booleanAttribute });
}
```

## `ISdSelectModal`

Contract for modal components used with select buttons. Extends `ISdModal`.

```typescript
interface ISdSelectModal<T> extends ISdModal<ISelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi">;
  selectedItemKeys: InputSignal<T[]>;
}
```

## `ISelectModalOutputResult`

```typescript
interface ISelectModalOutputResult<T> {
  selectedItemKeys: T[];
  selectedItems: Record<string, unknown>[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selectedItemKeys` | `T[]` | Selected item keys |
| `selectedItems` | `Record<string, unknown>[]` | Selected item objects |

## `TSdSelectModalInfo`

Type alias for `ISdModalInfo` with `selectMode`/`selectedItemKeys` omitted from inputs.

```typescript
type TSdSelectModalInfo<T extends ISdSelectModal<any>> = ISdModalInfo<T>; // with selectMode/selectedItemKeys excluded
```

## `SdTextfieldControl`

Versatile text input supporting multiple types (text, number, date, datetime, color, etc.).

```typescript
@Component({ selector: "sd-textfield" })
class SdTextfieldControl<K extends keyof TSdTextfieldTypes> {
  value = model<TSdTextfieldTypes[K]>();
  type = input.required<K>();
  placeholder = input<string>();
  title = input<string>();
  inputStyle = input<string>();
  inputClass = input<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  min = input<TSdTextfieldTypes[K]>();
  max = input<TSdTextfieldTypes[K]>();
  minlength = input<number>();
  maxlength = input<number>();
  pattern = input<string>();
  validatorFn = input<(value: TSdTextfieldTypes[K] | undefined) => string | undefined>();
  format = input<string>();
  step = input<number>();
  autocomplete = input<string>();
  useNumberComma = input(true, { transform: booleanAttribute });
  minDigits = input<number>();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
}
```

## `TSdTextfieldTypes`

Maps type keys to their value types.

```typescript
type TSdTextfieldTypes = {
  "number": number;
  "text": string;
  "password": string;
  "color": string;
  "email": string;
  "format": string;
  "date": DateOnly;
  "month": DateOnly;
  "year": DateOnly;
  "datetime": DateTime;
  "datetime-sec": DateTime;
  "time": Time;
  "time-sec": Time;
};
```

## `sdTextfieldTypes`

Ordered array of all textfield type keys.

```typescript
const sdTextfieldTypes: (keyof TSdTextfieldTypes)[];
```

## `SdTextareaControl`

Multi-line text input with auto-growing row count.

```typescript
@Component({ selector: "sd-textarea" })
class SdTextareaControl {
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
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
  inputStyle = input<string>();
  inputClass = input<string>();
}
```

## `SdNumpadControl`

Numeric keypad with on-screen buttons for digit input.

```typescript
@Component({ selector: "sd-numpad" })
class SdNumpadControl {
  value = model<number>();
  text = signal<string | undefined>(undefined);
  placeholder = input<string>();
  required = input(false, { transform: booleanAttribute });
  inputDisabled = input(false, { transform: booleanAttribute });
  useEnterButton = input(false, { transform: booleanAttribute });
  useMinusButton = input(false, { transform: booleanAttribute });
  enterButtonClick = output();
}
```

## `SdRangeControl`

From/to range input using two `SdTextfieldControl` instances. The `to` field's `min` is automatically bound to `from`.

```typescript
@Component({ selector: "sd-range" })
class SdRangeControl<K extends keyof TSdTextfieldTypes> {
  from = model<TSdTextfieldTypes[K]>();
  to = model<TSdTextfieldTypes[K]>();
  type = input.required<K>();
  inputStyle = input<string>();
  required = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
}
```

## `SdDateRangePicker`

Date range picker with period type selector (day/month/range).

```typescript
@Component({ selector: "sd-date-range-picker" })
class SdDateRangePicker {
  periodType = model<"일" | "월" | "범위">("범위");
  from = model<DateOnly>();
  to = model<DateOnly>();
  required = input(false, { transform: booleanAttribute });
}
```

## `SdStatePresetControl`

Save/restore named state presets via system config.

```typescript
@Component({ selector: "sd-state-preset" })
class SdStatePresetControl {
  key = input.required<string>();
  state = model<any>();
  size = input<"sm" | "lg">();
}
```

## `ISdStatePreset`

```typescript
interface ISdStatePreset {
  name: string;
  state: any;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Preset display name |
| `state` | `any` | Serialized state data |

## `SdCheckboxControl`

Checkbox with optional radio style, theming, and async change guard.

```typescript
@Component({ selector: "sd-checkbox" })
class SdCheckboxControl {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);
  icon = input(tablerCheck);
  radio = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray" | "white">();
  contentStyle = input<string>();
}
```

## `SdSwitchControl`

Toggle switch.

```typescript
@Component({ selector: "sd-switch" })
class SdSwitchControl {
  value = model(false);
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
}
```

## `SdCheckboxGroupControl`

Container for a group of checkbox items. Manages a `T[]` value.

```typescript
@Component({ selector: "sd-checkbox-group" })
class SdCheckboxGroupControl<T> {
  value = model<T[]>([]);
  disabled = input(false, { transform: booleanAttribute });
}
```

## `SdCheckboxGroupItemControl`

Individual item within a `SdCheckboxGroupControl`. Toggles its value in the parent group's array.

```typescript
@Component({ selector: "sd-checkbox-group-item" })
class SdCheckboxGroupItemControl<T> {
  value = input.required<T>();
  inline = input(false, { transform: booleanAttribute });
  isSelected = computed(/* whether value is in parent group */);
}
```

## `SdTiptapEditorControl`

Rich text editor powered by TipTap. Supports formatting commands, color picker, and custom extensions.

```typescript
@Component({ selector: "sd-tiptap-editor" })
class SdTiptapEditorControl {
  value = model<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  placeholder = input<string>();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  extensions = input<AnyExtension[]>();

  colorPresets: string[];
  editor: WritableSignal<Editor | undefined>;
  execCmd(cmd: string): void;
  toggleColorPicker(mode: "text" | "bg"): void;
  applyColor(color: string | undefined): void;
}
```

Available commands for `execCmd`: `"bold"`, `"italic"`, `"underline"`, `"strike"`, `"h1"`, `"h2"`, `"bulletList"`, `"orderedList"`, `"indent"`, `"outdent"`, `"blockquote"`, `"codeBlock"`, `"alignLeft"`, `"alignCenter"`, `"alignRight"`, `"alignJustify"`, `"clean"`.

## `SdSelectControl`

Dropdown select with single/multi mode, tree hierarchy, and programmatic item rendering.

```typescript
@Component({ selector: "sd-select" })
class SdSelectControl<T> {
  value = model<TSelectModeValue<T>>();
  selectMode = input<"single" | "multi">("single");
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

  selectItem(itemValue: T): void;
  toggleItem(itemValue: T): void;
  onSelectAll(): void;
  onDeselectAll(): void;
  closeDropdown(): void;
  openDropdown(): void;
}
```

Content templates: `#headerTpl`, `#beforeTpl`, `SdItemOfTemplateDirective`.

## `TSelectModeValue`

```typescript
type TSelectModeValue<T> = T | T[] | undefined;
```

## `SdSelectItemControl`

Individual option within `SdSelectControl`.

```typescript
@Component({ selector: "sd-select-item" })
class SdSelectItemControl<T> {
  value = input.required<T>();
  disabled = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
  isSelected = computed(/* whether value matches parent select's value */);
}
```

## `SdSelectButtonControl`

Slot-projected button rendered inside `sd-select` beside the trigger.

```typescript
@Component({ selector: "sd-select-button" })
class SdSelectButtonControl { }
```

## `SdFormControl`

Form container with submit/invalid event handling.

```typescript
@Component({ selector: "sd-form" })
class SdFormControl {
  formSubmit = output<SubmitEvent>();
  formInvalid = output();
  requestSubmit(): void;
}
```
