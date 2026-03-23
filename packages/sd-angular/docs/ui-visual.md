# UI - Visual Components

## SdBarcodeControl

**Type:** `@Component` | **Selector:** `sd-barcode`

Renders a barcode as inline SVG using the `bwip-js` library. Supports 100+ barcode formats.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `TBarcodeType` | Yes | -- | Barcode format (e.g., `"code128"`, `"qrcode"`, `"ean13"`) |
| `value` | `string` | No | -- | Barcode data to encode |

Supported barcode types include: `auspost`, `azteccode`, `azteccodecompact`, `code128`, `code39`, `code93`, `datamatrix`, `ean13`, `ean8`, `gs1-128`, `interleaved2of5`, `isbn`, `itf14`, `maxicode`, `micropdf417`, `pdf417`, `qrcode`, `upca`, `upce`, and many more.

---

## SdCalendarControl

**Type:** `@Component` | **Selector:** `sd-calendar`

Calendar view that displays items on their corresponding dates. Supports navigation between months.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `items` | `T[]` | Yes | -- | Items to display on the calendar |
| `getItemDateFn` | `(item: T, index: number) => DateOnly` | Yes | -- | Function to extract date from item |
| `yearMonth` | `DateOnly` | No | Current month (1st day) | Displayed year/month |
| `weekStartDay` | `number` | No | `0` | First day of week (0 = Sunday, 1 = Monday, etc.) |
| `minDaysInFirstWeek` | `number` | No | `1` | Minimum days in the first week |

---

## SdEchartsControl

**Type:** `@Component` | **Selector:** `sd-echarts`

Apache ECharts wrapper component. Automatically resizes the chart when the container size changes.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `option` | `echarts.EChartsOption` | Yes | -- | ECharts configuration object |
| `loading` | `boolean` | No | `false` | Show loading animation |

---

## SdLabelControl

**Type:** `@Component` | **Selector:** `sd-label`

Themed inline text label with optional click state.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | No | -- | Color theme |
| `color` | `string` | No | -- | Custom CSS color value |
| `clickable` | `boolean \| ""` | No | `false` | Show pointer cursor |

---

## SdNoteControl

**Type:** `@Component` | **Selector:** `sd-note`

Themed note/alert box for displaying informational, warning, or error messages.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | No | -- | Color theme |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `inset` | `boolean \| ""` | No | `false` | Inset style (no outer border) |

---

## SdProgressControl

**Type:** `@Component` | **Selector:** `sd-progress`

Progress bar with theme and size support.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Yes | -- | Color theme |
| `value` | `number` | Yes | -- | Progress percentage (0-100) |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
