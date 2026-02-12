# @simplysm/solid

A SolidJS UI component library for enterprise back-office applications such as ERP and MES. Provides components for data-intensive forms, tables, and sidebar layouts with Tailwind CSS styling, dark mode, and responsive design.

## Installation

```bash
pnpm add @simplysm/solid
```

**Peer Dependencies:**
- `solid-js` ^1.9
- `tailwindcss` ^3.4

**Optional Peer Dependencies:**
- `echarts` ^6.0 -- Required for Echarts chart components

## Configuration

### Tailwind CSS

`@simplysm/solid` provides a Tailwind CSS preset. Register it as a preset in your app's `tailwind.config.ts` to automatically apply custom themes including semantic colors, field sizes, and z-index values.

```typescript
// tailwind.config.ts
import simplysmPreset from "@simplysm/solid/tailwind.config";

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    ...simplysmPreset.content,
  ],
};
```

### Provider Setup

Wrap your app root with `InitializeProvider`. It automatically sets up all required providers internally: configuration context, theme (dark/light/system), notification system with banner, loading overlay, and programmatic dialog support.

```tsx
import { InitializeProvider } from "@simplysm/solid";

function App() {
  return (
    <InitializeProvider config={{ clientName: "my-app" }}>
      {/* app content */}
    </InitializeProvider>
  );
}
```

**AppConfig options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientName` | `string` | **(required)** | Client identifier (used as storage key prefix) |
| `storage` | `StorageAdapter` | `localStorage` | Custom storage adapter |
| `loadingVariant` | `"spinner" \| "bar"` | `"spinner"` | Root loading overlay variant |
```

### Base CSS

Import the base CSS in your entry point:

```typescript
// entry point (e.g., index.tsx)
import "@simplysm/solid/base.css";
```

---

## Components

### Form Control

#### Button

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

#### TextInput

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

#### NumberInput

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

#### DatePicker

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

#### DateRangePicker

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

#### Textarea

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

#### Select

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

#### Combobox

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

#### Checkbox / Radio

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

#### CheckboxGroup / RadioGroup

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

#### ColorPicker

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

#### ThemeToggle

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

#### RichTextEditor

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

#### Numpad

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

#### StatePreset

Component for saving/loading screen state (search conditions, etc.) as presets. Persisted in localStorage.

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

---

### Navigation

#### Tabs

Tab navigation component.

```tsx
import { Tabs } from "@simplysm/solid";

<Tabs value={activeTab()} onValueChange={setActiveTab}>
  <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
  <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  <Tabs.Tab value="tab3" disabled>Tab 3</Tabs.Tab>
</Tabs>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Selected tab value |
| `onValueChange` | `(value: string) => void` | - | Tab change callback |
| `size` | `"sm" \| "lg"` | - | Size |

**Sub-components:**
- `Tabs.Tab` -- Individual tab (`value: string`, `disabled?: boolean`)

---

### Display

#### Card

Container with shadow effect.

```tsx
import { Card } from "@simplysm/solid";

<Card>Card content</Card>
<Card class="p-4">Card with padding</Card>
```

---

#### Tag

Inline tag/badge component.

```tsx
import { Tag } from "@simplysm/solid";

<Tag theme="primary">New</Tag>
<Tag theme="success">Complete</Tag>
<Tag theme="danger">Urgent</Tag>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | Color theme |

---

#### Alert

Block-level alert/notice component.

```tsx
import { Alert } from "@simplysm/solid";

<Alert theme="info">This is an information message.</Alert>
<Alert theme="warning">Please pay attention to this.</Alert>
<Alert theme="danger">An error has occurred.</Alert>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | Color theme |

---

#### Icon

Tabler Icons wrapper component. Displayed in `em` units to scale proportionally with surrounding text.

```tsx
import { Icon } from "@simplysm/solid";
import { IconCheck, IconAlertTriangle } from "@tabler/icons-solidjs";

<Icon icon={IconCheck} />
<Icon icon={IconAlertTriangle} size="2em" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `Component` | **(required)** | Tabler icon component |
| `size` | `string \| number` | `"1.25em"` | Icon size |

---

#### Progress

Progress indicator component.

```tsx
import { Progress } from "@simplysm/solid";

<Progress value={0.65} />
<Progress value={0.8} theme="success" size="lg" />

// Custom text
<Progress value={progress()}>
  {Math.round(progress() * 100)}% complete
</Progress>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | **(required)** | Progress (0~1) |
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"primary"` | Color theme |
| `size` | `"sm" \| "lg"` | - | Size |
| `inset` | `boolean` | - | Inset style |

---

#### Barcode

bwip-js-based barcode/QR code rendering component. Supports over 100 barcode types.

```tsx
import { Barcode } from "@simplysm/solid";

<Barcode type="qrcode" value="https://example.com" />
<Barcode type="code128" value="ABC-12345" />
<Barcode type="ean13" value="4901234567890" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `BarcodeType` | **(required)** | Barcode type (`"qrcode"`, `"code128"`, `"ean13"`, etc.) |
| `value` | `string` | - | Barcode value |

---

#### Echarts

Apache ECharts chart wrapper component. Requires `echarts` peer dependency installation.

```tsx
import { Echarts } from "@simplysm/solid";

<Echarts
  option={{
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed"] },
    yAxis: { type: "value" },
    series: [{ data: [120, 200, 150], type: "bar" }],
  }}
/>

<Echarts option={chartOption()} loading={isLoading()} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `option` | `echarts.EChartsOption` | **(required)** | ECharts option object |
| `loading` | `boolean` | - | Show loading state |

---

### Layout

#### Sidebar

Sidebar navigation with responsive support (mobile overlay below 520px). Open/closed state is saved in localStorage.

```tsx
import { Sidebar, Topbar } from "@simplysm/solid";

<Sidebar.Container>
  <Sidebar>
    <Sidebar.User name="John Doe" menus={userMenus}>
      <span>John Doe</span>
    </Sidebar.User>
    <Sidebar.Menu menus={menuItems} />
  </Sidebar>
  <div class="flex flex-1 flex-col">
    <Topbar>
      <h1>App Name</h1>
    </Topbar>
    <main class="flex-1 overflow-auto p-4">
      {/* main content */}
    </main>
  </div>
</Sidebar.Container>
```

**Sub-components:**
- `Sidebar.Container` -- Container wrapping sidebar and main area (required)
- `Sidebar.Menu` -- Menu items list (`menus: SidebarMenuItem[]`)
- `Sidebar.User` -- User info area

**SidebarMenuItem type:**

```typescript
interface SidebarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: SidebarMenuItem[];
}
```

**useSidebarContext hook:**

```tsx
import { useSidebarContext } from "@simplysm/solid";

const sidebar = useSidebarContext();
sidebar.toggle();          // current open/closed state
sidebar.setToggle(false);  // programmatically close
```

---

#### Topbar

Top navigation bar. When used inside `Sidebar.Container`, a sidebar toggle button appears automatically.

```tsx
import { Topbar } from "@simplysm/solid";
import { IconSettings, IconUser } from "@tabler/icons-solidjs";

const menuItems: TopbarMenuItem[] = [
  { title: "Settings", icon: IconSettings, href: "/settings" },
  {
    title: "Admin",
    icon: IconUser,
    children: [
      { title: "Users", href: "/admin/users" },
      { title: "Roles", href: "/admin/roles" },
    ],
  },
];

const userMenus: TopbarUserMenu[] = [
  { title: "Profile", onClick: () => navigate("/profile") },
  { title: "Logout", onClick: handleLogout },
];

<Topbar>
  <h1 class="text-lg font-bold">App Name</h1>
  <Topbar.Menu menus={menuItems} />
  <div class="flex-1" />
  <Topbar.User menus={userMenus}>User</Topbar.User>
</Topbar>
```

**Sub-components:**
- `Topbar.Container` -- Container wrapping main content below topbar
- `Topbar.Menu` -- Menu items list
- `Topbar.User` -- User menu (dropdown)

**TopbarMenuItem type:**

```typescript
interface TopbarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];  // supports unlimited nesting
}
```

**TopbarUserMenu type:**

```typescript
interface TopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

---

#### FormGroup

Layout component for arranging form fields with labels vertically or inline.

```tsx
import { FormGroup, TextInput } from "@simplysm/solid";

// Vertical layout (default)
<FormGroup>
  <FormGroup.Item label="Name">
    <TextInput value={name()} onValueChange={setName} />
  </FormGroup.Item>
  <FormGroup.Item label="Email">
    <TextInput type="email" value={email()} onValueChange={setEmail} />
  </FormGroup.Item>
</FormGroup>

// Inline layout
<FormGroup inline>
  <FormGroup.Item label="Search">
    <TextInput value={query()} onValueChange={setQuery} />
  </FormGroup.Item>
  <FormGroup.Item>
    <Button theme="primary">Search</Button>
  </FormGroup.Item>
</FormGroup>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inline` | `boolean` | `false` | Inline layout mode |

**Sub-components:**
- `FormGroup.Item` -- Form item (`label?: JSX.Element`)

---

#### FormTable

`<table>`-based form layout. Labels go in `<th>`, input fields in `<td>`.

```tsx
import { FormTable, TextInput, NumberInput } from "@simplysm/solid";

<FormTable>
  <tbody>
    <tr>
      <th>Name</th>
      <td><TextInput value={name()} onValueChange={setName} /></td>
      <th>Age</th>
      <td><NumberInput value={age()} onValueChange={setAge} /></td>
    </tr>
    <tr>
      <th>Email</th>
      <td colSpan={3}><TextInput type="email" value={email()} onValueChange={setEmail} /></td>
    </tr>
  </tbody>
</FormTable>
```

---

#### Kanban

Kanban board layout component with drag-and-drop cards, lane collapse, multi-select, and loading states.

```tsx
import { createSignal, For } from "solid-js";
import { Button, Icon, Kanban, type KanbanDropInfo } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";

const [selected, setSelected] = createSignal<unknown[]>([]);

const handleDrop = (info: KanbanDropInfo) => {
  // info.sourceValue: dragged card value
  // info.targetLaneValue: target lane value
  // info.targetCardValue: target card value (undefined if dropped on empty area)
  // info.position: "before" | "after" | undefined
  moveCard(info);
};

<div class="h-[500px]">
  <Kanban
    selectedValues={selected()}
    onSelectedValuesChange={setSelected}
    onDrop={handleDrop}
  >
    <For each={lanes()}>
      {(lane) => (
        <Kanban.Lane value={lane.id} collapsible busy={lane.loading}>
          <Kanban.LaneTitle>
            {lane.title} ({lane.cards.length})
          </Kanban.LaneTitle>
          <Kanban.LaneTools>
            <Button size="sm" variant="ghost">
              <Icon icon={IconPlus} />
            </Button>
          </Kanban.LaneTools>
          <For each={lane.cards}>
            {(card) => (
              <Kanban.Card value={card.id} selectable draggable contentClass="p-2">
                {card.title}
              </Kanban.Card>
            )}
          </For>
        </Kanban.Lane>
      )}
    </For>
  </Kanban>
</div>
```

**Kanban Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onDrop` | `(info: KanbanDropInfo) => void` | - | Drop event handler |
| `selectedValues` | `unknown[]` | - | Selected card values |
| `onSelectedValuesChange` | `(values: unknown[]) => void` | - | Selection change callback |

`KanbanDropInfo`: `{ sourceValue: unknown; targetLaneValue: unknown; targetCardValue: unknown | undefined; position: "before" | "after" | undefined }`

**Kanban.Lane Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `unknown` | - | Lane identifier |
| `busy` | `boolean` | - | Show loading bar |
| `collapsible` | `boolean` | - | Allow collapse/expand |
| `collapsed` | `boolean` | - | Collapsed state (controlled) |
| `onCollapsedChange` | `(collapsed: boolean) => void` | - | Collapse state callback |

**Kanban.Card Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `unknown` | - | Card identifier |
| `draggable` | `boolean` | `true` | Enable drag |
| `selectable` | `boolean` | `false` | Enable selection |
| `contentClass` | `string` | - | Card content class |

**Sub-components:**
- `Kanban.Lane` -- Board lane/column
- `Kanban.LaneTitle` -- Lane header title area
- `Kanban.LaneTools` -- Lane header action buttons
- `Kanban.Card` -- Draggable card

**Selection:** Shift+Click for multi-select, long press for single select. Lane header checkbox toggles all cards in the lane.

---

### Data

#### Table

Basic HTML table wrapper. Provides consistent styling for borders, header backgrounds, etc.

```tsx
import { Table } from "@simplysm/solid";

<Table>
  <thead>
    <tr><th>Name</th><th>Age</th></tr>
  </thead>
  <tbody>
    <tr><td>John Doe</td><td>30</td></tr>
    <tr><td>Jane Smith</td><td>25</td></tr>
  </tbody>
</Table>

// Inset style (removes outer border, fits parent container)
<Table inset>...</Table>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inset` | `boolean` | - | Inset style |

---

#### DataSheet

Advanced data table component. Supports sorting, pagination, row selection, tree expansion, column resize, column configuration, drag-and-drop reordering, and persistent column settings.

```tsx
import { DataSheet } from "@simplysm/solid";

// Basic usage
<DataSheet items={users()} persistKey="user-table">
  <DataSheet.Column key="name" header="Name" sortable class="px-2 py-1">
    {({ item }) => <>{item.name}</>}
  </DataSheet.Column>
  <DataSheet.Column key="age" header="Age" sortable width="80px" class="px-2 py-1">
    {({ item }) => <>{item.age}</>}
  </DataSheet.Column>
  <DataSheet.Column key="email" header="Email" class="px-2 py-1">
    {({ item }) => <>{item.email}</>}
  </DataSheet.Column>
</DataSheet>

// With pagination + sorting + selection
<DataSheet
  items={data()}
  persistKey="data-table"
  pageIndex={pageIndex()}
  onPageIndexChange={setPageIndex}
  itemsPerPage={20}
  totalPageCount={totalPages()}
  sorts={sorts()}
  onSortsChange={setSorts}
  selectMode="multiple"
  selectedItems={selectedItems()}
  onSelectedItemsChange={setSelectedItems}
>
  {/* columns */}
</DataSheet>

// Tree structure with expansion
<DataSheet
  items={treeData()}
  persistKey="tree-table"
  getChildren={(item) => item.children}
  expandedItems={expanded()}
  onExpandedItemsChange={setExpanded}
>
  {/* columns */}
</DataSheet>

// Auto-select on row click + drag reorder
<DataSheet
  items={items()}
  persistKey="reorder-table"
  autoSelect="click"
  selectMode="single"
  selectedItems={selected()}
  onSelectedItemsChange={setSelected}
  onItemsReorder={(e) => {
    // e: { item: T, targetItem: T, position: "before" | "after" | "inside" }
    reorderItems(e);
  }}
>
  {/* columns */}
</DataSheet>
```

**DataSheet Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | - | Data array |
| `persistKey` | `string` | - | Column configuration localStorage key |
| `class` | `string` | - | CSS class |
| `contentStyle` | `JSX.CSSProperties \| string` | - | Scroll area style |
| `inset` | `boolean` | - | Inset style |
| `hideConfigBar` | `boolean` | - | Hide config bar and pagination |
| `sorts` | `SortingDef[]` | - | Sort state (`{ key: string; desc: boolean }[]`) |
| `onSortsChange` | `(sorts: SortingDef[]) => void` | - | Sort change callback |
| `autoSort` | `boolean` | - | Client-side auto-sorting |
| `pageIndex` | `number` | - | Current page index (0-based) |
| `onPageIndexChange` | `(pageIndex: number) => void` | - | Page change callback |
| `totalPageCount` | `number` | - | Total page count |
| `itemsPerPage` | `number` | - | Items per page |
| `displayPageCount` | `number` | - | Number of page buttons to display |
| `selectMode` | `"single" \| "multiple"` | - | Selection mode |
| `selectedItems` | `T[]` | - | Selected items |
| `onSelectedItemsChange` | `(items: T[]) => void` | - | Selection change callback |
| `autoSelect` | `"click"` | - | Auto-select row on click |
| `isItemSelectable` | `(item: T) => boolean \| string` | - | Item selectability (string returns tooltip) |
| `getChildren` | `(item: T, index: number) => T[] \| undefined` | - | Tree structure children getter |
| `expandedItems` | `T[]` | - | Expanded tree items |
| `onExpandedItemsChange` | `(items: T[]) => void` | - | Expansion state change callback |
| `cellClass` | `(item: T, colKey: string) => string \| undefined` | - | Dynamic cell class function |
| `cellStyle` | `(item: T, colKey: string) => string \| undefined` | - | Dynamic cell style function |
| `onItemsReorder` | `(event: DataSheetReorderEvent<T>) => void` | - | Drag reorder handler (shows drag handle when set) |

`DataSheetReorderEvent<T>`: `{ item: T; targetItem: T; position: "before" | "after" | "inside" }`

**DataSheet.Column Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | **(required)** | Column identifier key |
| `header` | `string \| string[]` | - | Header text (array for multi-level headers) |
| `headerContent` | `() => JSX.Element` | - | Custom header rendering |
| `headerStyle` | `string` | - | Header style |
| `summary` | `() => JSX.Element` | - | Summary row rendering |
| `tooltip` | `string` | - | Header tooltip |
| `width` | `string` | - | Column width (e.g., `"100px"`, `"10rem"`) |
| `class` | `string` | - | Cell CSS class |
| `fixed` | `boolean` | `false` | Fixed column |
| `hidden` | `boolean` | `false` | Hidden column |
| `collapse` | `boolean` | `false` | Hidden in config modal |
| `sortable` | `boolean` | `true` | Sortable |
| `resizable` | `boolean` | `true` | Resizable |
| `children` | `(ctx: { item: T, index: number, depth: number }) => JSX.Element` | **(required)** | Cell rendering function |

---

#### List

Tree-view style list component. Supports keyboard navigation.

```tsx
import { List } from "@simplysm/solid";

<List>
  <List.Item>Item 1</List.Item>
  <List.Item>Item 2</List.Item>
  <List.Item>
    Parent item
    <List.Item.Children>
      <List.Item>Child item 1</List.Item>
      <List.Item>Child item 2</List.Item>
    </List.Item.Children>
  </List.Item>
</List>

// Inset style
<List inset>
  <List.Item>Inset item</List.Item>
</List>
```

**Keyboard navigation:**
- `ArrowUp` / `ArrowDown` -- Move focus to previous/next item
- `Space` / `Enter` -- Click current item
- `ArrowRight` -- Expand if collapsed, focus first child if expanded
- `ArrowLeft` -- Collapse if expanded, focus parent if collapsed
- `Home` / `End` -- Focus first/last item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inset` | `boolean` | - | Transparent background style |

---

#### Pagination

Page navigation component.

```tsx
import { Pagination } from "@simplysm/solid";

<Pagination
  page={currentPage()}
  onPageChange={setCurrentPage}
  totalPageCount={20}
  displayPageCount={10}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `page` | `number` | **(required)** | Current page (0-based) |
| `onPageChange` | `(page: number) => void` | - | Page change callback |
| `totalPageCount` | `number` | **(required)** | Total page count |
| `displayPageCount` | `number` | `10` | Number of pages to display at once |
| `size` | `"sm" \| "lg"` | - | Size |

---

#### Calendar

Calendar-style data display component.

```tsx
import { Calendar } from "@simplysm/solid";

<Calendar
  items={events()}
  getItemDate={(event) => event.date}
  renderItem={(event) => <div>{event.title}</div>}
  yearMonth={yearMonth()}
  onYearMonthChange={setYearMonth}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | **(required)** | Data array |
| `getItemDate` | `(item: T, index: number) => DateOnly` | **(required)** | Item date extraction function |
| `renderItem` | `(item: T, index: number) => JSX.Element` | **(required)** | Item rendering function |
| `yearMonth` | `DateOnly` | - | Year-month to display |
| `onYearMonthChange` | `(value: DateOnly) => void` | - | Year-month change callback |
| `weekStartDay` | `number` | `0` (Sunday) | Week start day |

---

#### PermissionTable

Hierarchical permission management table. Displays a tree of permission items with per-item checkboxes for each permission type. Supports cascading checks (parent toggles children) and permission dependencies (disabling the first permission disables the rest).

```tsx
import { createSignal } from "solid-js";
import { type PermissionItem, PermissionTable } from "@simplysm/solid";

const items: PermissionItem[] = [
  {
    title: "User Management",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "Permission Settings", href: "/user/permission", perms: ["use", "edit", "approve"] },
      { title: "User List", href: "/user/list", perms: ["use", "edit"] },
    ],
  },
  {
    title: "Board",
    href: "/board",
    perms: ["use", "edit"],
    modules: ["community"],  // only shown when "community" module is active
    children: [
      { title: "Notice", href: "/board/notice", perms: ["use", "edit"] },
      { title: "Free Board", href: "/board/free", perms: ["use"] },
    ],
  },
];

const [value, setValue] = createSignal<Record<string, boolean>>({});

// Basic usage
<PermissionTable items={items} value={value()} onValueChange={setValue} />

// Filtered by module
<PermissionTable items={items} value={value()} onValueChange={setValue} modules={["community"]} />

// Disabled
<PermissionTable items={items} value={value()} disabled />
```

The `value` record uses keys in `"{href}/{perm}"` format (e.g., `{ "/user/use": true, "/user/edit": false }`).

**PermissionTable Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `PermissionItem<TModule>[]` | - | Permission tree structure |
| `value` | `Record<string, boolean>` | - | Permission state record |
| `onValueChange` | `(value: Record<string, boolean>) => void` | - | State change callback |
| `modules` | `TModule[]` | - | Module filter (show only matching items) |
| `disabled` | `boolean` | - | Disable all checkboxes |

**PermissionItem type:**

```typescript
interface PermissionItem<TModule = string> {
  title: string;                       // Display text
  href?: string;                       // Permission path (used as value key prefix)
  modules?: TModule[];                 // Modules this item belongs to
  perms?: string[];                    // Permission types (e.g., ["use", "edit", "approve"])
  children?: PermissionItem<TModule>[]; // Child items
}
```

**Cascading behavior:** Checking a parent checks all children. Unchecking `perms[0]` (base permission) automatically unchecks all other permissions for that item.

---

### Disclosure

#### Collapse

Content collapse/expand animation component. Uses `margin-top`-based transition for smooth open/close effects.

```tsx
import { Collapse, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

<Button
  aria-expanded={open()}
  aria-controls="content"
  onClick={() => setOpen(!open())}
>
  Toggle
</Button>
<Collapse id="content" open={open()}>
  <p>Collapsible content</p>
</Collapse>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Open state |

Animation is automatically disabled when `prefers-reduced-motion` is set.

---

#### Dropdown

Positioned dropdown popup. Position is determined relative to trigger element or absolute coordinates.

```tsx
import { Dropdown, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);
let triggerRef!: HTMLButtonElement;

<Button ref={triggerRef} onClick={() => setOpen(!open())}>Open</Button>
<Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen}>
  <p class="p-3">Dropdown content</p>
</Dropdown>

// Context menu (absolute position)
<Dropdown position={{ x: 100, y: 200 }} open={menuOpen()} onOpenChange={setMenuOpen}>
  <List inset>
    <List.Item>Menu item 1</List.Item>
    <List.Item>Menu item 2</List.Item>
  </List>
</Dropdown>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `triggerRef` | `() => HTMLElement \| undefined` | - | Trigger element reference (mutually exclusive with position) |
| `position` | `{ x: number; y: number }` | - | Absolute position (mutually exclusive with triggerRef) |
| `open` | `boolean` | - | Open state |
| `onOpenChange` | `(open: boolean) => void` | - | State change callback |
| `maxHeight` | `number` | `300` | Maximum height (px) |
| `keyboardNav` | `boolean` | - | Enable keyboard navigation (used by Select, etc.) |

---

#### Dialog

Modal dialog component. Supports drag movement, resize, floating mode, fullscreen mode, and programmatic opening via `useDialog`.

**Declarative usage:**

```tsx
import { Dialog, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog
  title="Dialog Title"
  open={open()}
  onOpenChange={setOpen}
  closeOnBackdrop
  widthPx={600}
>
  <div class="p-4">
    Dialog content
  </div>
</Dialog>

// Floating mode (no backdrop)
<Dialog
  title="Notification"
  open={open()}
  onOpenChange={setOpen}
  float
  position="bottom-right"
>
  <div class="p-4">Floating dialog</div>
</Dialog>
```

**Programmatic usage with `useDialog`:**

```tsx
import { useDialog, useDialogInstance, Button, TextInput } from "@simplysm/solid";
import { createSignal } from "solid-js";

// Dialog content component
function EditDialog() {
  const dialogInstance = useDialogInstance<string>();
  const [name, setName] = createSignal("");

  return (
    <div class="p-4 space-y-4">
      <TextInput value={name()} onValueChange={setName} placeholder="Enter name" />
      <Button theme="primary" onClick={() => dialogInstance?.close(name())}>
        Save
      </Button>
    </div>
  );
}

// Opening dialog programmatically
function MyPage() {
  const dialog = useDialog();

  const handleOpen = async () => {
    const result = await dialog.show<string>(
      () => <EditDialog />,
      { title: "Edit Name", widthPx: 400, closeOnBackdrop: true },
    );
    if (result != null) {
      // result is the value passed to dialogInstance.close()
      console.log("Saved:", result);
    }
  };

  return <Button onClick={handleOpen}>Open Editor</Button>;
}
```

**Dialog Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Open state |
| `onOpenChange` | `(open: boolean) => void` | - | State change callback |
| `title` | `string` | **(required)** | Modal title |
| `hideHeader` | `boolean` | - | Hide header |
| `closable` | `boolean` | `true` | Show close button |
| `closeOnBackdrop` | `boolean` | - | Close on backdrop click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `resizable` | `boolean` | `false` | Resizable |
| `movable` | `boolean` | `true` | Draggable |
| `float` | `boolean` | - | Floating mode (no backdrop) |
| `fill` | `boolean` | - | Fullscreen mode |
| `widthPx` | `number` | - | Width (px) |
| `heightPx` | `number` | - | Height (px) |
| `minWidthPx` | `number` | - | Minimum width (px) |
| `minHeightPx` | `number` | - | Minimum height (px) |
| `position` | `"bottom-right" \| "top-right"` | - | Fixed position |
| `headerAction` | `JSX.Element` | - | Header action area |
| `headerStyle` | `JSX.CSSProperties \| string` | - | Header style |
| `canDeactivate` | `() => boolean` | - | Pre-close confirmation function |
| `onCloseComplete` | `() => void` | - | Post-close animation callback |

**useDialog API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `<T>(factory: () => JSX.Element, options: DialogShowOptions) => Promise<T \| undefined>` | Open dialog, returns result on close |

`DialogShowOptions` accepts all Dialog props except `open`, `onOpenChange`, and `children`.

**useDialogInstance API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `close` | `(result?: T) => void` | Close dialog with optional return value |

---

### Feedback

#### Notification

Notification system. `InitializeProvider` automatically sets up `NotificationProvider` and `NotificationBanner`, so you only need to use the `useNotification` hook and optionally add `NotificationBell` in your layout.

```tsx
import {
  NotificationBell,
  useNotification,
} from "@simplysm/solid";

// Trigger notifications within components
function MyComponent() {
  const notification = useNotification();

  const handleSave = () => {
    notification.success("Success", "Saved successfully.");
  };

  const handleError = () => {
    notification.danger("Error", "An issue occurred.", {
      action: { label: "Retry", onClick: handleRetry },
    });
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

**useNotification API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `info` | `(title: string, message?: string, options?: NotificationOptions) => string` | Info notification |
| `success` | `(title: string, message?: string, options?: NotificationOptions) => string` | Success notification |
| `warning` | `(title: string, message?: string, options?: NotificationOptions) => string` | Warning notification |
| `danger` | `(title: string, message?: string, options?: NotificationOptions) => string` | Error notification |
| `update` | `(id: string, updates: Partial<NotificationItem>, options?: { renotify?: boolean }) => void` | Update notification |
| `remove` | `(id: string) => void` | Remove notification |
| `markAsRead` | `(id: string) => void` | Mark as read |
| `markAllAsRead` | `() => void` | Mark all as read |
| `dismissBanner` | `() => void` | Dismiss banner |
| `clear` | `() => void` | Clear all |

**Components:**
- `NotificationBanner` -- Top-of-screen notification banner (automatically included by `InitializeProvider`)
- `NotificationBell` -- Notification bell icon (shows unread count, add to your layout as needed)

---

#### Loading

Loading overlay system. `InitializeProvider` automatically sets up `LoadingProvider` and `LoadingContainer`. Use the `loadingVariant` option in `AppConfig` to choose between `"spinner"` (default) and `"bar"` variants. Control the loading state using the `useLoading` hook.

```tsx
import { useLoading } from "@simplysm/solid";

// Control loading within components
function MyComponent() {
  const loading = useLoading();

  const fetchData = async () => {
    loading.show("Loading data...");
    try {
      await fetch("/api/data");
    } finally {
      loading.hide();
    }
  };

  return <Button onClick={fetchData}>Load Data</Button>;
}
```

**useLoading API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `(message?: string) => void` | Show loading |
| `hide` | `() => void` | Hide loading |
| `setProgress` | `(percent: number \| undefined) => void` | Set progress |

---

### Print

#### Print / usePrint

Browser printing and PDF generation. Must be used inside `InitializeProvider`.

```tsx
import { Print, usePrint } from "@simplysm/solid";

function MyComponent() {
  const { toPrinter, toPdf } = usePrint();

  const handlePrint = async () => {
    await toPrinter(
      () => (
        <Print>
          <Print.Page>
            <h1>Print content</h1>
            <p>Page 1</p>
          </Print.Page>
          <Print.Page>
            <p>Page 2</p>
          </Print.Page>
        </Print>
      ),
      { size: "A4", margin: "10mm" },
    );
  };

  const handlePdf = async () => {
    const pdfData = await toPdf(
      () => (
        <Print>
          <Print.Page>
            <h1>PDF content</h1>
          </Print.Page>
        </Print>
      ),
      { size: "A4 landscape" },
    );
    // pdfData: Uint8Array
  };

  return (
    <>
      <Button onClick={handlePrint}>Print</Button>
      <Button onClick={handlePdf}>Download PDF</Button>
    </>
  );
}
```

**usePrint API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `toPrinter` | `(factory: () => JSX.Element, options?: PrintOptions) => Promise<void>` | Browser print |
| `toPdf` | `(factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>` | PDF generation |

**PrintOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `string` | `"A4"` | Paper size (`"A4"`, `"A3"`, `"A4 landscape"`, `"210mm 297mm"`, etc.) |
| `margin` | `string` | `"0"` | Margins (`"10mm"`, `"1cm"`, etc.) |

**Sub-components:**
- `Print.Page` -- Explicit page breaks (auto-breaks if not used)

**usePrintInstance (for async data in print content):**

Use `usePrintInstance` inside print content components when you need to load async data before rendering. Call `ready()` to signal that the content is ready to print.

```tsx
import { usePrintInstance } from "@simplysm/solid";
import { createResource, Show } from "solid-js";

function InvoicePrintContent(props: { invoiceId: number }) {
  const printInstance = usePrintInstance();
  const [invoice] = createResource(() => fetchInvoice(props.invoiceId));

  createEffect(() => {
    if (invoice()) {
      printInstance?.ready();  // signal that content is ready
    }
  });

  return (
    <Show when={invoice()}>
      {(inv) => (
        <Print>
          <Print.Page>
            <h1>Invoice #{inv().id}</h1>
            {/* invoice content */}
          </Print.Page>
        </Print>
      )}
    </Show>
  );
}

// Usage
const { toPrinter } = usePrint();
await toPrinter(() => <InvoicePrintContent invoiceId={123} />, { size: "A4", margin: "10mm" });
```

---

## Context & Hooks

### useTheme

Hook to access theme (dark/light/system) state. Must be used inside `InitializeProvider`.

```tsx
import { useTheme } from "@simplysm/solid";

const theme = useTheme();
theme.mode();          // "light" | "dark" | "system"
theme.resolvedTheme(); // "light" | "dark" (follows OS setting when system)
theme.setMode("dark");
theme.cycleMode();     // light -> system -> dark -> light
```

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `mode` | `() => ThemeMode` | Current theme mode |
| `resolvedTheme` | `() => ResolvedTheme` | Actual applied theme |
| `setMode` | `(mode: ThemeMode) => void` | Set theme mode |
| `cycleMode` | `() => void` | Cycle to next mode |

---

### usePersisted

localStorage-based persistent signal. Must be used inside `InitializeProvider`, and keys are automatically stored as `{clientName}.{key}`. Supports serialization of `@simplysm/core-common` custom types like `DateTime`, `DateOnly`.

```tsx
import { usePersisted } from "@simplysm/solid";

const [value, setValue] = usePersisted("settings.view", "grid");

// loading state (for async storage)
const [data, setData, loading] = usePersisted("cache.data", defaultData);
```

| Return value | Type | Description |
|--------------|------|-------------|
| `[0]` | `Accessor<T>` | Value getter |
| `[1]` | `Setter<T>` | Value setter |
| `[2]` | `Accessor<boolean>` | Loading state (async storage only) |

---

### useNotification

Hook to access notification system. Must be used inside `InitializeProvider`. See [Notification](#notification) section for detailed API.

---

### useLoading

Hook to access loading overlay. Must be used inside `InitializeProvider`. See [Loading](#loading) section for detailed API.

---

### usePrint

Hook for printing and PDF generation. Must be used inside `InitializeProvider`. See [Print](#print--useprint) section for detailed API.

---

### useConfig

Hook to access app-wide configuration. Must be used inside `InitializeProvider`.

```tsx
import { useConfig } from "@simplysm/solid";

const config = useConfig();
console.log(config.clientName); // "my-app"
```

---

### createControllableSignal

Signal hook that automatically handles Controlled/Uncontrolled patterns. Operates in controlled mode when `onChange` is provided, uncontrolled mode otherwise.

```tsx
import { createControllableSignal } from "@simplysm/solid";

// Use inside components
const [value, setValue] = createControllableSignal({
  value: () => props.value ?? "",
  onChange: () => props.onValueChange,
});

// Supports functional setter
setValue((prev) => prev + "!");
```

---

### createMountTransition

Mount transition hook for open/close CSS animations. Control DOM rendering with `mounted()` and toggle CSS classes with `animating()`.

```tsx
import { createMountTransition } from "@simplysm/solid";

const { mounted, animating, unmount } = createMountTransition(() => open());
```

| Return value | Type | Description |
|--------------|------|-------------|
| `mounted` | `() => boolean` | Whether mounted in DOM |
| `animating` | `() => boolean` | Animation active state |
| `unmount` | `() => void` | Manual unmount |

---

### createIMEHandler

Hook that delays `onValueChange` calls during IME (Korean, etc.) composition to prevent interrupted input.

---

### useRouterLink

`@solidjs/router`-based navigation hook. Automatically handles Ctrl/Alt + click (new tab), Shift + click (new window).

```tsx
import { useRouterLink } from "@simplysm/solid";

const navigate = useRouterLink();

<List.Item onClick={navigate({ href: "/home/dashboard" })}>
  Dashboard
</List.Item>

// Pass state
<List.Item onClick={navigate({ href: "/users/123", state: { from: "list" } })}>
  User
</List.Item>
```

---

### createAppStructure

Utility for declaratively defining app structure (routing, menus, permissions). Takes a single options object.

```tsx
import { createAppStructure, type AppStructureItem } from "@simplysm/solid";
import { IconHome, IconUsers } from "@tabler/icons-solidjs";

const items: AppStructureItem<string>[] = [
  {
    code: "home",
    title: "Home",
    icon: IconHome,
    component: HomePage,
    perms: ["use"],
  },
  {
    code: "admin",
    title: "Admin",
    icon: IconUsers,
    children: [
      { code: "users", title: "User Management", component: UsersPage, perms: ["use", "edit"] },
      { code: "roles", title: "Role Management", component: RolesPage, perms: ["use"], isNotMenu: true },
    ],
  },
];

const structure = createAppStructure({
  items,
  usableModules: () => activeModules(),  // optional: filter by active modules
  permRecord: () => userPermissions(),   // optional: user permission state
});

// structure.routes         -- Route array (pass to @solidjs/router)
// structure.usableMenus()  -- SidebarMenuItem[] for Sidebar.Menu
// structure.usableFlatMenus() -- Flat menu list
// structure.permRecord()   -- Record<string, boolean> permission state
```

**AppStructureItem types:**

```typescript
// Group item (has children, no component)
interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  children: AppStructureItem<TModule>[];
}

// Leaf item (has component, no children)
interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  component?: Component;
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPerm<TModule>[];
  isNotMenu?: boolean;  // exclude from menu but include in routing
}

type AppStructureItem<TModule> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>;
```

---

## Providers

### ServiceClientProvider

WebSocket client provider for RPC communication with `@simplysm/service-server`. Wraps `ServiceClient` from `@simplysm/service-client`.

```tsx
import { ServiceClientProvider } from "@simplysm/solid";

<ServiceClientProvider url="ws://localhost:3000">
  <App />
</ServiceClientProvider>
```

### SharedDataProvider

Shared data provider for managing server-side data subscriptions. Works with `ServiceClientProvider` to provide reactive shared data across components.

```tsx
import { SharedDataProvider, SharedDataChangeEvent } from "@simplysm/solid";

<SharedDataProvider>
  <App />
</SharedDataProvider>
```

---

## Directives

### ripple

Material Design ripple effect directive. Displays ripple effect on click.

```tsx
import { ripple } from "@simplysm/solid";
// Keep reference to register directive
void ripple;

<button use:ripple={true}>Click</button>
<button use:ripple={!props.disabled}>Conditional activation</button>
```

- Creates internal ripple container, operates without affecting parent element
- Automatically disabled when `prefers-reduced-motion: reduce` is set
- Single ripple mode: removes previous ripple on new click

---

## Tailwind Theme

`@simplysm/solid` provides the following custom themes via Tailwind CSS preset.

### Semantic Colors

| Name | Base Color | Usage |
|------|------------|-------|
| `primary` | blue | Primary actions |
| `info` | sky | Information |
| `success` | green | Success |
| `warning` | amber | Warning |
| `danger` | red | Danger/error |
| `base` | zinc | Neutral (backgrounds, borders, secondary text, etc.) |

> Use `base-*` instead of directly using `zinc-*`.

### Custom Sizes

| Class | Description |
|-------|-------------|
| `h-field` / `size-field` | Default field height (based on `py-1`) |
| `h-field-sm` / `size-field-sm` | Small field height (based on `py-0.5`) |
| `h-field-lg` / `size-field-lg` | Large field height (based on `py-2`) |
| `h-field-inset` / `size-field-inset` | Inset field height (excludes border) |
| `h-field-inset-sm` / `size-field-inset-sm` | Small inset field height |
| `h-field-inset-lg` / `size-field-inset-lg` | Large inset field height |

### z-index Layers

| Class | Value | Description |
|-------|-------|-------------|
| `z-sidebar` | 100 | Sidebar |
| `z-sidebar-backdrop` | 99 | Sidebar backdrop |
| `z-busy` | 500 | Loading overlay |
| `z-dropdown` | 1000 | Dropdown popup |
| `z-modal-backdrop` | 1999 | Modal backdrop |
| `z-modal` | 2000 | Modal dialog |

### Dark Mode

Uses Tailwind's `class` strategy. `InitializeProvider` automatically toggles the `dark` class on the `<html>` element via the built-in theme provider.

```html
<!-- Light mode -->
<html>
<!-- Dark mode -->
<html class="dark">
```

### Styling Patterns

When using Tailwind classes in components, group them by semantic units with `clsx` and resolve conflicts with `twMerge`:

```typescript
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const baseClass = clsx(
  "inline-flex items-center",
  "px-2 py-1",
  "rounded",
  "border border-transparent",
);

const className = twMerge(baseClass, props.class);
```

---

## Helpers

### mergeStyles

Utility for merging inline style strings and `JSX.CSSProperties` objects.

```typescript
import { mergeStyles } from "@simplysm/solid";

const style = mergeStyles("color: red", { fontSize: "14px" }, props.style);
```

### splitSlots

Utility for splitting children into named slots based on component type.

```typescript
import { splitSlots } from "@simplysm/solid";

const slots = splitSlots(props.children, {
  header: HeaderComponent,
  footer: FooterComponent,
});
// slots.header, slots.footer, slots.rest
```

---

## Demo

Check out real-world usage examples of all components in the `solid-demo` package:

```bash
pnpm dev
# http://localhost:40081 (port may vary)
```

---

## License

Apache-2.0
