# UI: Form Components

## SdButtonControl

Standard button with theme and size variants, ripple effect, and disabled state.

**Selector:** `sd-button`

```html
<sd-button (click)="save()" [theme]="'primary'" [size]="'sm'">Save</sd-button>
<sd-button [type]="'submit'" [theme]="'info'" [inline]="true">Submit</sd-button>
<sd-button [disabled]="isBusy()" [theme]="'danger'">Delete</sd-button>
```

**Inputs:**

| Input         | Type                                                                                                                                                      | Default    | Description                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------- |
| `type`        | `"button" \| "submit"`                                                                                                                                    | `"button"` | HTML button type                                  |
| `theme`       | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray" \| "link" \| "link-primary" \| "link-*" \| "link-rev"` | —          | Color theme                                       |
| `inline`      | `boolean`                                                                                                                                                 | `false`    | Renders as inline-block                           |
| `inset`       | `boolean`                                                                                                                                                 | `false`    | Borderless inset style                            |
| `size`        | `"sm" \| "lg"`                                                                                                                                            | —          | Size variant                                      |
| `disabled`    | `boolean`                                                                                                                                                 | `false`    | Disabled state                                    |
| `buttonStyle` | `string`                                                                                                                                                  | —          | Additional inline styles for the inner `<button>` |
| `buttonClass` | `string`                                                                                                                                                  | —          | Additional classes for the inner `<button>`       |

---

## SdAnchorControl

Inline clickable anchor element with theme colors. Does not navigate; use with `(click)` handler.

**Selector:** `sd-anchor`

```html
<sd-anchor (click)="openModal()" [theme]="'primary'">Open</sd-anchor>
<sd-anchor [disabled]="!canEdit()">Edit</sd-anchor>
```

**Inputs:**

| Input      | Type                                                                                                | Default     | Description                                     |
| ---------- | --------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| `disabled` | `boolean`                                                                                           | `false`     | Disabled state (opacity + pointer-events: none) |
| `theme`    | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | `"primary"` | Color theme                                     |

---

## SdAdditionalButtonControl

Layout container that puts content on the left and action buttons on the right. Used as the base for select buttons.

**Selector:** `sd-additional-button`

```html
<sd-additional-button [size]="'sm'">
  Selected: Alice
  <sd-anchor [theme]="'danger'" (click)="clear()">X</sd-anchor>
  <sd-button [inset]="true" (click)="openPicker()">...</sd-button>
</sd-additional-button>
```

**Inputs:**

| Input   | Type           | Description      |
| ------- | -------------- | ---------------- |
| `size`  | `"sm" \| "lg"` | Size variant     |
| `inset` | `boolean`      | Borderless style |

---

## SdModalSelectButtonControl

A select button that opens a modal to pick a value. Combines `SdAdditionalButtonControl` with modal integration.

**Selector:** `sd-modal-select-button`

```html
<sd-modal-select-button
  [modal]="{ type: ProductSelectModal, inputs: {} }"
  [(value)]="selectedProductId"
  [required]="true"
>
  {{ selectedProduct()?.name }}
</sd-modal-select-button>
```

**Inputs:**

| Input                   | Type                                    | Description                    |
| ----------------------- | --------------------------------------- | ------------------------------ |
| `modal`                 | `TSdSelectModalInfo<ISdSelectModal<T>>` | Modal configuration (required) |
| `value` (model)         | `TSelectModeValue<K>[M]`                | Selected key(s)                |
| `selectedItems` (model) | `T[]`                                   | Synced selected item objects   |
| `disabled`              | `boolean`                               | Disabled state                 |
| `required`              | `boolean`                               | Required validation            |
| `inset`                 | `boolean`                               | Borderless style               |
| `size`                  | `"sm" \| "lg"`                          | Size variant                   |
| `selectMode`            | `"single" \| "multi"`                   | Selection mode                 |
| `searchIcon`            | `string` (svg icon)                     | Custom search icon             |

---

## SdTextfieldControl

Text input that supports multiple input types with validation, formatting, and readonly display.

**Selector:** `sd-textfield`

```html
<sd-textfield [type]="'text'" [(value)]="name" [placeholder]="'Enter name'" />
<sd-textfield [type]="'number'" [(value)]="age" [required]="true" />
<sd-textfield [type]="'date'" [(value)]="birthday" />
<sd-textfield [type]="'password'" [(value)]="pwd" />
<sd-textfield [type]="'email'" [(value)]="email" [disabled]="true" />
```

**Inputs (key selection):**

| Input                       | Type                                                                                                  | Description                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| `type`                      | `"text" \| "number" \| "password" \| "date" \| "datetime" \| "month" \| "email" \| "color" \| "time"` | Input type                  |
| `value` (model)             | Varies by type                                                                                        | Bound value                 |
| `placeholder`               | `string`                                                                                              | Placeholder text            |
| `disabled`                  | `boolean`                                                                                             | Disabled state              |
| `readonly`                  | `boolean`                                                                                             | Readonly state              |
| `required`                  | `boolean`                                                                                             | Required validation         |
| `min` / `max`               | Varies                                                                                                | Min/max constraints         |
| `inline`                    | `boolean`                                                                                             | Inline display              |
| `inset`                     | `boolean`                                                                                             | Borderless inset style      |
| `size`                      | `"sm" \| "lg"`                                                                                        | Size variant                |
| `inputClass` / `inputStyle` | `string`                                                                                              | Pass-through to `<input>`   |
| `title`                     | `string`                                                                                              | Tooltip text                |
| `autocomplete`              | `string`                                                                                              | HTML autocomplete attribute |

---

## SdTextareaControl

Multi-line text input.

**Selector:** `sd-textarea`

```html
<sd-textarea [(value)]="description" [rows]="5" />
```

**Key inputs:** `value` (model), `placeholder`, `disabled`, `readonly`, `required`, `rows`, `resize`, `inset`, `size`

---

## SdCheckboxControl

Checkbox or radio button with label.

**Selector:** `sd-checkbox`

```html
<sd-checkbox [(value)]="isActive">Active</sd-checkbox>
<sd-checkbox [(value)]="isAdmin" [radio]="true">Admin</sd-checkbox>
<sd-checkbox [inline]="true" [(value)]="agreed">I agree</sd-checkbox>
```

**Inputs:**

| Input           | Type                                                  | Default     | Description                  |
| --------------- | ----------------------------------------------------- | ----------- | ---------------------------- |
| `value` (model) | `boolean`                                             | —           | Checked state                |
| `disabled`      | `boolean`                                             | `false`     | Disabled state               |
| `radio`         | `boolean`                                             | `false`     | Render as radio button style |
| `inline`        | `boolean`                                             | `false`     | Inline display               |
| `inset`         | `boolean`                                             | `false`     | Inset style                  |
| `size`          | `"sm" \| "lg"`                                        | —           | Size variant                 |
| `theme`         | `"primary" \| "secondary" \| ... \| "white"`          | —           | Color theme                  |
| `icon`          | `string`                                              | tablerCheck | Custom check icon            |
| `contentStyle`  | `string`                                              | —           | Style for label content      |
| `canChangeFn`   | `(v: boolean) => boolean \| Promise<boolean>`         | `() => true`| Guard before change          |

---

## SdCheckboxGroupControl and SdCheckboxGroupItemControl

Group of checkbox items bound to an array of values.

**Selectors:** `sd-checkbox-group`, `sd-checkbox-group-item`

```html
<sd-checkbox-group [(value)]="selectedColors">
  <sd-checkbox-group-item [value]="'red'">Red</sd-checkbox-group-item>
  <sd-checkbox-group-item [value]="'blue'">Blue</sd-checkbox-group-item>
</sd-checkbox-group>
```

**SdCheckboxGroupControl inputs:** `value` (model, `T[]`), `disabled`

**SdCheckboxGroupItemControl inputs:** `value: T` (required), `inline`

---

## SdSwitchControl

Toggle switch (on/off).

**Selector:** `sd-switch`

```html
<sd-switch [(value)]="isEnabled" />
<sd-switch [(value)]="isDark" [inset]="true" />
```

**Key inputs:** `value` (model, `boolean`), `disabled`, `inset`, `size`

---

## SdStatePresetControl

Displays a set of named presets that the user can save/load/delete (persisted via `SdSystemConfigProvider`).

**Selector:** `sd-state-preset`

```html
<sd-state-preset [key]="'orders-filter'" [(value)]="filter" />
```

**Key inputs:** `key: string` (required), `value` (model, `T`)

---

## SdSelectControl

Dropdown select with search, multi-select, tree (hierarchical), and custom header/before content.

**Selector:** `sd-select`

```html
<sd-select [(value)]="selectedId" [items]="users()" [trackByFn]="trackUser">
  <ng-template [itemOf]="users()" let-item>
    <sd-select-item [value]="item.id">{{ item.name }}</sd-select-item>
  </ng-template>
</sd-select>

<!-- Multi-select -->
<sd-select [(value)]="selectedIds" [selectMode]="'multi'" [items]="categories()">...</sd-select>
```

**Key inputs:**

| Input                            | Type                         | Description                 |
| -------------------------------- | ---------------------------- | --------------------------- |
| `value` (model)                  | varies by `selectMode`       | Selected value(s)           |
| `items`                          | `T[]`                        | All items                   |
| `trackByFn`                      | `(item: T) => any`           | Track function              |
| `selectMode`                     | `"single" \| "multi"`        | Selection mode              |
| `disabled`                       | `boolean`                    | Disabled state              |
| `required`                       | `boolean`                    | Required validation         |
| `inset`                          | `boolean`                    | Borderless style            |
| `inline`                         | `boolean`                    | Inline display              |
| `size`                           | `"sm" \| "lg"`               | Size variant                |
| `open` (model)                   | `boolean`                    | Dropdown open state         |
| `getChildrenFn`                  | `(item) => T[] \| undefined` | Hierarchical children       |
| `multiSelectionDisplayDirection` | `"vertical" \| "horizontal"` | Multi-select chip direction |
| `contentClass`                   | `string`                     | Dropdown content class      |

**Content projection:**

- `ng-template[itemOf]` — item template (with `SdItemOfTemplateDirective`)
- `ng-template#headerTpl` — header content inside dropdown
- `ng-template#beforeTpl` — content before item list
- `sd-select-button` — action buttons (see below)

**Type `TSelectModeValue<K>`:**

```typescript
type TSelectModeValue<K> = {
  single: K | undefined;
  multi: K[];
};
```

---

## SdSelectItemControl

An item inside `SdSelectControl`.

**Selector:** `sd-select-item`

```html
<sd-select-item [value]="item.id" [hidden]="item.isArchived">{{ item.name }}</sd-select-item>
```

**Inputs:** `value: T` (required), `hidden: boolean`

---

## SdSelectButtonControl

An action button rendered inside `SdSelectControl`.

**Selector:** `sd-select-button`

```html
<sd-select [items]="items">
  <sd-select-button (click)="openModal($event)">...</sd-select-button>
  ...
</sd-select>
```

---

## SdFormControl

Wraps form fields and handles native form submission.

**Selector:** `sd-form`

```html
<sd-form (submit)="onSubmit()">
  <sd-textfield [(value)]="name" [required]="true" />
  <sd-button [type]="'submit'">Submit</sd-button>
</sd-form>
```

**Output:** `(submit)` — fires when native form submission is valid.

**Method:** `requestSubmit()` — programmatically triggers validation and submit.

---

## SdDateRangePicker

Date range picker with period type selection. Supports day, month, and range modes. In "day" mode, `to` is auto-synced to `from`. In "month" mode, `to` is auto-calculated to the end of the month.

**Selector:** `sd-date-range-picker`

```html
<sd-date-range-picker [(from)]="startDate" [(to)]="endDate" [(periodType)]="period" />
```

**Inputs:**

| Input        | Type                                     | Default   | Description               |
| ------------ | ---------------------------------------- | --------- | ------------------------- |
| `periodType` | `"일" \| "월" \| "범위"` (model)          | `"범위"`  | Period selection mode     |
| `from`       | `DateOnly` (model)                       | —         | Start date                |
| `to`         | `DateOnly` (model)                       | —         | End date                  |
| `required`   | `boolean`                                | `false`   | Required validation       |

---

## SdNumpadControl

On-screen numeric keypad for touch input.

**Selector:** `sd-numpad`

```html
<sd-numpad [(value)]="amount" />
```

**Key inputs:** `value` (model, `number | undefined`), `disabled`

---

## SdRangeControl

A from-to range input that renders two `SdTextfieldControl` instances side by side with a `~` separator. The `to` field enforces a minimum value equal to the current `from` value.

**Selector:** `sd-range`

```html
<sd-range [type]="'number'" [(from)]="minPrice" [(to)]="maxPrice" />
<sd-range [type]="'date'" [(from)]="startDate" [(to)]="endDate" [required]="true" />
```

**Inputs:**

| Input        | Type                      | Description                    |
| ------------ | ------------------------- | ------------------------------ |
| `type`       | `keyof TSdTextfieldTypes` | Input type (required)          |
| `from`       | model                     | Start value                    |
| `to`         | model                     | End value (min clamped to from)|
| `inputStyle` | `string`                  | Inline style for both inputs   |
| `required`   | `boolean`                 | Required validation            |
| `disabled`   | `boolean`                 | Disabled state                 |

---

## SdQuillEditorControl

Rich text editor based on Quill.

**Selector:** `sd-quill-editor`

```html
<sd-quill-editor [(value)]="htmlContent" />
```

**Key inputs:** `value` (model, `string | undefined`), `disabled`, `readonly`, `placeholder`
