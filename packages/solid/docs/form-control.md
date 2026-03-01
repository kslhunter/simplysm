# Form Control

Form input components for user data entry and selection. All field components support `required`, `validate`, `disabled`, `inset`, `size`, and `touchMode` unless noted otherwise.

---

## `Button`

Interactive button with semantic themes and variants.

```tsx
import { Button } from "@simplysm/solid";

<Button theme="primary" variant="solid" size="md">Click me</Button>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme |
| `variant` | `"solid" \| "outline" \| "ghost"` | Visual style |
| `size` | `ComponentSize` | Size |
| `inset` | `boolean` | Borderless inset style |

Extends `JSX.ButtonHTMLAttributes<HTMLButtonElement>`.

---

## `Select`

Dropdown select supporting single and multiple selection, hierarchical items, and search. Two usage modes: `items` prop mode and `children` mode.

```tsx
import { Select } from "@simplysm/solid";

// items prop mode
<Select items={[1, 2, 3]} value={val} onValueChange={setVal}>
  <Select.ItemTemplate>{(item) => <span>{item}</span>}</Select.ItemTemplate>
</Select>

// children mode
<Select value={val} onValueChange={setVal}>
  <Select.Item value={1}>Option 1</Select.Item>
  <Select.Item value={2}>Option 2</Select.Item>
</Select>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue \| TValue[]` | Selected value(s) |
| `onValueChange` | `(value) => void` | Value change callback |
| `multiple` | `boolean` | Multiple selection mode |
| `items` | `TValue[]` | Item list (items prop mode) |
| `getChildren` | `(item) => TValue[] \| undefined` | Hierarchical children |
| `getSearchText` | `(item) => string` | Search text extractor |
| `getIsHidden` | `(item) => boolean` | Item visibility |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Size |
| `inset` | `boolean` | Borderless inset style |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |

Sub-components: `Select.Item`, `Select.Action`, `Select.Header`, `Select.ItemTemplate`

---

## `Combobox`

Combo box with async search, debounce, and optional free-text input.

```tsx
import { Combobox } from "@simplysm/solid";

<Combobox
  value={val}
  onValueChange={setVal}
  search={async (text) => fetchResults(text)}
>
  <Combobox.ItemTemplate>{(item) => <span>{item.label}</span>}</Combobox.ItemTemplate>
</Combobox>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue` | Selected value |
| `onValueChange` | `(value) => void` | Value change callback |
| `search` | `(text: string) => Promise<TValue[]>` | Async search function |
| `allowCustomValue` | `boolean` | Allow free-text values |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disabled state |
| `size` | `FieldSize` | Size |
| `inset` | `boolean` | Borderless inset style |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |

Sub-components: `Combobox.Item`, `Combobox.ItemTemplate`

---

## `TextInput`

Text input field supporting text, password, and email types, with format transformation.

```tsx
import { TextInput } from "@simplysm/solid";

<TextInput value={val} onValueChange={setVal} placeholder="Enter text" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| undefined` | Current value |
| `onValueChange` | `(value: string) => void` | Value change callback |
| `type` | `"text" \| "password" \| "email"` | Input type |
| `format` | `(value: string) => string` | Value formatter |
| `required` | `boolean` | Required validation |
| `minLength` | `number` | Minimum length |
| `maxLength` | `number` | Maximum length |
| `pattern` | `string` | Regex pattern |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |
| `inset` | `boolean` | Borderless inset style |
| `size` | `FieldSize` | Size |

Sub-components: `TextInput.Prefix`

---

## `NumberInput`

Number input with comma formatting and min/max constraints.

```tsx
import { NumberInput } from "@simplysm/solid";

<NumberInput value={val} onValueChange={setVal} comma min={0} max={100} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number \| undefined` | Current value |
| `onValueChange` | `(value: number \| undefined) => void` | Value change callback |
| `comma` | `boolean` | Thousand-separator formatting |
| `minDigits` | `number` | Minimum decimal digits |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |
| `inset` | `boolean` | Borderless inset style |
| `size` | `FieldSize` | Size |

Sub-components: `NumberInput.Prefix`

---

## `DatePicker`

Date picker with configurable granularity (year/month/date), min/max constraints.

```tsx
import { DatePicker } from "@simplysm/solid";

<DatePicker value={date} onValueChange={setDate} unit="date" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `DateOnly \| undefined` | Current date |
| `onValueChange` | `(value) => void` | Value change callback |
| `unit` | `"year" \| "month" \| "date"` | Granularity |
| `min` | `DateOnly` | Minimum date |
| `max` | `DateOnly` | Maximum date |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |
| `inset` | `boolean` | Borderless inset style |
| `size` | `FieldSize` | Size |

---

## `DateTimePicker`

Date-time picker with configurable granularity (minute/second).

```tsx
import { DateTimePicker } from "@simplysm/solid";

<DateTimePicker value={dt} onValueChange={setDt} unit="minute" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `DateTime \| undefined` | Current date-time |
| `onValueChange` | `(value) => void` | Value change callback |
| `unit` | `"minute" \| "second"` | Granularity |
| `min` | `DateTime` | Minimum date-time |
| `max` | `DateTime` | Maximum date-time |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |
| `inset` | `boolean` | Borderless inset style |
| `size` | `FieldSize` | Size |

---

## `TimePicker`

Time picker with configurable granularity (minute/second).

```tsx
import { TimePicker } from "@simplysm/solid";

<TimePicker value={time} onValueChange={setTime} unit="minute" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `Time \| undefined` | Current time |
| `onValueChange` | `(value) => void` | Value change callback |
| `unit` | `"minute" \| "second"` | Granularity |
| `min` | `Time` | Minimum time |
| `max` | `Time` | Maximum time |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |
| `inset` | `boolean` | Borderless inset style |
| `size` | `FieldSize` | Size |

---

## `Textarea`

Multi-line text input with auto-grow (configurable minimum rows).

```tsx
import { Textarea } from "@simplysm/solid";

<Textarea value={val} onValueChange={setVal} minRows={3} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| undefined` | Current value |
| `onValueChange` | `(value: string) => void` | Value change callback |
| `minRows` | `number` | Minimum visible rows |
| `required` | `boolean` | Required validation |
| `minLength` | `number` | Minimum length |
| `maxLength` | `number` | Maximum length |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |
| `inset` | `boolean` | Borderless inset style |
| `size` | `FieldSize` | Size |

---

## `Checkbox`

Boolean checkbox input.

```tsx
import { Checkbox } from "@simplysm/solid";

<Checkbox value={checked} onValueChange={setChecked} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `boolean \| undefined` | Checked state |
| `onValueChange` | `(value: boolean) => void` | Value change callback |
| `disabled` | `boolean` | Disabled state |
| `size` | `CheckboxSize` | Size |
| `inset` | `boolean` | Borderless inset style |
| `inline` | `boolean` | Inline display |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |

---

## `Radio`

Boolean radio input. Clicking only sets to true; cannot unset.

```tsx
import { Radio } from "@simplysm/solid";

<Radio value={selected} onValueChange={setSelected} />
```

Props are the same as `Checkbox`.

---

## `CheckboxGroup`

Group of checkboxes for multi-value selection.

```tsx
import { CheckboxGroup } from "@simplysm/solid";

<CheckboxGroup value={vals} onValueChange={setVals}>
  <CheckboxGroup.Item value="a">Option A</CheckboxGroup.Item>
  <CheckboxGroup.Item value="b">Option B</CheckboxGroup.Item>
</CheckboxGroup>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue[]` | Selected values |
| `onValueChange` | `(value: TValue[]) => void` | Value change callback |
| `disabled` | `boolean` | Disabled state |
| `size` | `CheckboxSize` | Size |
| `inline` | `boolean` | Inline display |
| `inset` | `boolean` | Borderless inset style |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |

Sub-components: `CheckboxGroup.Item`

---

## `RadioGroup`

Group of radio buttons for single-value selection.

```tsx
import { RadioGroup } from "@simplysm/solid";

<RadioGroup value={val} onValueChange={setVal}>
  <RadioGroup.Item value="a">Option A</RadioGroup.Item>
  <RadioGroup.Item value="b">Option B</RadioGroup.Item>
</RadioGroup>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue \| undefined` | Selected value |
| `onValueChange` | `(value: TValue \| undefined) => void` | Value change callback |
| `disabled` | `boolean` | Disabled state |
| `size` | `CheckboxSize` | Size |
| `inline` | `boolean` | Inline display |
| `inset` | `boolean` | Borderless inset style |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |

Sub-components: `RadioGroup.Item`

---

## `ColorPicker`

Color picker returning `#RRGGBB` hex strings.

```tsx
import { ColorPicker } from "@simplysm/solid";

<ColorPicker value={color} onValueChange={setColor} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| undefined` | Current color (`#RRGGBB`) |
| `onValueChange` | `(value: string \| undefined) => void` | Value change callback |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Size |
| `inset` | `boolean` | Borderless inset style |
| `required` | `boolean` | Required validation |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `touchMode` | `boolean` | Show error only after blur |

---

## `DateRangePicker`

Date range picker with period type (day/month/range).

```tsx
import { DateRangePicker } from "@simplysm/solid";

<DateRangePicker
  periodType={periodType}
  onPeriodTypeChange={setPeriodType}
  from={from}
  onFromChange={setFrom}
  to={to}
  onToChange={setTo}
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `periodType` | `DateRangePeriodType` | Period type (`"day" \| "month" \| "range"`) |
| `onPeriodTypeChange` | `(type) => void` | Period type change callback |
| `from` | `DateOnly \| undefined` | Start date |
| `onFromChange` | `(value) => void` | Start date change callback |
| `to` | `DateOnly \| undefined` | End date |
| `onToChange` | `(value) => void` | End date change callback |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Size |

---

## `RichTextEditor`

Rich text editor powered by Tiptap. Outputs HTML.

```tsx
import { RichTextEditor } from "@simplysm/solid";

<RichTextEditor value={html} onValueChange={setHtml} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| undefined` | HTML content |
| `onValueChange` | `(value: string) => void` | Value change callback |
| `disabled` | `boolean` | Disabled state |
| `size` | `FieldSize` | Size |

---

## `Numpad`

On-screen numeric keypad for touch-friendly number input.

```tsx
import { Numpad } from "@simplysm/solid";

<Numpad value={val} onValueChange={setVal} useEnterButton onEnterButtonClick={handleEnter} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number \| undefined` | Current value |
| `onValueChange` | `(value: number \| undefined) => void` | Value change callback |
| `placeholder` | `string` | Placeholder text |
| `required` | `boolean` | Required validation |
| `inputDisabled` | `boolean` | Disables direct input |
| `useEnterButton` | `boolean` | Shows confirm button |
| `useMinusButton` | `boolean` | Shows minus/sign button |
| `onEnterButtonClick` | `() => void` | Confirm button callback |
| `size` | `ComponentSize` | Size |

---

## `StatePreset`

Named state snapshot save/restore control backed by `SyncConfig`.

```tsx
import { StatePreset } from "@simplysm/solid";

<StatePreset presetKey="my-filter" value={filter} onValueChange={setFilter} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `presetKey` | `string` | Unique storage key |
| `value` | `TValue` | Current value to snapshot |
| `onValueChange` | `(value: TValue) => void` | Restore callback |
| `size` | `ComponentSize` | Size |
| `class` | `string` | Custom class |
| `style` | `JSX.CSSProperties` | Custom style |

---

## `ThemeToggle`

Button that cycles between light, system, and dark theme modes.

```tsx
import { ThemeToggle } from "@simplysm/solid";

<ThemeToggle size="sm" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `size` | `"sm" \| "lg"` | Button size |

Extends `JSX.ButtonHTMLAttributes<HTMLButtonElement>`.

---

## `Invalid`

Validation wrapper that displays error indicators and injects a hidden input for native form validation.

```tsx
import { Invalid } from "@simplysm/solid";

<Invalid message={errorMsg} variant="border" touchMode>
  <SomeInput />
</Invalid>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `message` | `string \| undefined` | Error message |
| `variant` | `"border" \| "dot"` | Error indicator style |
| `touchMode` | `boolean` | Show error only after blur |

---

## Field Styles (`Field.styles`)

Style utilities for building custom field components.

```tsx
import {
  FieldSize,
  fieldBaseClass,
  fieldSizeClasses,
  fieldInsetClass,
  fieldInsetHeightClass,
  fieldInsetSizeHeightClasses,
  fieldDisabledClass,
  textAreaBaseClass,
  textAreaSizeClasses,
  fieldInputClass,
  fieldGapClasses,
  getFieldWrapperClass,
  getTextareaWrapperClass,
} from "@simplysm/solid";
```

`FieldSize` is an alias for `ComponentSize`.

---

## Checkbox Styles (`Checkbox.styles`)

Style utilities for building custom checkbox/radio components.

```tsx
import {
  CheckboxSize,
  checkboxBaseClass,
  indicatorBaseClass,
  checkedClass,
  checkboxSizeClasses,
  checkboxInsetClass,
  checkboxInsetSizeHeightClasses,
  checkboxInlineClass,
  checkboxDisabledClass,
} from "@simplysm/solid";
```
