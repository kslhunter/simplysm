# Form Components

## `SdButtonControl`

Themed button with ripple effect.

Selector: `sd-button`

| Input | Type | Description |
|-------|------|-------------|
| `type` | `"button" \| "submit"` | Button type (default: `"button"`) |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray" \| "link" \| "link-primary" \| "link-secondary" \| "link-info" \| "link-success" \| "link-warning" \| "link-danger" \| "link-gray" \| "link-blue-gray" \| "link-rev"` | Visual theme |
| `inline` | `boolean` (booleanAttribute) | Inline display (default: `false`) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `size` | `"sm" \| "lg"` | Size variant |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `buttonStyle` | `string` | Inline style for the inner button |
| `buttonClass` | `string` | CSS class for the inner button |

## `SdAnchorControl`

Inline clickable anchor element with theme coloring and hover underline.

Selector: `sd-anchor`

| Input | Type | Description |
|-------|------|-------------|
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Color theme (default: `"primary"`) |

## `SdAdditionalButtonControl`

Content area with adjacent action buttons (anchors or buttons projected via content).

Selector: `sd-additional-button`

| Input | Type | Description |
|-------|------|-------------|
| `size` | `"sm" \| "lg"` | Size variant |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |

## `SdModalSelectButtonControl`

Button that opens a modal for item selection. Supports single/multi mode with erase functionality.

Selector: `sd-modal-select-button`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `selectMode` | `"single" \| "multi"` | Selection mode (default: `"single"`) |
| `value` (model) | `TSelectModeValue<any>` | Selected value(s) |
| `selectedItems` (model) | `Record<string, unknown>[]` | Selected item records (default: `[]`) |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |
| `modal` | `TSdSelectModalInfo<any>` | Modal info for opening selection modal |
| `modalOptions` | `ISdModalOptions` | Modal display options |
| `size` | `"sm" \| "lg"` | Size variant |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |

### `ISdSelectModal`

| Field | Type | Description |
|-------|------|-------------|
| `selectMode` | `InputSignal<"single" \| "multi">` | Selection mode input |
| `selectedItemKeys` | `InputSignal<T[]>` | Currently selected keys input |

Extends `ISdModal<ISelectModalOutputResult<T>>`.

### `ISelectModalOutputResult`

| Field | Type | Description |
|-------|------|-------------|
| `selectedItemKeys` | `T[]` | Selected item keys |
| `selectedItems` | `Record<string, unknown>[]` | Selected item records |

### `TSdSelectModalInfo`

```typescript
type TSdSelectModalInfo<T extends ISdSelectModal<any>> = Omit<ISdModalInfo<T>, "inputs"> & {
  inputs: Omit<TDirectiveInputSignals<T>, "initialized" | "close" | "actionTplRef" | "selectMode" | "selectedItemKeys">;
};
```

## `SdTextfieldControl`

Text/number/date/time input field with inset/readonly/disabled modes.

Selector: `sd-textfield`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `TSdTextfieldTypes[K]` | Current value |
| `type` | `K` (required) | Input type key |
| `placeholder` | `string` | Placeholder text |
| `title` | `string` | Title attribute |
| `inputStyle` | `string` | Inline style for the input element |
| `inputClass` | `string` | CSS class for the input element |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `readonly` | `boolean` (booleanAttribute) | Read-only state (default: `false`) |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |
| `min` | `TSdTextfieldTypes[K]` | Minimum value |
| `max` | `TSdTextfieldTypes[K]` | Maximum value |
| `format` | `string` | Display format pattern |
| `step` | `number` | Step increment |
| `autocomplete` | `string` | Autocomplete attribute |
| `inline` | `boolean` (booleanAttribute) | Inline display (default: `false`) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `size` | `"sm" \| "lg"` | Size variant |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Background theme |

### `TSdTextfieldTypes`

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

### `sdTextfieldTypes`

```typescript
const sdTextfieldTypes: (keyof TSdTextfieldTypes)[];
```

## `SdTextareaControl`

Multi-line text input with inset/readonly/disabled modes.

Selector: `sd-textarea`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `string` | Current text value |
| `placeholder` | `string` | Placeholder text |
| `title` | `string` | Title attribute |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `readonly` | `boolean` (booleanAttribute) | Read-only state (default: `false`) |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |
| `inline` | `boolean` (booleanAttribute) | Inline display (default: `false`) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `size` | `"sm" \| "lg"` | Size variant |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Background theme |
| `inputStyle` | `string` | Inline style for the textarea |
| `inputClass` | `string` | CSS class for the textarea |

## `SdNumpadControl`

On-screen numeric keypad for number input.

Selector: `sd-numpad`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `number` | Current numeric value |
| `placeholder` | `string` | Placeholder text |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |
| `inputDisabled` | `boolean` (booleanAttribute) | Disable text input (default: `false`) |
| `useEnterButton` | `boolean` (booleanAttribute) | Show enter button (default: `false`) |
| `useMinusButton` | `boolean` (booleanAttribute) | Show minus button (default: `false`) |

| Output | Type | Description |
|--------|------|-------------|
| `enterButtonClick` | `void` | Emitted when enter button is clicked |

## `SdRangeControl`

From-to range input pair using two `SdTextfieldControl` instances.

Selector: `sd-range`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `type` | `K` (required) | Textfield type key |
| `from` (model) | `TSdTextfieldTypes[K]` | Start value |
| `to` (model) | `TSdTextfieldTypes[K]` | End value |
| `inputStyle` | `string` | Inline style for both inputs |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |

## `SdDateRangePicker`

Date range picker with period type selector (day/month/range).

Selector: `sd-date-range-picker`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `periodType` (model) | `"day" \| "month" \| "range"` | Period type (default: `"range"`) |
| `from` (model) | `DateOnly` | Start date |
| `to` (model) | `DateOnly` | End date |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |

Note: Period type labels are in Korean: "일" (day), "월" (month), "범위" (range).

## `SdCheckboxControl`

Checkbox with optional radio mode, ripple effect, and model hook guard.

Selector: `sd-checkbox`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `boolean` | Checked state (default: `false`) |
| `canChangeFn` | `(item: boolean) => boolean \| Promise<boolean>` | Guard function before change (default: `() => true`) |
| `icon` | `string` | Check icon SVG (default: tabler check icon) |
| `radio` | `boolean` (booleanAttribute) | Radio mode -- can only set to true (default: `false`) |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `size` | `"sm" \| "lg"` | Size variant |
| `inline` | `boolean` (booleanAttribute) | Inline display (default: `false`) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray" \| "white"` | Color theme |
| `contentStyle` | `string` | Inline style for content area |

## `SdSwitchControl`

Toggle switch component.

Selector: `sd-switch`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `boolean` | On/off state (default: `false`) |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `inline` | `boolean` (booleanAttribute) | Inline display (default: `false`) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `size` | `"sm" \| "lg"` | Size variant |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Color theme |

## `SdCheckboxGroupControl`

Group container for checkbox items. Manages a multi-select value array.

Selector: `sd-checkbox-group`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `T[]` | Selected values (default: `[]`) |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |

## `SdCheckboxGroupItemControl`

Individual item in a checkbox group. Toggles its value in the parent group's array.

Selector: `sd-checkbox-group-item`

| Input | Type | Description |
|-------|------|-------------|
| `value` | `T` (required) | Item value |
| `inline` | `boolean` (booleanAttribute) | Inline display (default: `false`) |

## `SdSelectControl`

Dropdown select supporting single and multi selection modes with dropdown popup.

Selector: `sd-select`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `selectMode` | `"single" \| "multi"` | Selection mode (default: `"single"`) |
| `value` (model) | `TSelectModeValue<T>` | Selected value(s) |
| `placeholder` | `string` | Placeholder text |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `inline` | `boolean` (booleanAttribute) | Inline display (default: `false`) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `size` | `"sm" \| "lg"` | Size variant |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |
| `hideSelectAll` | `boolean` (booleanAttribute) | Hide select/deselect all bar in multi mode (default: `false`) |
| `multiSelectionDisplayDirection` | `"vertical"` | Display direction for multi selections |
| `items` | `T[]` | Items for itemOf template rendering |
| `getChildrenFn` | `(item: T) => T[] \| undefined` | Children accessor for tree items |
| `contentClass` | `string` | CSS class for the content area |
| `contentStyle` | `string` | Inline style for the content area |

### `TSelectModeValue`

```typescript
type TSelectModeValue<T> = T | T[] | undefined;
```

## `SdSelectItemControl`

Item inside `SdSelectControl`. Renders content and handles click/keyboard selection.

Selector: `sd-select-item`

| Input | Type | Description |
|-------|------|-------------|
| `value` | `T` (required) | Item value |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `hidden` | `boolean` (booleanAttribute) | Hidden state (default: `false`) |

## `SdSelectButtonControl`

Additional button slot rendered inline next to the select dropdown trigger. Has ripple effect.

Selector: `sd-select-button`

No inputs.

## `SdTiptapEditorControl`

Rich text editor powered by Tiptap. Includes toolbar with formatting commands (headings, bold, italic, underline, strike, colors, lists, alignment, links, images, tables).

Selector: `sd-tiptap-editor`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `string` | HTML content |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |
| `readonly` | `boolean` (booleanAttribute) | Read-only state (default: `false`) |
| `required` | `boolean` (booleanAttribute) | Required validation (default: `false`) |
| `placeholder` | `string` | Placeholder text |
| `validatorFn` | `(value: string \| undefined) => string \| undefined` | Custom validation function |
| `extensions` | `AnyExtension[]` | Additional Tiptap extensions |

## `SdStatePresetControl`

Save and load named state presets. Persists presets via system config.

Selector: `sd-state-preset`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `key` | `string` (required) | Config key for preset storage |
| `state` (model) | `any` | Current state to save/restore |
| `size` | `"sm" \| "lg"` | Size variant |

### `ISdStatePreset`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Preset display name |
| `state` | `any` | Stored state value |

## `SdFormControl`

Form wrapper with submit handling and validation. Prevents default form submission, validates, and emits appropriate events.

Selector: `sd-form`

| Output | Type | Description |
|--------|------|-------------|
| `formSubmit` | `SubmitEvent` | Emitted on valid form submission |
| `formInvalid` | `void` | Emitted when form validation fails |

Public methods:

```typescript
requestSubmit(): void;  // Programmatically trigger form submission
```
