# Form Control

Source: `src/components/form-control/**`

## `Button`

Standard button component with theme, variant, and size support.

```ts
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: ButtonTheme;
  variant?: ButtonVariant;
  size?: ButtonSize;
  inset?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `theme` | `ButtonTheme` | Semantic color theme |
| `variant` | `ButtonVariant` | Visual variant |
| `size` | `ButtonSize` | Size scale |
| `inset` | `boolean` | Borderless inset style |

## `Select`

Single/multi select dropdown. Compound component with Item, Header, Action, ItemTemplate sub-components.

```ts
type SelectProps<TValue> =
  | (SelectSingleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectSingleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>);
```

Discriminated by `multiple` field (boolean) and `items` presence.

### Sub-components

- **`Select.Item<TValue>`** -- Selectable option.
- **`Select.Header`** -- Custom header in dropdown.
- **`Select.Action`** -- Action button appended to trigger.
- **`Select.ItemTemplate`** -- Render template for `items` mode.

### `SelectContext`

```ts
interface SelectContextValue<TValue = unknown> {
  multiple: Accessor<boolean>;
  isSelected: (value: TValue) => boolean;
  toggleValue: (value: TValue) => void;
  closeDropdown: () => void;
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
  size: Accessor<ComponentSize>;
}

const SelectContext: Context<SelectContextValue>;
```

| Field | Type | Description |
|-------|------|-------------|
| `multiple` | `Accessor<boolean>` | Whether multi-select is enabled |
| `isSelected` | `(value: TValue) => boolean` | Check if value is selected |
| `toggleValue` | `(value: TValue) => void` | Toggle selection of a value |
| `closeDropdown` | `() => void` | Close the dropdown popup |
| `setItemTemplate` | `(fn) => void` | Set item render template |
| `size` | `Accessor<ComponentSize>` | Current size |

### `SelectItemProps`

```ts
interface SelectItemProps<TValue = unknown> extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onClick"> {
  value: TValue;
  disabled?: boolean;
}
```

## `Combobox`

Autocomplete component with async search support. Compound with Item, ItemTemplate.

```ts
type ComboboxProps<TValue = unknown> =
  | ComboboxCustomParserProps<TValue>
  | ComboboxCustomStringProps
  | ComboboxDefaultProps<TValue>;
```

### Sub-components

- **`Combobox.Item<TValue>`** -- Selectable item.
- **`Combobox.ItemTemplate`** -- Render template for loaded items.

### `ComboboxContext`

```ts
interface ComboboxContextValue<TValue = unknown> {
  isSelected: (value: TValue) => boolean;
  selectValue: (value: TValue) => void;
  closeDropdown: () => void;
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

const ComboboxContext: Context<ComboboxContextValue>;
```

### `ComboboxItemProps`

```ts
interface ComboboxItemProps<TValue = unknown> extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onClick"> {
  value: TValue;
  disabled?: boolean;
}
```

## `TextInput`

Text input field with format, validation, and IME composition support. Has Prefix sub-component.

```ts
interface TextInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  type?: "text" | "password" | "email";
  placeholder?: string;
  title?: string;
  autocomplete?: JSX.HTMLAutocomplete;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  format?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  validate?: (value: string) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | `string` | Current text value |
| `onValueChange` | `(value: string) => void` | Value change callback |
| `type` | `"text" \| "password" \| "email"` | HTML input type |
| `format` | `string` | Display format string |
| `required` | `boolean` | Required validation |
| `minLength` | `number` | Minimum character length |
| `maxLength` | `number` | Maximum character length |
| `pattern` | `string \| RegExp` | Regex validation pattern |
| `validate` | `(value: string) => string \| undefined` | Custom validation function; return error message |
| `lazyValidation` | `boolean` | Show error only after blur |
| `inset` | `boolean` | Borderless inset style |

- **`TextInput.Prefix`** -- Slot for prefix icon/element.

## `NumberInput`

Numeric input with grouping and validation. Has Prefix sub-component.

```ts
interface NumberInputProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  useGrouping?: boolean;
  minimumFractionDigits?: number;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  required?: boolean;
  min?: number;
  max?: number;
  validate?: (value: number | undefined) => string | undefined;
  lazyValidation?: boolean;
  children?: JSX.Element;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `useGrouping` | `boolean` | Enable thousands separator |
| `minimumFractionDigits` | `number` | Minimum decimal places |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |

- **`NumberInput.Prefix`** -- Slot for prefix icon/element.

## `DatePicker`

Date input supporting year/month/date units.

```ts
interface DatePickerProps {
  value?: DateOnly;
  onValueChange?: (value: DateOnly | undefined) => void;
  unit?: DatePickerUnit;
  min?: DateOnly;
  max?: DateOnly;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  required?: boolean;
  validate?: (value: DateOnly | undefined) => string | undefined;
  lazyValidation?: boolean;
}
```

## `DateTimePicker`

DateTime input supporting minute/second units.

```ts
interface DateTimePickerProps {
  value?: DateTime;
  onValueChange?: (value: DateTime | undefined) => void;
  unit?: DateTimePickerUnit;
  min?: DateTime;
  max?: DateTime;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  required?: boolean;
  validate?: (value: DateTime | undefined) => string | undefined;
  lazyValidation?: boolean;
}
```

## `TimePicker`

Time input supporting minute/second units.

```ts
interface TimePickerProps {
  value?: Time;
  onValueChange?: (value: Time | undefined) => void;
  unit?: TimePickerUnit;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  min?: Time;
  max?: Time;
  required?: boolean;
  validate?: (value: Time | undefined) => string | undefined;
  lazyValidation?: boolean;
}
```

## `Textarea`

Multi-line text input with auto-sizing.

```ts
interface TextareaProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  minRows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  validate?: (value: string) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## `Checkbox`

Checkbox with check mark indicator.

```ts
interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  required?: boolean;
  validate?: (checked: boolean) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

## `Radio`

Radio button with circular indicator. Same props as Checkbox.

```ts
interface RadioProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  required?: boolean;
  validate?: (checked: boolean) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

## `CheckboxGroup`

Multi-select checkbox group. Compound with Item sub-component.

```ts
interface CheckboxGroupProps<TValue> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue[]) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

- **`CheckboxGroup.Item<TValue>`** -- Individual checkbox option within group.

## `RadioGroup`

Single-select radio group. Compound with Item sub-component.

```ts
interface RadioGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

- **`RadioGroup.Item<TValue>`** -- Individual radio option within group.

## `ColorPicker`

Native HTML color picker input.

```ts
interface ColorPickerProps {
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  title?: string;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  required?: boolean;
  validate?: (value: string | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## `DateRangePicker`

Date range picker with day/month/range modes.

```ts
type DateRangePeriodType = "day" | "month" | "range";

interface DateRangePickerProps {
  periodType?: DateRangePeriodType;
  onPeriodTypeChange?: (value: DateRangePeriodType) => void;
  from?: DateOnly;
  onFromChange?: (value: DateOnly | undefined) => void;
  to?: DateOnly;
  onToChange?: (value: DateOnly | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `periodType` | `DateRangePeriodType` | Period selection mode |
| `from` | `DateOnly` | Range start date |
| `to` | `DateOnly` | Range end date |

## `RichTextEditor`

TipTap-based rich text editor with toolbar.

```ts
interface RichTextEditorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## `Numpad`

Virtual number pad with buttons for numeric input.

```ts
interface NumpadProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  placeholder?: string;
  required?: boolean;
  inputDisabled?: boolean;
  withEnterButton?: boolean;
  withMinusButton?: boolean;
  onEnterButtonClick?: () => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `inputDisabled` | `boolean` | Disable direct text input (keypad only) |
| `withEnterButton` | `boolean` | Show enter/confirm button |
| `withMinusButton` | `boolean` | Show minus/negative button |
| `onEnterButtonClick` | `() => void` | Enter button click callback |

## `StatePreset`

Save/restore state presets with local storage.

```ts
interface StatePresetProps<TValue> {
  storageKey: string;
  value: TValue;
  onValueChange: (value: TValue) => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## `ThemeToggle`

Theme mode toggle button cycling through light/system/dark.

```ts
interface ThemeToggleProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: ComponentSize;
}
```

## `Invalid`

Validation error indicator wrapper component.

```ts
interface InvalidProps {
  message?: string;
  variant?: "border" | "dot";
  lazyValidation?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Error message to display |
| `variant` | `"border" \| "dot"` | Visual indicator style |
| `lazyValidation` | `boolean` | Delay showing error until blur |

## Field Style Exports

Shared styling utilities for form field components.

```ts
const fieldSurface: string;
const fieldBaseClass: string;
const fieldSizeClasses: Record<ComponentSize, string>;
const fieldInsetClass: string;
const fieldInsetSizeHeightClasses: Record<ComponentSize, string>;
const fieldDisabledClass: string;
const textAreaBaseClass: string;
const textAreaSizeClasses: Record<ComponentSize, string>;
const fieldInputClass: string;
const fieldGapClasses: Record<ComponentSize, string>;

function getFieldWrapperClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  includeCustomClass?: string | false;
  extra?: string | false;
}): string;

function getTextareaWrapperClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  includeCustomClass?: string | false;
}): string;
```

| Export | Type | Description |
|--------|------|-------------|
| `fieldSurface` | `string` | Common surface styles for form fields |
| `fieldBaseClass` | `string` | Base wrapper styles |
| `fieldSizeClasses` | `Record<ComponentSize, string>` | Size-specific styles |
| `fieldInsetClass` | `string` | Inset/borderless styles |
| `fieldInsetSizeHeightClasses` | `Record<ComponentSize, string>` | Inset height styles by size |
| `fieldDisabledClass` | `string` | Disabled state styles |
| `textAreaBaseClass` | `string` | Textarea wrapper base styles |
| `textAreaSizeClasses` | `Record<ComponentSize, string>` | Textarea size-specific styles |
| `fieldInputClass` | `string` | Input element styles |
| `fieldGapClasses` | `Record<ComponentSize, string>` | Prefix icon gap styles |
| `getFieldWrapperClass` | `function` | Generate field wrapper CSS classes |
| `getTextareaWrapperClass` | `function` | Generate textarea wrapper CSS classes |

## Checkbox Style Exports

Shared styling utilities for checkbox and radio components.

```ts
type CheckboxSize = ComponentSize;

const checkboxBaseClass: string;
const indicatorBaseClass: string;
const checkedClass: string;
const checkboxSizeClasses: Record<CheckboxSize, string>;
const checkboxInsetClass: string;
const checkboxInsetSizeHeightClasses: Record<CheckboxSize, string>;
const checkboxInlineClass: string;
const checkboxDisabledClass: string;
```

| Export | Type | Description |
|--------|------|-------------|
| `CheckboxSize` | `type` | Alias for ComponentSize |
| `checkboxBaseClass` | `string` | Wrapper base styles |
| `indicatorBaseClass` | `string` | Indicator base styles |
| `checkedClass` | `string` | Checked state styles |
| `checkboxSizeClasses` | `Record<CheckboxSize, string>` | Size-specific wrapper styles |
| `checkboxInsetClass` | `string` | Inset mode styles |
| `checkboxInsetSizeHeightClasses` | `Record<CheckboxSize, string>` | Inset size-specific heights |
| `checkboxInlineClass` | `string` | Inline display styles |
| `checkboxDisabledClass` | `string` | Disabled state styles |
