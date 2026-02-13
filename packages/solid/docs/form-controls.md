# Form Controls

## Button

Interactive button component with built-in Material Design ripple effect.

```tsx
import { Button } from "@simplysm/solid";

<Button theme="primary" variant="solid">Confirm</Button>
<Button theme="danger" variant="outline" size="sm">Delete</Button>
<Button variant="ghost">Cancel</Button>
<Button disabled>Disabled</Button>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | Color theme |
| `variant` | `"solid" \| "outline" \| "ghost"` | `"outline"` | Style variant |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style (removes border/rounded corners) |
| `disabled` | `boolean` | - | Disabled state |

All standard HTML `<button>` element attributes can also be passed.

---

## TextInput

Text input field with format mask and IME (Korean, etc.) composition support.

```tsx
import { TextInput } from "@simplysm/solid";

// Basic usage
<TextInput value={name()} onValueChange={setName} placeholder="Enter name" />

// Password
<TextInput type="password" />

// Format mask (e.g., phone number)
<TextInput format="XXX-XXXX-XXXX" value={phone()} onValueChange={setPhone} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `""` | Input value |
| `onValueChange` | `(value: string) => void` | - | Value change callback |
| `type` | `"text" \| "password" \| "email"` | `"text"` | Input type |
| `format` | `string` | - | Input format (`X` represents character position, rest are separators) |
| `placeholder` | `string` | - | Placeholder |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `error` | `boolean` | - | Error state (red border) |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style |

---

## NumberInput

Number input field with thousand separators and minimum decimal places support.

```tsx
import { NumberInput } from "@simplysm/solid";

// Basic usage (thousand separators auto-applied)
<NumberInput value={amount()} onValueChange={setAmount} />

// Without thousand separators
<NumberInput value={num()} comma={false} />

// Minimum 2 decimal places
<NumberInput value={price()} minDigits={2} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Input value |
| `onValueChange` | `(value: number \| undefined) => void` | - | Value change callback |
| `comma` | `boolean` | `true` | Show thousand separators |
| `minDigits` | `number` | - | Minimum decimal places |
| `placeholder` | `string` | - | Placeholder |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `error` | `boolean` | - | Error state |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style |

---

## DatePicker

Date input field supporting year, month, and date units. Values are handled using the `DateOnly` type.

```tsx
import { DatePicker } from "@simplysm/solid";
import { DateOnly } from "@simplysm/core-common";

// Date input
<DatePicker unit="date" value={date()} onValueChange={setDate} />

// Year-month input
<DatePicker unit="month" value={monthDate()} onValueChange={setMonthDate} />

// Year-only input
<DatePicker unit="year" value={yearDate()} onValueChange={setYearDate} />

// min/max constraints
<DatePicker
  unit="date"
  value={date()}
  onValueChange={setDate}
  min={new DateOnly(2025, 1, 1)}
  max={new DateOnly(2025, 12, 31)}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `DateOnly` | - | Input value |
| `onValueChange` | `(value: DateOnly \| undefined) => void` | - | Value change callback |
| `unit` | `"year" \| "month" \| "date"` | `"date"` | Date unit |
| `min` | `DateOnly` | - | Minimum date |
| `max` | `DateOnly` | - | Maximum date |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `error` | `boolean` | - | Error state |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style |

> `DateTimePicker` and `TimePicker` follow the same pattern for datetime (`DateTime`) and time (`Time`) input.

---

## DateRangePicker

Component for inputting date ranges with period type selection (day/month/range). The from/to values are automatically adjusted when periodType changes.

```tsx
import { DateRangePicker, type DateRangePeriodType } from "@simplysm/solid";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";

const [periodType, setPeriodType] = createSignal<DateRangePeriodType>("range");
const [from, setFrom] = createSignal<DateOnly>();
const [to, setTo] = createSignal<DateOnly>();

<DateRangePicker
  periodType={periodType()}
  onPeriodTypeChange={setPeriodType}
  from={from()}
  onFromChange={setFrom}
  to={to()}
  onToChange={setTo}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `periodType` | `"day" \| "month" \| "range"` | `"range"` | Period type |
| `onPeriodTypeChange` | `(value: DateRangePeriodType) => void` | - | Period type change callback |
| `from` | `DateOnly` | - | Start date |
| `onFromChange` | `(value: DateOnly \| undefined) => void` | - | Start date change callback |
| `to` | `DateOnly` | - | End date |
| `onToChange` | `(value: DateOnly \| undefined) => void` | - | End date change callback |
| `disabled` | `boolean` | - | Disabled state |
| `size` | `"sm" \| "lg"` | - | Size |
| `periodLabels` | `Partial<Record<DateRangePeriodType, string>>` | `{ day: "Day", month: "Month", range: "Range" }` | Period type labels |

---

## Textarea

Multi-line text input field. Height adjusts automatically based on content, with IME composition support.

```tsx
import { Textarea } from "@simplysm/solid";

<Textarea value={text()} onValueChange={setText} />

// Minimum 3 rows height
<Textarea minRows={3} value={text()} onValueChange={setText} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `""` | Input value |
| `onValueChange` | `(value: string) => void` | - | Value change callback |
| `placeholder` | `string` | - | Placeholder |
| `minRows` | `number` | `1` | Minimum number of rows |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `error` | `boolean` | - | Error state |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style |

---

## Select

Dropdown selection component. Supports both items prop approach and children (Compound Components) approach. Single and multiple selection supported.

```tsx
import { Select } from "@simplysm/solid";

// items approach (simple array)
<Select
  items={["Apple", "Banana", "Strawberry"]}
  value={fruit()}
  onValueChange={setFruit}
  placeholder="Select fruit"
/>

// children approach (Compound Components)
<Select value={fruit()} onValueChange={setFruit} renderValue={(v) => v.name}>
  <Select.Item value={item1}>{item1.name}</Select.Item>
  <Select.Item value={item2}>{item2.name}</Select.Item>
</Select>

// items approach + ItemTemplate for custom rendering
<Select items={users} value={selectedUser()} onValueChange={setSelectedUser}>
  <Select.ItemTemplate>
    {(user) => <>{user.name} ({user.email})</>}
  </Select.ItemTemplate>
</Select>

// Multiple selection
<Select items={options} value={selected()} onValueChange={setSelected} multiple />

// Hierarchical items (children approach)
<Select value={item()} onValueChange={setItem} renderValue={(v) => v.name}>
  <Select.Item value={parent}>
    {parent.name}
    <Select.Item.Children>
      <Select.Item value={child1}>{child1.name}</Select.Item>
      <Select.Item value={child2}>{child2.name}</Select.Item>
    </Select.Item.Children>
  </Select.Item>
</Select>

// With action buttons and header
<Select value={item()} onValueChange={setItem} renderValue={(v) => v.name}>
  <Select.Header><div>Custom header</div></Select.Header>
  <Select.Action onClick={handleAdd}>+</Select.Action>
  <Select.Item value={item1}>{item1.name}</Select.Item>
</Select>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T \| T[]` | - | Selected value |
| `onValueChange` | `(value: T \| T[]) => void` | - | Value change callback |
| `items` | `T[]` | - | Items array (items approach) |
| `getChildren` | `(item: T, index: number, depth: number) => T[] \| undefined` | - | Tree structure children getter |
| `renderValue` | `(value: T) => JSX.Element` | - | Value rendering function (required for children approach) |
| `multiple` | `boolean` | `false` | Multiple selection |
| `multiDisplayDirection` | `"horizontal" \| "vertical"` | `"horizontal"` | Display direction for multiple selection |
| `hideSelectAll` | `boolean` | - | Hide select all button (multiple selection) |
| `placeholder` | `string` | - | Placeholder |
| `disabled` | `boolean` | - | Disabled state |
| `required` | `boolean` | - | Required field |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style |

**Sub-components:**
- `Select.Item` -- Selection item
- `Select.Item.Children` -- Nested child items container (for hierarchical selection)
- `Select.Action` -- Right-side action button
- `Select.Header` -- Dropdown top custom area
- `Select.ItemTemplate` -- Item rendering template for items approach

---

## Combobox

Autocomplete component with async search and item selection support. Debouncing is built-in.

```tsx
import { Combobox } from "@simplysm/solid";

<Combobox
  loadItems={async (query) => {
    const response = await fetch(`/api/search?q=${query}`);
    return response.json();
  }}
  renderValue={(item) => item.name}
  value={selected()}
  onValueChange={setSelected}
  placeholder="Search..."
>
  <Combobox.ItemTemplate>
    {(item) => <>{item.name}</>}
  </Combobox.ItemTemplate>
</Combobox>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T` | - | Selected value |
| `onValueChange` | `(value: T) => void` | - | Value change callback |
| `loadItems` | `(query: string) => Promise<T[]>` | **(required)** | Item loading function |
| `renderValue` | `(value: T) => JSX.Element` | **(required)** | Value rendering function |
| `debounceMs` | `number` | `300` | Debounce delay (ms) |
| `allowCustomValue` | `boolean` | - | Allow custom values |
| `parseCustomValue` | `(text: string) => T` | - | Custom value parsing function |
| `placeholder` | `string` | - | Placeholder |
| `disabled` | `boolean` | - | Disabled state |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style |

**Sub-components:**
- `Combobox.Item` -- Selection item
- `Combobox.ItemTemplate` -- Item rendering template

---

## Checkbox / Radio

Checkbox and radio button components.

```tsx
import { Checkbox, Radio } from "@simplysm/solid";

<Checkbox value={checked()} onValueChange={setChecked}>I agree</Checkbox>
<Checkbox theme="success" value={active()} onValueChange={setActive}>Activate</Checkbox>

<Radio value={option() === "a"} onValueChange={() => setOption("a")}>Option A</Radio>
<Radio value={option() === "b"} onValueChange={() => setOption("b")}>Option B</Radio>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `boolean` | `false` | Checked state |
| `onValueChange` | `(value: boolean) => void` | - | Value change callback |
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"primary"` | Color theme |
| `size` | `"sm" \| "lg"` | - | Size |
| `disabled` | `boolean` | - | Disabled state |
| `inset` | `boolean` | - | Inset style |
| `inline` | `boolean` | - | Inline style |

---

## CheckboxGroup / RadioGroup

Group components for managing multiple/single selection across items.

```tsx
import { CheckboxGroup, RadioGroup } from "@simplysm/solid";

// Multiple selection
<CheckboxGroup value={selectedColors()} onValueChange={setSelectedColors}>
  <CheckboxGroup.Item value="red">Red</CheckboxGroup.Item>
  <CheckboxGroup.Item value="green">Green</CheckboxGroup.Item>
  <CheckboxGroup.Item value="blue">Blue</CheckboxGroup.Item>
</CheckboxGroup>

// Single selection
<RadioGroup value={size()} onValueChange={setSize}>
  <RadioGroup.Item value="sm">Small</RadioGroup.Item>
  <RadioGroup.Item value="md">Medium</RadioGroup.Item>
  <RadioGroup.Item value="lg">Large</RadioGroup.Item>
</RadioGroup>
```

**CheckboxGroup Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T[]` | `[]` | Selected values array |
| `onValueChange` | `(value: T[]) => void` | - | Value change callback |
| `theme` | `SemanticTheme` | `"primary"` | Color theme |
| `size` | `"sm" \| "lg"` | - | Size |
| `disabled` | `boolean` | - | Disable all items |
| `inline` | `boolean` | - | Inline style |
| `inset` | `boolean` | - | Inset style |

**RadioGroup Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T` | - | Selected value |
| `onValueChange` | `(value: T) => void` | - | Value change callback |
| `theme` | `SemanticTheme` | `"primary"` | Color theme |
| `size` | `"sm" \| "lg"` | - | Size |
| `disabled` | `boolean` | - | Disable all items |
| `inline` | `boolean` | - | Inline style |
| `inset` | `boolean` | - | Inset style |

---

## ColorPicker

Color selection component.

```tsx
import { ColorPicker } from "@simplysm/solid";

<ColorPicker value={color()} onValueChange={setColor} />
<ColorPicker value={color()} size="sm" disabled />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `"#000000"` | Color value (#RRGGBB format) |
| `onValueChange` | `(value: string) => void` | - | Value change callback |
| `size` | `"sm" \| "lg"` | - | Size |
| `disabled` | `boolean` | - | Disabled state |

---

## ThemeToggle

Dark/light/system theme cycle toggle button. Must be used inside `InitializeProvider`.

```tsx
import { ThemeToggle } from "@simplysm/solid";

<ThemeToggle />
<ThemeToggle size="sm" />
<ThemeToggle size="lg" />
```

Clicking cycles through `light -> system -> dark -> light`, displaying an icon matching the current mode.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "lg"` | - | Button size |

---

## RichTextEditor

Tiptap-based rich text editor. Supports text formatting (bold, italic, strikethrough), alignment, colors, highlights, tables, and image insertion.

```tsx
import { RichTextEditor } from "@simplysm/solid";

<RichTextEditor value={html()} onValueChange={setHtml} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | HTML string value |
| `onValueChange` | `(value: string) => void` | - | Value change callback |
| `disabled` | `boolean` | - | Disabled state |
| `error` | `boolean` | - | Error state |
| `size` | `"sm" \| "lg"` | - | Size |

---

## Numpad

Numeric keypad component. Used in environments requiring touch-based number input.

```tsx
import { Numpad } from "@simplysm/solid";

<Numpad value={amount()} onValueChange={setAmount} />

// With ENT/minus buttons
<Numpad
  value={amount()}
  onValueChange={setAmount}
  useEnterButton
  useMinusButton
  onEnterButtonClick={handleSubmit}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Input value |
| `onValueChange` | `(value: number \| undefined) => void` | - | Value change callback |
| `placeholder` | `string` | - | Placeholder |
| `required` | `boolean` | - | Required field |
| `inputDisabled` | `boolean` | - | Disable direct text field input |
| `useEnterButton` | `boolean` | - | Show ENT button |
| `useMinusButton` | `boolean` | - | Show minus button |
| `onEnterButtonClick` | `() => void` | - | ENT click callback |
| `size` | `"sm" \| "lg"` | - | Size |

---

## StatePreset

Component for saving/loading screen state (search conditions, etc.) as presets. Persisted via `useSyncConfig` (defaults to localStorage, can be configured to sync externally).

```tsx
import { StatePreset } from "@simplysm/solid";

<StatePreset
  presetKey="user-search"
  value={searchState()}
  onValueChange={setSearchState}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `presetKey` | `string` | **(required)** | Preset storage key |
| `value` | `T` | **(required)** | Current state value |
| `onValueChange` | `(value: T) => void` | **(required)** | State restore callback |
| `size` | `"sm" \| "lg"` | - | Size |
