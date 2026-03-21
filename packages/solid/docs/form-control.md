# Form Control

Source: `src/components/form-control/**`

## `Button`

Styled button component with theme, variant, and size support. Includes ripple effect.

```typescript
export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: ButtonTheme;
  variant?: ButtonVariant;
  size?: ButtonSize;
  inset?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme. Default: `"base"` |
| `variant` | `"solid" \| "outline" \| "ghost"` | Visual variant. Default: `"outline"` |
| `size` | `ComponentSize` | Button size. Default: `"md"` |
| `inset` | `boolean` | Removes border and border-radius for embedded usage |

---

## `Select`

Dropdown select component supporting single and multiple selection, search filtering, hierarchical items, and custom rendering via slots.

```typescript
export type SelectProps<TValue = unknown> =
  | (SelectSingleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectSingleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>);
```

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue \| TValue[]` | Currently selected value(s) |
| `onValueChange` | `(value) => void` | Value change callback |
| `multiple` | `boolean` | Enable multiple selection mode |
| `disabled` | `boolean` | Disabled state |
| `required` | `boolean` | Required input |
| `placeholder` | `string` | Placeholder text |
| `size` | `ComponentSize` | Trigger size. Default: `"md"` |
| `inset` | `boolean` | Borderless style |
| `validate` | `(value) => string \| undefined` | Custom validation function |
| `lazyValidation` | `boolean` | Show error only after blur |
| `itemSearchText` | `(item: TValue) => string` | Search text extraction (shows search input when set) |
| `isItemHidden` | `(item: TValue) => boolean` | Determine if item is hidden |
| `items` | `TValue[]` | Items array (items mode) |
| `itemChildren` | `(item, index, depth) => TValue[] \| undefined` | Child items for tree structure |
| `renderValue` | `(value: TValue) => JSX.Element` | Custom value renderer (required in children mode) |
| `tagDirection` | `"horizontal" \| "vertical"` | Multiple selection tag direction |
| `hideSelectAll` | `boolean` | Hide select all button (multiple mode) |

### Sub-components

- **`Select.Item`** -- Selectable item in dropdown. Props: `value: TValue`, `disabled?: boolean`
- **`Select.Item.Children`** -- Nested children slot for hierarchical items
- **`Select.Header`** -- Custom header slot in dropdown
- **`Select.Action`** -- Action button appended to trigger
- **`Select.ItemTemplate`** -- Template function for items mode rendering

### `SelectContextValue`

```typescript
export interface SelectContextValue<TValue = unknown> {
  multiple: Accessor<boolean>;
  isSelected: (value: TValue) => boolean;
  toggleValue: (value: TValue) => void;
  closeDropdown: () => void;
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
  size: Accessor<ComponentSize>;
}
```

### `SelectItemProps`

```typescript
export interface SelectItemProps<TValue = unknown> {
  value: TValue;
  disabled?: boolean;
}
```

---

## `Combobox`

Autocomplete component supporting async search, custom value parsing, and item selection.

```typescript
export type ComboboxProps<TValue = unknown> =
  | ComboboxCustomParserProps<TValue>
  | ComboboxCustomStringProps
  | ComboboxDefaultProps<TValue>;
```

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue` | Currently selected value |
| `onValueChange` | `(value: TValue) => void` | Value change callback |
| `loadItems` | `(query: string) => TValue[] \| Promise<TValue[]>` | Item load function (required) |
| `debounceMs` | `number` | Debounce delay. Default: `300` |
| `renderValue` | `(value: TValue) => JSX.Element` | Render selected value (required) |
| `disabled` | `boolean` | Disabled state |
| `required` | `boolean` | Required input |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `lazyValidation` | `boolean` | Show error only after blur |
| `placeholder` | `string` | Placeholder text |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless style |
| `allowsCustomValue` | `boolean` | Allow custom text value |
| `parseCustomValue` | `(text: string) => TValue` | Parse custom text to TValue |

### Sub-components

- **`Combobox.Item`** -- Selectable item in dropdown. Props: `value: TValue`, `disabled?: boolean`
- **`Combobox.ItemTemplate`** -- Template function for item rendering

### `ComboboxContextValue`

```typescript
export interface ComboboxContextValue<TValue = unknown> {
  isSelected: (value: TValue) => boolean;
  selectValue: (value: TValue) => void;
  closeDropdown: () => void;
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}
```

### `ComboboxItemProps`

```typescript
export interface ComboboxItemProps<TValue = unknown> {
  value: TValue;
  disabled?: boolean;
}
```

---

## `TextInput`

Text input field with format masking, prefix slot, and IME composition handling.

```typescript
export interface TextInputProps {
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

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Input value |
| `onValueChange` | `(value: string) => void` | Value change callback |
| `type` | `"text" \| "password" \| "email"` | Input type. Default: `"text"` |
| `format` | `string` | Input format mask (e.g., `"XXX-XXXX-XXXX"`) |
| `required` | `boolean` | Required input |
| `minLength` / `maxLength` | `number` | Length constraints |
| `pattern` | `string \| RegExp` | Input validation pattern |

### Sub-components

- **`TextInput.Prefix`** -- Prefix slot (e.g., icon or currency symbol)

### Standalone Export

- **`TextInputPrefix`** -- The slot component, also accessible via `TextInput.Prefix`

---

## `NumberInput`

Numeric input field with thousand separator, decimal formatting, and prefix slot.

```typescript
export interface NumberInputProps {
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

| Prop | Type | Description |
|------|------|-------------|
| `useGrouping` | `boolean` | Show thousand separator. Default: `true` |
| `minimumFractionDigits` | `number` | Minimum decimal places |
| `min` / `max` | `number` | Value range constraints |

### Sub-components

- **`NumberInput.Prefix`** -- Prefix slot

### Standalone Export

- **`NumberInputPrefix`** -- The slot component

---

## `DatePicker`

Date input field supporting year, month, and date units with `DateOnly` type.

```typescript
export interface DatePickerProps {
  value?: DateOnly;
  onValueChange?: (value: DateOnly | undefined) => void;
  unit?: "year" | "month" | "date";
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

| Prop | Type | Description |
|------|------|-------------|
| `unit` | `"year" \| "month" \| "date"` | Date unit. Default: `"date"` |
| `min` / `max` | `DateOnly` | Date range constraints |

---

## `DateTimePicker`

DateTime input field supporting minute and second units with `DateTime` type.

```typescript
export interface DateTimePickerProps {
  value?: DateTime;
  onValueChange?: (value: DateTime | undefined) => void;
  unit?: "minute" | "second";
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

| Prop | Type | Description |
|------|------|-------------|
| `unit` | `"minute" \| "second"` | DateTime unit. Default: `"minute"` |

---

## `TimePicker`

Time input field supporting minute and second units with `Time` type.

```typescript
export interface TimePickerProps {
  value?: Time;
  onValueChange?: (value: Time | undefined) => void;
  unit?: "minute" | "second";
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

---

## `Textarea`

Auto-resizing textarea with IME composition handling.

```typescript
export interface TextareaProps {
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

| Prop | Type | Description |
|------|------|-------------|
| `minRows` | `number` | Minimum visible rows. Default: `1` |

---

## `Checkbox`

Checkbox toggle component with square indicator and check icon.

```typescript
export interface CheckboxProps {
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

---

## `Radio`

Radio button component with circular indicator. Always selects to `true` (cannot deselect).

```typescript
export interface RadioProps {
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

---

## `CheckboxGroup`

Group component for multi-value checkbox selection.

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue[]` | Selected values |
| `onValueChange` | `(value: TValue[]) => void` | Change callback |
| `disabled` | `boolean` | Disable all items |
| `size` | `CheckboxSize` | Size for all items |
| `inline` | `boolean` | Inline display |
| `inset` | `boolean` | Inset style |
| `required` | `boolean` | Required (at least one selected) |
| `validate` | `(value: TValue[]) => string \| undefined` | Custom validation |
| `lazyValidation` | `boolean` | Lazy validation |

### Sub-components

- **`CheckboxGroup.Item`** -- Individual item. Props: `value: TValue`, `disabled?: boolean`, `children?: JSX.Element`

---

## `RadioGroup`

Group component for single-value radio selection.

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue` | Selected value |
| `onValueChange` | `(value: TValue) => void` | Change callback |
| `disabled` | `boolean` | Disable all items |
| `size` | `CheckboxSize` | Size for all items |
| `inline` | `boolean` | Inline display |
| `inset` | `boolean` | Inset style |
| `required` | `boolean` | Required |
| `validate` | `(value: TValue \| undefined) => string \| undefined` | Custom validation |
| `lazyValidation` | `boolean` | Lazy validation |

### Sub-components

- **`RadioGroup.Item`** -- Individual item. Props: `value: TValue`, `disabled?: boolean`, `children?: JSX.Element`

---

## `ColorPicker`

Color picker input using native `<input type="color">`.

```typescript
export interface ColorPickerProps {
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

---

## `DateRangePicker`

Date range picker with period type selector (day/month/range). Automatically adjusts from/to when period type changes.

```typescript
export interface DateRangePickerProps {
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

### `DateRangePeriodType`

```typescript
export type DateRangePeriodType = "day" | "month" | "range";
```

---

## `RichTextEditor`

WYSIWYG rich text editor powered by TipTap with toolbar. Supports text alignment, color, highlight, tables, and images.

```typescript
export interface RichTextEditorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

---

## `Numpad`

On-screen numpad with digit buttons, clear, backspace, and optional enter/minus buttons.

```typescript
export interface NumpadProps {
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

---

## `StatePreset`

Save/restore named state presets to sync storage. Displays preset chips with restore, overwrite, and delete actions.

```typescript
export interface StatePresetProps<TValue> {
  storageKey: string;
  value: TValue;
  onValueChange: (value: TValue) => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

---

## `ThemeToggle`

Theme toggle button cycling through light, system, dark modes. Must be used inside `ThemeProvider`.

```typescript
export interface ThemeToggleProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  size?: ComponentSize;
}
```

---

## `Invalid`

Validation wrapper that displays error indicators (border highlight or dot) on child elements. Integrates with native form validation via hidden input.

```typescript
export interface InvalidProps {
  message?: string;
  variant?: "border" | "dot";
  lazyValidation?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `message` | `string` | Validation error message. Non-empty means invalid |
| `variant` | `"border" \| "dot"` | Visual indicator style. Default: `"dot"` |
| `lazyValidation` | `boolean` | Show error only after the target loses focus |

---

## Style Exports

### `Field.styles`

Shared style constants and utility functions for form field components.

| Export | Type | Description |
|--------|------|-------------|
| `fieldSurface` | `string` | Common field surface class |
| `fieldBaseClass` | `string` | Base wrapper class |
| `fieldSizeClasses` | `Record<ComponentSize, string>` | Size-specific classes |
| `fieldInsetClass` | `string` | Inset mode styles |
| `fieldInsetSizeHeightClasses` | `Record<ComponentSize, string>` | Inset height classes |
| `fieldDisabledClass` | `string` | Disabled styles |
| `textAreaBaseClass` | `string` | Textarea base class |
| `textAreaSizeClasses` | `Record<ComponentSize, string>` | Textarea size classes |
| `fieldInputClass` | `string` | Inner input element class |
| `fieldGapClasses` | `Record<ComponentSize, string>` | Gap classes for prefix icons |
| `getFieldWrapperClass` | `(options) => string` | Generate wrapper class |
| `getTextareaWrapperClass` | `(options) => string` | Generate textarea wrapper class |

### `Checkbox.styles`

| Export | Type | Description |
|--------|------|-------------|
| `CheckboxSize` | `ComponentSize` | Size type alias |
| `checkboxBaseClass` | `string` | Wrapper base class |
| `indicatorBaseClass` | `string` | Indicator base class |
| `checkedClass` | `string` | Checked state class |
| `checkboxSizeClasses` | `Record<CheckboxSize, string>` | Size classes |
| `checkboxInsetClass` | `string` | Inset class |
| `checkboxInsetSizeHeightClasses` | `Record<CheckboxSize, string>` | Inset height classes |
| `checkboxInlineClass` | `string` | Inline class |
| `checkboxDisabledClass` | `string` | Disabled class |
