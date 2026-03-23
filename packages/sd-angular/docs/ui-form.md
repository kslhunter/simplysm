# UI - Form Components

## Buttons

### SdAdditionalButtonControl

**Type:** `@Component` | **Selector:** `sd-additional-button`

A button with an additional inline action area, used to combine a display value with action buttons (e.g., clear and search buttons in select components).

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `inset` | `boolean \| ""` | No | `false` | Inset style (no outer border) |

---

### SdAnchorControl

**Type:** `@Component` | **Selector:** `sd-anchor`

Styled anchor/link element with theme support. Adds cursor pointer and optional disabled state.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `disabled` | `boolean \| ""` | No | `false` | Disable the anchor |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "link-primary" \| "link-secondary" \| "link-info" \| "link-success" \| "link-warning" \| "link-danger"` | No | -- | Color theme |

---

### SdButtonControl

**Type:** `@Component` | **Selector:** `sd-button`

Standard button with theme, size variants, inline/inset modes, and ripple effect.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"button" \| "submit"` | No | `"button"` | HTML button type |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "link-primary" \| "link-secondary" \| "link-info" \| "link-success" \| "link-warning" \| "link-danger"` | No | -- | Color theme |
| `inline` | `boolean \| ""` | No | `false` | Inline display |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `disabled` | `boolean \| ""` | No | `false` | Disable the button |
| `buttonStyle` | `string` | No | -- | CSS style for the inner button |
| `buttonClass` | `string` | No | -- | CSS class for the inner button |

---

### SdModalSelectButtonControl

**Type:** `@Component` | **Selector:** `sd-modal-select-button`

Button that opens a modal for value selection. Supports single/multi selection modes.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `modal` | `TSdSelectModalInfo<ISdSelectModal<T>>` | Yes | -- | Modal configuration |
| `disabled` | `boolean \| ""` | No | `false` | Disable the button |
| `required` | `boolean \| ""` | No | `false` | Mark as required |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `selectMode` | `"single" \| "multi"` | No | `"single"` | Selection mode |
| `searchIcon` | `string` | No | `tablerSearch` | Icon for search button |

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `TSelectModeValue<K>[M]` | Selected value(s) |
| `selectedItems` | `T[]` | Selected item objects |

---

## Choice Controls

### SdCheckboxControl

**Type:** `@Component` | **Selector:** `sd-checkbox`

Checkbox with icon, theme, size, and radio mode support.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `canChangeFn` | `(item: boolean) => boolean \| Promise<boolean>` | No | `() => true` | Guard before value change |
| `icon` | `string` | No | `tablerCheck` | Check mark icon |
| `radio` | `boolean \| ""` | No | `false` | Radio button style (round) |
| `disabled` | `boolean \| ""` | No | `false` | Disable the checkbox |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `inline` | `boolean \| ""` | No | `false` | Inline display |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | No | -- | Color theme |
| `contentStyle` | `string` | No | -- | CSS style for content area |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `boolean` | `false` | Checked state |

---

### SdCheckboxGroupControl

**Type:** `@Component` | **Selector:** `sd-checkbox-group`

Container for checkbox group items. Manages an array of selected values.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `disabled` | `boolean \| ""` | No | `false` | Disable all checkboxes |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `T[]` | `[]` | Selected values array |

---

### SdCheckboxGroupItemControl

**Type:** `@Component` | **Selector:** `sd-checkbox-group-item`

Individual item within a checkbox group.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `T` | Yes | -- | Value this item represents |
| `inline` | `boolean \| ""` | No | `false` | Inline display |

---

### SdStatePresetControl

**Type:** `@Component` | **Selector:** `sd-state-preset`

Save and load named state presets (e.g., filter configurations). Persists presets to system config.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `key` | `string` | Yes | -- | Unique key for preset storage |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `state` | `any` | The current state to save/load |

---

### SdSwitchControl

**Type:** `@Component` | **Selector:** `sd-switch`

Toggle switch control.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `disabled` | `boolean \| ""` | No | `false` | Disable the switch |
| `inline` | `boolean \| ""` | No | `false` | Inline display |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | No | -- | Color theme |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `boolean` | `false` | Toggle state |

---

## Editor

### SdQuillEditorControl

**Type:** `@Component` | **Selector:** `sd-quill-editor`

Rich text editor based on Quill.js.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `disabled` | `boolean \| ""` | No | `false` | Disable editing |

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `string` | HTML content |

---

## Input Controls

### SdDateRangePicker

**Type:** `@Component` | **Selector:** `sd-date-range-picker`

Date range picker with configurable period types.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `required` | `boolean \| ""` | No | `false` | Mark as required |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `periodType` | `"day" \| "month" \| "range"` | `"range"` | Period selection mode |
| `from` | `DateOnly` | -- | Start date |
| `to` | `DateOnly` | -- | End date |

---

### SdNumpadControl

**Type:** `@Component` | **Selector:** `sd-numpad`

Numeric keypad for touch-friendly number input.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `placeholder` | `string` | No | -- | Placeholder text |
| `required` | `boolean \| ""` | No | `false` | Mark as required |
| `inputDisabled` | `boolean \| ""` | No | `false` | Disable direct input |
| `useEnterButton` | `boolean \| ""` | No | `false` | Show enter button |
| `useMinusButton` | `boolean \| ""` | No | `false` | Show minus/negative button |

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `number` | Numeric value |

#### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `enterButtonClick` | `OutputEmitterRef<void>` | Enter button clicked |

---

### SdRangeControl

**Type:** `@Component` | **Selector:** `sd-range`

From-to range input using two `SdTextfieldControl` instances.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `K extends keyof TSdTextfieldTypes` | Yes | -- | Input type |
| `inputStyle` | `string` | No | -- | CSS style for inputs |
| `required` | `boolean \| ""` | No | `false` | Mark as required |
| `disabled` | `boolean \| ""` | No | `false` | Disable both inputs |

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `from` | `TSdTextfieldTypes[K]` | Start value |
| `to` | `TSdTextfieldTypes[K]` | End value |

---

### SdTextareaControl

**Type:** `@Component` | **Selector:** `sd-textarea`

Auto-growing textarea with validation and theme support.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `placeholder` | `string` | No | -- | Placeholder text |
| `title` | `string` | No | -- | Title attribute |
| `minRows` | `number` | No | `1` | Minimum visible rows |
| `disabled` | `boolean \| ""` | No | `false` | Disable editing |
| `readonly` | `boolean \| ""` | No | `false` | Read-only mode |
| `required` | `boolean \| ""` | No | `false` | Mark as required |
| `inline` | `boolean \| ""` | No | `false` | Inline display |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `validatorFn` | `(value: string \| undefined) => string \| undefined` | No | -- | Custom validator |
| `theme` | `"primary" \| "secondary" \| ...` | No | -- | Color theme |
| `inputStyle` | `string` | No | -- | CSS style for input element |
| `inputClass` | `string` | No | -- | CSS class for input element |

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `string` | Text content |

---

### SdTextfieldControl

**Type:** `@Component` | **Selector:** `sd-textfield`

Typed text input supporting multiple data types: text, number, date, time, datetime, password, color, email, and formatted input.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `K extends keyof TSdTextfieldTypes` | Yes | -- | Input type |
| `placeholder` | `string` | No | -- | Placeholder text |
| `title` | `string` | No | -- | Title attribute |
| `inputStyle` | `string` | No | -- | CSS style for input |
| `inputClass` | `string` | No | -- | CSS class for input |
| `disabled` | `boolean \| ""` | No | `false` | Disable editing |
| `readonly` | `boolean \| ""` | No | `false` | Read-only mode |
| `required` | `boolean \| ""` | No | `false` | Mark as required |
| `min` | `TSdTextfieldTypes[K]` | No | -- | Minimum value |
| `max` | `TSdTextfieldTypes[K]` | No | -- | Maximum value |
| `minlength` | `number` | No | -- | Minimum length |
| `maxlength` | `number` | No | -- | Maximum length |
| `pattern` | `string` | No | -- | Validation pattern |
| `validatorFn` | `(value) => string \| undefined` | No | -- | Custom validator |
| `format` | `string` | No | -- | Display format pattern |
| `step` | `number` | No | -- | Numeric step value |
| `autocomplete` | `string` | No | -- | Autocomplete attribute |
| `useNumberComma` | `boolean \| ""` | No | `true` | Format numbers with commas |
| `minDigits` | `number` | No | -- | Minimum decimal digits |
| `inline` | `boolean \| ""` | No | `false` | Inline display |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `theme` | `"primary" \| "secondary" \| ...` | No | -- | Color theme |

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `TSdTextfieldTypes[K]` | Input value |

#### TSdTextfieldTypes

```typescript
type TSdTextfieldTypes = {
  number: number;
  text: string;
  password: string;
  color: string;
  email: string;
  format: string;
  date: DateOnly;
  month: DateOnly;
  year: DateOnly;
  datetime: DateTime;
  time: Time;
};
```

---

## Form

### SdFormControl

**Type:** `@Component` | **Selector:** `sd-form`

Form wrapper that handles native form submission and validation.

#### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `submit` | `OutputEmitterRef<SubmitEvent>` | Form submitted (validation passed) |
| `invalid` | `OutputEmitterRef<void>` | Form validation failed |

---

## Select Controls

### SdSelectControl

**Type:** `@Component` | **Selector:** `sd-select`

Dropdown select with single/multi selection mode, tree support, and search.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `required` | `boolean \| ""` | No | `false` | Mark as required |
| `disabled` | `boolean \| ""` | No | `false` | Disable the control |
| `items` | `T[]` | No | -- | Items for iteration |
| `trackByFn` | `(item: T, index: number) => any` | No | `(item) => item` | Track-by function |
| `getChildrenFn` | `(item, index, depth) => T[]` | No | -- | Tree children accessor |
| `inline` | `boolean \| ""` | No | `false` | Inline display |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `selectMode` | `"single" \| "multi"` | No | `"single"` | Selection mode |
| `contentClass` | `string` | No | -- | CSS class for dropdown |
| `contentStyle` | `string` | No | -- | CSS style for dropdown |
| `multiSelectionDisplayDirection` | `"vertical" \| "horizontal"` | No | -- | Multi-select layout |
| `hideSelectAll` | `boolean \| ""` | No | `false` | Hide "select all" option |
| `placeholder` | `string` | No | -- | Placeholder text |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `TSelectModeValue<any>[M]` | -- | Selected value(s) |
| `open` | `boolean` | `false` | Dropdown open state |

#### TSelectModeValue

```typescript
type TSelectModeValue<T> = {
  multi: T[];
  single: T;
};
```

---

### SdSelectItemControl

**Type:** `@Component` | **Selector:** `sd-select-item`

Individual item within a `SdSelectControl` dropdown.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `any` | No | -- | Value this item represents |
| `disabled` | `boolean \| ""` | No | `false` | Disable this item |
| `hidden` | `boolean \| ""` | No | `false` | Hide this item |

---

### SdSelectButtonControl

**Type:** `@Component` | **Selector:** `sd-select-button`

Button-style display for the selected value within a select control.
