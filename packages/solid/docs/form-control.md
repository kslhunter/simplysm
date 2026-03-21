# Form Controls

Source: `src/components/form-control/**/*.tsx`

## Button

Themed button with ripple effect. Extends `JSX.ButtonHTMLAttributes<HTMLButtonElement>`.

```ts
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: SemanticTheme;       // "primary" | "info" | "success" | "warning" | "danger" | "base" (default: "base")
  variant?: "solid" | "outline" | "ghost";  // default: "outline"
  size?: ComponentSize;        // "xs" | "sm" | "md" | "lg" | "xl" (default: "md")
  inset?: boolean;             // borderless style
}
```

## Select

Single or multiple select dropdown. Supports two modes: `items` prop mode and `children` mode.

```ts
// Common props
interface SelectCommonProps<TValue> {
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: ComponentSize;
  inset?: boolean;
  validate?: (value: unknown) => string | undefined;
  lazyValidation?: boolean;
  itemSearchText?: (item: TValue) => string;  // enables search input
  isItemHidden?: (item: TValue) => boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

// Single select
interface SelectSingleProps<TValue> extends SelectCommonProps<TValue> {
  multiple?: false;
  value?: TValue;
  onValueChange?: (value: TValue | undefined) => void;
}

// Multiple select
interface SelectMultipleProps<TValue> extends SelectCommonProps<TValue> {
  multiple: true;
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  tagDirection?: "horizontal" | "vertical";
  hideSelectAll?: boolean;
}

// Items mode: pass items array + ItemTemplate
// Children mode: pass children + renderValue
```

### Sub-components

- **`Select.Item<TValue>`** -- Selectable item. Props: `value: TValue`, `disabled?: boolean`. Supports nested items via `Select.Item.Children`.
- **`Select.Header`** -- Custom header slot rendered above dropdown list.
- **`Select.Action`** -- Action button appended to the trigger. Extends button attributes.
- **`Select.ItemTemplate`** -- Render template for `items` mode. Child is a function: `(item, index, depth) => JSX.Element`.

## Combobox

Autocomplete component with async search and debounced loading.

```ts
interface ComboboxBaseProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  loadItems: (query: string) => TValue[] | Promise<TValue[]>;  // required
  debounceMs?: number;                // default: 300
  renderValue: (value: TValue) => JSX.Element;  // required
  disabled?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  lazyValidation?: boolean;
  placeholder?: string;
  size?: ComponentSize;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

// Custom value variants
interface ComboboxCustomParserProps<TValue> extends ComboboxBaseProps<TValue> {
  allowsCustomValue: true;
  parseCustomValue: (text: string) => TValue;
}

interface ComboboxCustomStringProps extends ComboboxBaseProps<string> {
  allowsCustomValue: true;
  parseCustomValue?: undefined;  // TValue must be string
}

interface ComboboxDefaultProps<TValue> extends ComboboxBaseProps<TValue> {
  allowsCustomValue?: false;
}
```

### Sub-components

- **`Combobox.Item<TValue>`** -- Selectable item. Props: `value: TValue`, `disabled?: boolean`.
- **`Combobox.ItemTemplate`** -- Render template for loaded items. Child is a function: `(item, index) => JSX.Element`.

## TextInput

Text input field with format support and IME handling.

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
  format?: string;               // e.g., "XXX-XXXX-XXXX"
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  validate?: (value: string) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;         // TextInput.Prefix slot
}
```

### Sub-components

- **`TextInput.Prefix`** -- Prefix content displayed before the input.

## NumberInput

Numeric input with thousand separator and decimal formatting.

```ts
interface NumberInputProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  useGrouping?: boolean;          // default: true
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
  children?: JSX.Element;         // NumberInput.Prefix slot
}
```

### Sub-components

- **`NumberInput.Prefix`** -- Prefix content displayed before the input.

## DatePicker

Date input supporting year, month, and date units. Uses `DateOnly` from `@simplysm/core-common`.

```ts
type DatePickerUnit = "year" | "month" | "date";

interface DatePickerProps {
  value?: DateOnly;
  onValueChange?: (value: DateOnly | undefined) => void;
  unit?: DatePickerUnit;          // default: "date"
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

## DateTimePicker

DateTime input supporting minute and second units. Uses `DateTime` from `@simplysm/core-common`.

```ts
type DateTimePickerUnit = "minute" | "second";

interface DateTimePickerProps {
  value?: DateTime;
  onValueChange?: (value: DateTime | undefined) => void;
  unit?: DateTimePickerUnit;      // default: "minute"
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

## TimePicker

Time input supporting minute and second units. Uses `Time` from `@simplysm/core-common`.

```ts
type TimePickerUnit = "minute" | "second";

interface TimePickerProps {
  value?: Time;
  onValueChange?: (value: Time | undefined) => void;
  unit?: TimePickerUnit;          // default: "minute"
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

## Textarea

Auto-resizing textarea with IME handling.

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
  minRows?: number;               // default: 1
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  validate?: (value: string) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## Checkbox

Checkbox with check indicator. Renders via `SelectableBase`.

```ts
interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: ComponentSize;
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

## Radio

Radio button with dot indicator. Always selects on click (never deselects).

```ts
interface RadioProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: ComponentSize;
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

## CheckboxGroup

Multi-select group of checkboxes.

```ts
interface CheckboxGroupProps<TValue> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  disabled?: boolean;
  size?: ComponentSize;
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

### Sub-components

- **`CheckboxGroup.Item<TValue>`** -- Props: `value: TValue`, `disabled?: boolean`, `children?: JSX.Element`.

## RadioGroup

Single-select group of radio buttons.

```ts
interface RadioGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: ComponentSize;
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

### Sub-components

- **`RadioGroup.Item<TValue>`** -- Props: `value: TValue`, `disabled?: boolean`, `children?: JSX.Element`.

## ColorPicker

Native HTML color picker input.

```ts
interface ColorPickerProps {
  value?: string;                 // #RRGGBB format
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

## DateRangePicker

Date range input with period type selector (day/month/range).

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

## RichTextEditor

Tiptap-based rich text editor with toolbar (text formatting, alignment, colors, tables, images).

```ts
interface RichTextEditorProps {
  value?: string;                 // HTML string
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## Numpad

Numeric keypad for touch-friendly number input.

```ts
interface NumpadProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  placeholder?: string;
  required?: boolean;
  inputDisabled?: boolean;        // disable direct text field input
  withEnterButton?: boolean;
  withMinusButton?: boolean;
  onEnterButtonClick?: () => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## StatePreset

Save and restore named state presets to synced storage.

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

## ThemeToggle

Theme cycle button (light -> system -> dark -> light). Must be used inside `ThemeProvider`.

```ts
interface ThemeToggleProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: ComponentSize;
}
```

## Invalid

Validation indicator wrapper. Wraps a child element and shows a validation error via dot or border.

```ts
interface InvalidProps {
  /** Validation error message. Non-empty = invalid. */
  message?: string;
  /** Visual indicator variant */
  variant?: "border" | "dot";
  /** When true, visual display only appears after target loses focus */
  lazyValidation?: boolean;
}
```

## Field Style Exports

Exported from `src/components/form-control/field/Field.styles.ts`:

```ts
const fieldSurface: string;                           // bg + text + border + focus-within
const fieldBaseClass: string;                         // inline-flex + fieldSurface
const fieldSizeClasses: Record<ComponentSize, string>;
const fieldInputClass: string;                        // input element styles
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

## Checkbox Style Exports

Exported from `src/components/form-control/checkbox/Checkbox.styles.ts`:

```ts
type CheckboxSize = ComponentSize;
const checkboxBaseClass: string;
const indicatorBaseClass: string;
const checkedClass: string;
const checkboxSizeClasses: Record<CheckboxSize, string>;
```

## DropdownTrigger Style Exports

Exported from `src/components/form-control/DropdownTrigger.styles.ts`:

```ts
const triggerBaseClass: string;
const triggerDisabledClass: string;
const triggerInsetClass: string;
const triggerSizeClasses: Record<ComponentSize, string>;
const chevronWrapperClass: string;
function getTriggerClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  class?: string;
}): string;
```
