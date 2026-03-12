# Form Controls

## Button

```typescript
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: "base" | "primary" | "info" | "success" | "warning" | "danger";
  variant?: "solid" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
}
```

Standard button with semantic themes and visual variants.

---

## TextInput

```typescript
interface TextInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  type?: "text" | "password" | "email";
  placeholder?: string;
  title?: string;
  autocomplete?: JSX.HTMLAutocomplete;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
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

Single-line text input with format masking and validation. Use `format` for input masks (e.g. `"XXX-XXXX-XXXX"`).

**Sub-component:** `TextInput.Prefix` -- renders content before the input.

---

## NumberInput

```typescript
interface NumberInputProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  useGrouping?: boolean;
  minimumFractionDigits?: number;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  validate?: (value: number | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

Numeric input with locale-aware formatting. `useGrouping` enables thousands separators (default: `true`).

**Sub-component:** `NumberInput.Prefix` -- renders content before the input.

---

## DatePicker

```typescript
interface DatePickerProps {
  value?: DateOnly;
  onValueChange?: (value: DateOnly | undefined) => void;
  unit?: "year" | "month" | "date";
  min?: DateOnly;
  max?: DateOnly;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
  required?: boolean;
  validate?: (value: DateOnly | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

Date picker with calendar dropdown. `unit` controls the selection granularity (default: `"date"`).

---

## DateTimePicker

```typescript
interface DateTimePickerProps {
  value?: DateTime;
  onValueChange?: (value: DateTime | undefined) => void;
  unit?: "minute" | "second";
  min?: DateTime;
  max?: DateTime;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
  required?: boolean;
  validate?: (value: DateTime | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

Combined date and time picker. `unit` controls time precision (default: `"minute"`).

---

## TimePicker

```typescript
interface TimePickerProps {
  value?: Time;
  onValueChange?: (value: Time | undefined) => void;
  unit?: "minute" | "second";
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
  min?: Time;
  max?: Time;
  required?: boolean;
  validate?: (value: Time | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

Time-only picker. `unit` controls precision (default: `"minute"`).

---

## Textarea

```typescript
interface TextareaProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
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

Auto-resizing multi-line text input. `minRows` sets the minimum height (default: `1`).

---

## Select

```typescript
// Single select
interface SelectSingleProps<TValue> {
  multiple?: false;
  value?: TValue;
  onValueChange?: (value: TValue | undefined) => void;
}

// Multiple select
interface SelectMultipleProps<TValue> {
  multiple: true;
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  tagDirection?: "horizontal" | "vertical";
  hideSelectAll?: boolean;
}

// Common props
interface SelectCommonProps<TValue> {
  items?: TValue[];
  itemChildren?: (item: TValue, index: number, depth: number) => TValue[] | undefined;
  renderValue?: (value: TValue) => JSX.Element;
  itemSearchText?: (item: TValue) => string;
  isItemHidden?: (item: TValue) => boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
  validate?: (value: unknown) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

Dropdown select with single or multiple selection modes. Supports two usage patterns:

1. **Items mode:** pass `items` array for automatic rendering.
2. **Children mode:** use `Select.Item` sub-components for declarative composition.

Providing `itemSearchText` enables a built-in search input. `itemChildren` enables tree-structured items.

**Sub-components:**
- `Select.Item` -- selectable option (`{ value: TValue; disabled?: boolean }`)
- `Select.Header` -- non-selectable header row
- `Select.Action` -- non-selectable action row
- `Select.ItemTemplate` -- custom item renderer

---

## Combobox

```typescript
interface ComboboxProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  loadItems: (query: string) => TValue[] | Promise<TValue[]>;
  renderValue: (value: TValue) => JSX.Element;
  debounceMs?: number;
  allowsCustomValue?: boolean;
  parseCustomValue?: (text: string) => TValue;
  disabled?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  lazyValidation?: boolean;
  placeholder?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

Autocomplete input with async item loading. `loadItems` is called with the current query string. `debounceMs` controls the debounce delay (default: `300`). Set `allowsCustomValue` to accept free-form input not in the results list.

**Sub-components:** `Combobox.Item`, `Combobox.ItemTemplate`

---

## Checkbox

```typescript
interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
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

Standard checkbox with label support via `children`.

---

## Radio

```typescript
interface RadioProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
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

Standalone radio button. For grouped radio buttons, use `RadioGroup`.

---

## CheckboxGroup

```typescript
interface CheckboxGroupProps<TValue> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
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

Group of checkboxes with multi-value binding.

**Sub-component:** `CheckboxGroup.Item` -- `{ value: TValue; disabled?: boolean; children?: JSX.Element }`

---

## RadioGroup

```typescript
interface RadioGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
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

Group of radio buttons with single-value binding.

**Sub-component:** `RadioGroup.Item` -- `{ value: TValue; disabled?: boolean; children?: JSX.Element }`

---

## ColorPicker

```typescript
interface ColorPickerProps {
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  title?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
  required?: boolean;
  validate?: (value: string | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

Color picker with hex `#RRGGBB` value format.

---

## DateRangePicker

```typescript
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
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  class?: string;
  style?: JSX.CSSProperties;
}
```

Date range picker with day, month, and custom range modes. Each value (`periodType`, `from`, `to`) is independently controllable.

---

## RichTextEditor

```typescript
interface RichTextEditorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  class?: string;
  style?: JSX.CSSProperties;
}
```

Rich text editor backed by Tiptap. `value` is an HTML string.

---

## Numpad

```typescript
interface NumpadProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  placeholder?: string;
  required?: boolean;
  inputDisabled?: boolean;
  withEnterButton?: boolean;
  withMinusButton?: boolean;
  onEnterButtonClick?: () => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  class?: string;
  style?: JSX.CSSProperties;
}
```

On-screen number pad with optional enter and minus buttons.

---

## StatePreset

```typescript
interface StatePresetProps<TValue> {
  storageKey: string;
  value: TValue;
  onValueChange: (value: TValue) => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  class?: string;
  style?: JSX.CSSProperties;
}
```

Save and restore named presets of component state to sync storage. `storageKey` uniquely identifies the state entry.

---

## ThemeToggle

```typescript
interface ThemeToggleProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}
```

Button that cycles through light, system, and dark theme modes.

---

## Invalid

```typescript
interface InvalidProps {
  message?: string;
  variant?: "border" | "dot";
  lazyValidation?: boolean;
}
```

Validation error indicator. When `message` is non-empty, the component renders in an invalid state. Used internally by form controls and can be composed for custom validation displays.

---

## Usage Examples

```typescript
import { TextInput, Select, Checkbox, DatePicker } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [name, setName] = createSignal("");
const [color, setColor] = createSignal<string>();
const [agreed, setAgreed] = createSignal(false);
const [date, setDate] = createSignal<DateOnly>();

<TextInput value={name()} onValueChange={setName} placeholder="Name" required />

<Select
  items={["Red", "Green", "Blue"]}
  value={color()}
  onValueChange={setColor}
  placeholder="Pick a color"
/>

<Checkbox checked={agreed()} onCheckedChange={setAgreed}>
  I agree to the terms
</Checkbox>

<DatePicker value={date()} onValueChange={setDate} unit="date" />
```
