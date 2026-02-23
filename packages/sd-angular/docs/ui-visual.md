# UI: Visual Components

## SdBarcodeControl

Renders a barcode as inline SVG using the `bwip-js` library.

**Selector:** `sd-barcode`

```html
<sd-barcode [type]="'code128'" [value]="item.barcode" />
```

**Inputs:**

| Input   | Type                      | Description     |
| ------- | ------------------------- | --------------- |
| `type`  | `TBarcodeType` (required) | Barcode format  |
| `value` | `string`                  | Value to encode |

Common `TBarcodeType` values: `"code128"`, `"qrcode"`, `"ean13"`, `"pdf417"`, `"azteccode"`, `"datamatrix"`. See full type for all options.

---

## SdCalendarControl

Renders a monthly calendar grid. Each cell shows all items whose date matches that day, rendered via a required item template.

**Selector:** `sd-calendar`

```html
<sd-calendar
  [items]="events()"
  [getItemDateFn]="getEventDate"
  [yearMonth]="selectedMonth()"
  [weekStartDay]="1"
>
  <ng-template [itemOf]="events()" let-event>
    <sd-label [theme]="'primary'">{{ event.title }}</sd-label>
  </ng-template>
</sd-calendar>
```

```typescript
getEventDate = (item: IEvent, index: number): DateOnly => item.date;
```

**Inputs:**

| Input                | Type                                              | Default               | Description                              |
| -------------------- | ------------------------------------------------- | --------------------- | ---------------------------------------- |
| `items`              | `T[]` (required)                                  | —                     | Data items to display in cells           |
| `getItemDateFn`      | `(item: T, index: number) => DateOnly` (required) | —                     | Returns the date for each item           |
| `yearMonth`          | `DateOnly`                                        | current month (day=1) | Month to display                         |
| `weekStartDay`       | `number`                                          | `0`                   | 0=Sunday, 1=Monday                       |
| `minDaysInFirstWeek` | `number`                                          | `1`                   | Minimum days in the first displayed week |

**Content projection:** `ng-template[itemOf]` (required) — cell template for each item (`T`). Uses `SdItemOfTemplateDirective` context.

---

## SdEchartsControl

Renders an Apache ECharts chart. Automatically resizes when the container changes size.

**Selector:** `sd-echarts`

```html
<sd-echarts [option]="chartOption()" [loading]="isLoading()" style="height: 300px;" />
```

**Inputs:**

| Input     | Type                               | Description                     |
| --------- | ---------------------------------- | ------------------------------- |
| `option`  | `echarts.EChartsOption` (required) | ECharts option object           |
| `loading` | `boolean`                          | Show built-in loading indicator |

Uses SVG renderer.

---

## SdLabelControl

A colored badge/label element.

**Selector:** `sd-label`

```html
<sd-label [theme]="'success'">Active</sd-label>
<sd-label [theme]="'danger'" [clickable]="true" (click)="removeTag()">Remove</sd-label>
<sd-label [color]="'#ff6600'">Custom</sd-label>
```

**Inputs:**

| Input       | Type                                                                                                | Description             |
| ----------- | --------------------------------------------------------------------------------------------------- | ----------------------- |
| `theme`     | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Color theme             |
| `color`     | `string`                                                                                            | Custom background color |
| `clickable` | `boolean`                                                                                           | Pointer cursor + hover  |

---

## SdNoteControl

A styled note/callout block.

**Selector:** `sd-note`

```html
<sd-note [theme]="'warning'">Changes will take effect on next login.</sd-note>
```

**Inputs:**

| Input   | Type                                                                                                | Default | Description      |
| ------- | --------------------------------------------------------------------------------------------------- | ------- | ---------------- |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | —       | Color theme      |
| `size`  | `"sm" \| "lg"`                                                                                      | —       | Size variant     |
| `inset` | `boolean`                                                                                           | `false` | Borderless style |

---

## SdProgressControl

A percentage progress bar.

**Selector:** `sd-progress`

```html
<sd-progress [theme]="'primary'" [value]="0.75" />
<sd-progress [theme]="'success'" [value]="completionRate()" [size]="'sm'" />
```

**Inputs:**

| Input   | Type                                                                                                           | Description              |
| ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` (required) | Color theme              |
| `value` | `number` (required)                                                                                            | Value 0.0–1.0 (fraction) |
| `size`  | `"sm" \| "lg"`                                                                                                 | Size variant             |
| `inset` | `boolean`                                                                                                      | Borderless style         |

The value is displayed as a percentage (e.g., `0.75` → `75.00%`).
