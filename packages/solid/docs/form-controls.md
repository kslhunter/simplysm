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
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style (removes border/rounded corners) |
| `disabled` | `boolean` | - | Disabled state |

All standard HTML `<button>` element attributes can also be passed.

---

## TextInput

Text input field with format mask and IME (Korean, etc.) composition support.

```tsx
import { TextInput } from "@simplysm/solid";
import { IconSearch } from "@tabler/icons-solidjs";
import { Icon } from "@simplysm/solid";

// Basic usage
<TextInput value={name()} onValueChange={setName} placeholder="Enter name" />

// Password
<TextInput type="password" />

// Format mask (e.g., phone number)
<TextInput format="XXX-XXXX-XXXX" value={phone()} onValueChange={setPhone} />

// With prefix
<TextInput value={query()} onValueChange={setQuery}>
  <TextInput.Prefix><Icon icon={IconSearch} /></TextInput.Prefix>
</TextInput>

// With validation
<TextInput required minLength={3} value={name()} onValueChange={setName} />
<TextInput
  validate={(v) => v.includes("@") ? undefined : "Invalid email format"}
  value={email()}
  onValueChange={setEmail}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `""` | Input value |
| `onValueChange` | `(value: string) => void` | - | Value change callback |
| `type` | `"text" \| "password" \| "email"` | `"text"` | Input type |
| `format` | `string` | - | Input format (`X` represents character position, rest are separators) |
| `placeholder` | `string` | - | Placeholder |
| `title` | `string` | - | Tooltip title |
| `autocomplete` | `JSX.HTMLAutocomplete` | - | HTML autocomplete attribute |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `minLength` | `number` | - | Minimum character length (error: "Please enter at least N characters") |
| `maxLength` | `number` | - | Maximum character length (error: "Maximum N characters allowed") |
| `pattern` | `string` | - | Regex pattern string (error: "Invalid input format") |
| `validate` | `(value: string) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

**Sub-components:**
- `TextInput.Prefix` -- Prefix element (icon, text, etc.) displayed before the input

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

// With prefix
<NumberInput value={price()} onValueChange={setPrice}>
  <NumberInput.Prefix>&#8361;</NumberInput.Prefix>
</NumberInput>

// With validation
<NumberInput required min={0} max={100} value={score()} onValueChange={setScore} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Input value |
| `onValueChange` | `(value: number \| undefined) => void` | - | Value change callback |
| `comma` | `boolean` | `true` | Show thousand separators |
| `minDigits` | `number` | - | Minimum decimal places |
| `placeholder` | `string` | - | Placeholder |
| `title` | `string` | - | Tooltip title |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `min` | `number` | - | Minimum value (error: "최솟값은 N입니다") |
| `max` | `number` | - | Maximum value (error: "최댓값은 N입니다") |
| `validate` | `(value: number \| undefined) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

**Sub-components:**
- `NumberInput.Prefix` -- Prefix element (currency symbol, icon, etc.) displayed before the input

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

// With validation
<DatePicker required value={date()} onValueChange={setDate} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `DateOnly` | - | Input value |
| `onValueChange` | `(value: DateOnly \| undefined) => void` | - | Value change callback |
| `unit` | `"year" \| "month" \| "date"` | `"date"` | Date unit |
| `min` | `DateOnly` | - | Minimum date (error: "{min}보다 크거나 같아야 합니다") |
| `max` | `DateOnly` | - | Maximum date (error: "{max}보다 작거나 같아야 합니다") |
| `title` | `string` | - | Tooltip title |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `validate` | `(value: DateOnly \| undefined) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

---

## DateTimePicker

Date-time input field supporting minute and second units. Values are handled using the `DateTime` type.

```tsx
import { DateTimePicker } from "@simplysm/solid";
import { DateTime } from "@simplysm/core-common";

// Date-time input (minute precision)
<DateTimePicker unit="minute" value={dateTime()} onValueChange={setDateTime} />

// Date-time input (second precision)
<DateTimePicker unit="second" value={dateTime()} onValueChange={setDateTime} />

// min/max constraints
<DateTimePicker
  unit="minute"
  value={dateTime()}
  onValueChange={setDateTime}
  min={new DateTime(2025, 1, 1, 0, 0, 0)}
  max={new DateTime(2025, 12, 31, 23, 59, 0)}
/>

// With validation
<DateTimePicker required value={dateTime()} onValueChange={setDateTime} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `DateTime` | - | Input value |
| `onValueChange` | `(value: DateTime \| undefined) => void` | - | Value change callback |
| `unit` | `"minute" \| "second"` | `"minute"` | Date-time unit |
| `min` | `DateTime` | - | Minimum date-time (error: "{min}보다 크거나 같아야 합니다") |
| `max` | `DateTime` | - | Maximum date-time (error: "{max}보다 작거나 같아야 합니다") |
| `title` | `string` | - | Tooltip title |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `validate` | `(value: DateTime \| undefined) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

---

## TimePicker

Time input field supporting minute and second units. Values are handled using the `Time` type.

```tsx
import { TimePicker } from "@simplysm/solid";
import { Time } from "@simplysm/core-common";

// Time input (minute precision)
<TimePicker unit="minute" value={time()} onValueChange={setTime} />

// Time input (second precision)
<TimePicker unit="second" value={time()} onValueChange={setTime} />

// min/max constraints
<TimePicker
  unit="minute"
  value={time()}
  onValueChange={setTime}
  min={new Time(9, 0, 0)}
  max={new Time(18, 0, 0)}
/>

// With validation
<TimePicker required value={time()} onValueChange={setTime} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Time` | - | Input value |
| `onValueChange` | `(value: Time \| undefined) => void` | - | Value change callback |
| `unit` | `"minute" \| "second"` | `"minute"` | Time unit |
| `min` | `Time` | - | Minimum time (error: "{min}보다 크거나 같아야 합니다") |
| `max` | `Time` | - | Maximum time (error: "{max}보다 작거나 같아야 합니다") |
| `title` | `string` | - | Tooltip title |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `validate` | `(value: Time \| undefined) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

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
| `required` | `boolean` | - | Required field |
| `disabled` | `boolean` | - | Disabled state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |

---

## Textarea

Multi-line text input field. Height adjusts automatically based on content, with IME composition support.

```tsx
import { Textarea } from "@simplysm/solid";

<Textarea value={text()} onValueChange={setText} />

// Minimum 3 rows height
<Textarea minRows={3} value={text()} onValueChange={setText} />

// With validation
<Textarea required minLength={10} value={text()} onValueChange={setText} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `""` | Input value |
| `onValueChange` | `(value: string) => void` | - | Value change callback |
| `placeholder` | `string` | - | Placeholder |
| `title` | `string` | - | Tooltip title |
| `minRows` | `number` | `1` | Minimum number of rows |
| `disabled` | `boolean` | - | Disabled state |
| `readonly` | `boolean` | - | Read-only state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `minLength` | `number` | - | Minimum character length (error: "Please enter at least N characters") |
| `maxLength` | `number` | - | Maximum character length (error: "Maximum N characters allowed") |
| `validate` | `(value: string) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

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

// With validation
<Select required value={selected()} onValueChange={setSelected} items={options} />
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
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `validate` | `(value: unknown) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

**Sub-components:**
- `Select.Item` -- Selection item
- `Select.Item.Children` -- Nested child items container (for hierarchical selection)
- `Select.Action` -- Right-side action button
- `Select.Header` -- Dropdown top custom area
- `Select.ItemTemplate` -- Item rendering template for items approach

---

## DataSelectButton

Modal-based selection button. Displays selected items inline and opens a dialog for selection. Supports single and multiple selection with key-based loading.

```tsx
import { DataSelectButton, type DataSelectModalResult } from "@simplysm/solid";

// Single selection
<DataSelectButton
  value={selectedUserId()}
  onValueChange={setSelectedUserId}
  load={async (keys) => await api.getUsersByIds(keys)}
  modal={() => <UserSelectModal />}
  renderItem={(user) => <>{user.name}</>}
/>

// Multiple selection
<DataSelectButton
  value={selectedIds()}
  onValueChange={setSelectedIds}
  multiple
  load={async (keys) => await api.getItemsByIds(keys)}
  modal={() => <ItemSelectModal />}
  renderItem={(item) => <>{item.name}</>}
/>
```

The modal should return `DataSelectModalResult<TKey>` via `dialogInstance.close({ selectedKeys: [...] })`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `TKey \| TKey[]` | - | Selected key(s) |
| `onValueChange` | `(value: TKey \| TKey[] \| undefined) => void` | - | Value change callback |
| `load` | `(keys: TKey[]) => TItem[] \| Promise<TItem[]>` | **(required)** | Load items by keys |
| `modal` | `() => JSX.Element` | **(required)** | Selection modal factory |
| `renderItem` | `(item: TItem) => JSX.Element` | **(required)** | Item display renderer |
| `multiple` | `boolean` | - | Multiple selection mode |
| `required` | `boolean` | - | Required field |
| `disabled` | `boolean` | - | Disabled state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `validate` | `(value: unknown) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after focus loss |
| `dialogOptions` | `DialogShowOptions` | - | Dialog options for modal |

**DataSelectModalResult:**

```typescript
interface DataSelectModalResult<TKey> {
  selectedKeys: TKey[];
}
```

---

## SharedData Wrappers

Convenience wrappers that connect `SharedDataAccessor` (from `useSharedData()`) to `Select`, `DataSelectButton`, and `SelectList` components. They auto-wire `items`, tree structure (`getChildren`), search, and hidden filtering from the shared data definition.

### SharedDataSelect

Wraps `Select` with `SharedDataAccessor`. Optionally adds search modal and edit modal action buttons.

```tsx
import { SharedDataSelect } from "@simplysm/solid";

const sharedData = useSharedData<MySharedData>();

<SharedDataSelect data={sharedData.departments} value={deptId()} onValueChange={setDeptId}>
  {(dept) => <>{dept.name}</>}
</SharedDataSelect>

// With search modal and edit modal
<SharedDataSelect
  data={sharedData.users}
  value={userId()}
  onValueChange={setUserId}
  modal={() => <UserSearchModal />}
  editModal={() => <UserEditModal />}
>
  {(user) => <>{user.name}</>}
</SharedDataSelect>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `SharedDataAccessor<TItem>` | **(required)** | Shared data accessor |
| `value` | `unknown` | - | Selected value |
| `onValueChange` | `(value: unknown) => void` | - | Value change callback |
| `multiple` | `boolean` | - | Multiple selection |
| `required` | `boolean` | - | Required field |
| `disabled` | `boolean` | - | Disabled state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `filterFn` | `(item: TItem, index: number) => boolean` | - | Item filter function |
| `modal` | `() => JSX.Element` | - | Search modal factory (adds search icon action) |
| `editModal` | `() => JSX.Element` | - | Edit modal factory (adds edit icon action) |
| `children` | `(item: TItem, index: number, depth: number) => JSX.Element` | **(required)** | Item render function |

### SharedDataSelectButton

Wraps `DataSelectButton` with `SharedDataAccessor`. Auto-wires `load` from shared data items.

```tsx
import { SharedDataSelectButton } from "@simplysm/solid";

const sharedData = useSharedData<MySharedData>();

<SharedDataSelectButton
  data={sharedData.users}
  value={userId()}
  onValueChange={setUserId}
  modal={() => <UserSelectModal />}
>
  {(user) => <>{user.name}</>}
</SharedDataSelectButton>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `SharedDataAccessor<TItem>` | **(required)** | Shared data accessor |
| `value` | `TKey \| TKey[]` | - | Selected key(s) |
| `onValueChange` | `(value: TKey \| TKey[] \| undefined) => void` | - | Value change callback |
| `multiple` | `boolean` | - | Multiple selection |
| `required` | `boolean` | - | Required field |
| `disabled` | `boolean` | - | Disabled state |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `modal` | `() => JSX.Element` | **(required)** | Selection modal factory |
| `children` | `(item: TItem) => JSX.Element` | **(required)** | Item render function |

### SharedDataSelectList

Wraps `SelectList` with `SharedDataAccessor`. Optionally adds a management modal link in header.

```tsx
import { SharedDataSelectList } from "@simplysm/solid";

const sharedData = useSharedData<MySharedData>();

<SharedDataSelectList
  data={sharedData.categories}
  value={selectedCategory()}
  onValueChange={setSelectedCategory}
  header="Category"
  modal={() => <CategoryManageModal />}
>
  <SelectList.ItemTemplate>
    {(cat) => <>{cat.name}</>}
  </SelectList.ItemTemplate>
</SharedDataSelectList>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `SharedDataAccessor<TItem>` | **(required)** | Shared data accessor |
| `value` | `TItem` | - | Selected value |
| `onValueChange` | `(value: TItem \| undefined) => void` | - | Value change callback |
| `required` | `boolean` | - | Required field |
| `disabled` | `boolean` | - | Disabled state |
| `filterFn` | `(item: TItem, index: number) => boolean` | - | Item filter function |
| `canChange` | `(item: TItem \| undefined) => boolean \| Promise<boolean>` | - | Change guard |
| `pageSize` | `number` | - | Page size (auto-shows pagination) |
| `header` | `string` | - | Header text |
| `modal` | `() => JSX.Element` | - | Management modal factory (adds link icon in header) |
| `children` | `JSX.Element` | **(required)** | Sub-component children (e.g., `SelectList.ItemTemplate`) |

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

// With validation
<Combobox required loadItems={loadItems} renderValue={(v) => v.name} value={selected()} onValueChange={setSelected} />
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
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `inset` | `boolean` | - | Inset style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `validate` | `(value: T \| undefined) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

**Sub-components:**
- `Combobox.Item` -- Selection item
- `Combobox.ItemTemplate` -- Item rendering template

---

## Checkbox / Radio

Checkbox and radio button components. Always uses primary color.

```tsx
import { Checkbox, Radio } from "@simplysm/solid";

<Checkbox value={checked()} onValueChange={setChecked}>I agree</Checkbox>

<Radio value={option() === "a"} onValueChange={() => setOption("a")}>Option A</Radio>
<Radio value={option() === "b"} onValueChange={() => setOption("b")}>Option B</Radio>

// With validation
<Checkbox required value={agreed()} onValueChange={setAgreed}>I agree to the terms</Checkbox>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `boolean` | `false` | Checked state |
| `onValueChange` | `(value: boolean) => void` | - | Value change callback |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `disabled` | `boolean` | - | Disabled state |
| `inset` | `boolean` | - | Inset style |
| `inline` | `boolean` | - | Inline style |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style object |
| `required` | `boolean` | - | Required field (error: "필수 선택 항목입니다") |
| `validate` | `(value: boolean) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

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

// With validation
<CheckboxGroup required value={selected()} onValueChange={setSelected}>
  <CheckboxGroup.Item value="a">Option A</CheckboxGroup.Item>
</CheckboxGroup>
```

**CheckboxGroup Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T[]` | `[]` | Selected values array |
| `onValueChange` | `(value: T[]) => void` | - | Value change callback |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `disabled` | `boolean` | - | Disable all items |
| `inline` | `boolean` | - | Inline style |
| `inset` | `boolean` | - | Inset style |
| `required` | `boolean` | - | Required field (error: "항목을 선택해 주세요") |
| `validate` | `(value: T[]) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

**RadioGroup Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T` | - | Selected value |
| `onValueChange` | `(value: T) => void` | - | Value change callback |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `disabled` | `boolean` | - | Disable all items |
| `inline` | `boolean` | - | Inline style |
| `inset` | `boolean` | - | Inset style |
| `required` | `boolean` | - | Required field (error: "항목을 선택해 주세요") |
| `validate` | `(value: T \| undefined) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

---

## ColorPicker

Color selection component.

```tsx
import { ColorPicker } from "@simplysm/solid";

<ColorPicker value={color()} onValueChange={setColor} />
<ColorPicker value={color()} size="sm" disabled />

// With validation
<ColorPicker required value={color()} onValueChange={setColor} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `"#000000"` | Color value (#RRGGBB format) |
| `onValueChange` | `(value: string) => void` | - | Value change callback |
| `title` | `string` | - | Tooltip title |
| `size` | `"sm" \| "lg"` | - | Size |
| `disabled` | `boolean` | - | Disabled state |
| `required` | `boolean` | - | Required field (error: "This is a required field") |
| `validate` | `(value: string \| undefined) => string \| undefined` | - | Custom validation function |
| `touchMode` | `boolean` | - | Show error only after field loses focus |

---

## ThemeToggle

Dark/light/system theme cycle toggle button. Must be used inside `ThemeProvider`.

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
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |

---

## Invalid

Wrapper component for form validation using native browser `setCustomValidity` API. Renders as a Fragment (no wrapper element). Manages both native form validity and visual error indicators.

```tsx
import { Invalid, TextInput } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [value, setValue] = createSignal("");
const [error, setError] = createSignal("");

const handleChange = (val: string) => {
  setValue(val);
  setError(val.length < 3 ? "Must be at least 3 characters" : "");
};

// variant="dot" — injects a red dot inside the first child element (default)
<Invalid message={error()}>
  <TextInput value={value()} onValueChange={handleChange} />
</Invalid>

// variant="border" — adds danger border class to the first child element
<Invalid variant="border" message={error()}>
  <div class="border rounded-lg p-2">Content</div>
</Invalid>

// touchMode — show visual feedback only after the field loses focus
<Invalid variant="border" message={error()} touchMode>
  <TextInput value={value()} onValueChange={handleChange} />
</Invalid>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | - | Validation error message (non-empty = invalid state) |
| `variant` | `"border" \| "dot"` | `"dot"` | Visual indicator style |
| `touchMode` | `boolean` | - | Show visual indicator only after the target element loses focus |

**Key features:**
- Renders as a Fragment — does not add a wrapper DOM element
- Uses native `setCustomValidity` for browser form validation integration (always set, regardless of `touchMode`)
- `variant="dot"`: injects a small red dot (`position: absolute`) inside the first child element
- `variant="border"`: adds `border-danger-500` CSS class to the first child element
- `touchMode`: visual display is deferred until the target element fires a `focusout` event
- Works with any form field component or custom element

> Most form controls (`TextInput`, `NumberInput`, `Textarea`, `Select`, etc.) use `Invalid` internally and expose `validate` / `touchMode` props directly. Direct use of `Invalid` is for custom validation scenarios.

---

## Form Validation

All form controls integrate with native browser form validation via the `setCustomValidity` API. Use `form.reportValidity()` to trigger validation and show error messages.

```tsx
import { Button, TextInput, NumberInput } from "@simplysm/solid";

<form onSubmit={(e) => {
  e.preventDefault();
  if (e.currentTarget.reportValidity()) {
    // All fields are valid — proceed with submit
  }
}}>
  <TextInput required placeholder="이름" value={name()} onValueChange={setName} />
  <TextInput required minLength={3} placeholder="최소 3자" value={nick()} onValueChange={setNick} />
  <TextInput
    validate={(v) => v.includes("@") ? undefined : "Invalid email format"}
    placeholder="이메일"
    value={email()}
    onValueChange={setEmail}
  />
  <NumberInput required min={0} max={100} value={score()} onValueChange={setScore} />
  <Button type="submit">Submit</Button>
</form>
```

**`validate` prop type:**

```typescript
validate?: (value: T) => string | undefined
// T is the component's value type (string, number, boolean, DateOnly, etc.)
// Return a string for an error message, or undefined when valid
```

**Built-in error messages (Korean):**

| Condition | Message |
|-----------|---------|
| `required` empty (text/number/date) | "This is a required field" |
| `required` unchecked (Checkbox/Radio) | "필수 선택 항목입니다" |
| `required` empty (CheckboxGroup/RadioGroup) | "항목을 선택해 주세요" |
| `minLength` not met | "Please enter at least N characters" |
| `maxLength` exceeded | "Maximum N characters allowed" |
| `pattern` mismatch | "Invalid input format" |
| `min` underflow (NumberInput) | "최솟값은 N입니다" |
| `max` overflow (NumberInput) | "최댓값은 N입니다" |
| `min` underflow (DatePicker/DateTimePicker/TimePicker) | "{min}보다 크거나 같아야 합니다" |
| `max` overflow (DatePicker/DateTimePicker/TimePicker) | "{max}보다 작거나 같아야 합니다" |

**`touchMode` behavior:**

When `touchMode` is set, the visual error indicator (red dot or border) is shown only after the user has interacted with the field (i.e., after `focusout`). The native `setCustomValidity` is always set immediately, so `form.reportValidity()` works correctly regardless of `touchMode`.

```tsx
// Error indicator appears only after the user leaves the field
<TextInput required touchMode value={name()} onValueChange={setName} />
```

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
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |

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
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |
