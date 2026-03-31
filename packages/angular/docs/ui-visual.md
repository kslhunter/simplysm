# UI Visual

Visual display components: labels, notes, progress bars, calendars, barcodes, and charts.

## `SdLabelControl`

Inline badge/tag label.

```typescript
@Component({ selector: "sd-label" })
class SdLabelControl {
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
  color = input<string>();
  clickable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `theme` | theme token \| undefined | — | Predefined color theme |
| `color` | `string \| undefined` | — | Custom CSS background color |
| `clickable` | `boolean` | `false` | Adds hover/cursor styles |

## `SdNoteControl`

Block-level note/callout box.

```typescript
@Component({ selector: "sd-note" })
class SdNoteControl {
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
  size = input<"sm" | "lg">();
  inset = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `theme` | theme token \| undefined | — | Color theme |
| `size` | `"sm" \| "lg" \| undefined` | — | Size variant |
| `inset` | `boolean` | `false` | Removes border-radius |

## `SdProgressControl`

Progress bar with percentage label.

```typescript
@Component({ selector: "sd-progress" })
class SdProgressControl {
  theme = input.required<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
  value = input.required<number>();
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
}
```

| Input | Type | Description |
|-------|------|-------------|
| `theme` | theme token | Color theme (required) |
| `value` | `number` | Progress from `0.0` to `1.0` (required) |
| `inset` | `boolean` | Removes border-radius |
| `size` | `"sm" \| "lg" \| undefined` | Size variant |

## `SdCalendarControl`

Month calendar grid that distributes typed items by date.

```typescript
@Component({ selector: "sd-calendar" })
class SdCalendarControl<T> {
  items = input.required<T[]>();
  getItemDateFn = input.required<(item: T, index: number) => DateOnly>();
  yearMonth = input<DateOnly>(/* first day of current month */);
  weekStartDay = input(0);
  minDaysInFirstWeek = input(1);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `items` | `T[]` | — | Data items (required) |
| `getItemDateFn` | `(item, index) => DateOnly` | — | Maps item to date (required) |
| `yearMonth` | `DateOnly` | current month | Month to display |
| `weekStartDay` | `number` | `0` (Sunday) | First day of week |
| `minDaysInFirstWeek` | `number` | `1` | Min days in first week |

Content template: `SdItemOfTemplateDirective` — template for rendering each item cell.

## `SdBarcodeControl`

Renders a barcode as inline SVG using bwip-js.

```typescript
@Component({ selector: "sd-barcode" })
class SdBarcodeControl {
  type = input.required<TBarcodeType>();
  value = input<string>();
}
```

| Input | Type | Description |
|-------|------|-------------|
| `type` | `TBarcodeType` | Barcode format (required) |
| `value` | `string \| undefined` | Barcode content; empty clears display |

## `TBarcodeType`

Union of ~100 barcode format strings supported by bwip-js.

```typescript
type TBarcodeType = "qrcode" | "code128" | "ean13" | "pdf417" | "datamatrix" | /* ... ~100 more */;
```

## `SdEchartsControl`

Apache ECharts wrapper with auto-resize and SVG renderer.

```typescript
@Component({ selector: "sd-echarts" })
class SdEchartsControl {
  option = input.required<echarts.EChartsOption>();
  notMerge = input(false);
  loading = input(false);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `option` | `echarts.EChartsOption` | — | ECharts configuration (required) |
| `notMerge` | `boolean` | `false` | Whether to replace options instead of merge |
| `loading` | `boolean` | `false` | Shows/hides ECharts loading overlay |
