# Visual Components

## `SdLabelControl`

Colored label/badge component.

Selector: `sd-label`

| Input | Type | Description |
|-------|------|-------------|
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Background color theme |
| `color` | `string` | Custom background color (CSS value) |
| `clickable` | `boolean` (booleanAttribute) | Enable hover/cursor effects (default: `false`) |

## `SdNoteControl`

Note/callout block with themed background.

Selector: `sd-note`

| Input | Type | Description |
|-------|------|-------------|
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Background color theme |
| `size` | `"sm" \| "lg"` | Size variant |
| `inset` | `boolean` (booleanAttribute) | Remove border-radius (default: `false`) |

## `SdProgressControl`

Progress bar with percentage display.

Selector: `sd-progress`

| Input | Type | Description |
|-------|------|-------------|
| `theme` | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` (required) | Bar color theme |
| `value` | `number` (required) | Progress value (0 to 1) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `size` | `"sm" \| "lg"` | Size variant |

## `SdCalendarControl`

Monthly calendar grid that displays items on their respective dates.

Selector: `sd-calendar`

| Input | Type | Description |
|-------|------|-------------|
| `items` | `T[]` (required) | Data items to display |
| `getItemDateFn` | `(item: T, index: number) => DateOnly` (required) | Function to extract date from each item |
| `yearMonth` | `DateOnly` | Year-month to display (default: current month, day set to 1) |
| `weekStartDay` | `number` | Week start day, 0=Sunday (default: `0`) |
| `minDaysInFirstWeek` | `number` | Minimum days in the first week (default: `1`) |

Content children:
- `SdItemOfTemplateDirective` template (required): Template for rendering each item. Context: `SdItemOfTemplateContext<T>`

## `SdBarcodeControl`

Barcode and QR code renderer using bwip-js. Renders SVG output.

Selector: `sd-barcode`

| Input | Type | Description |
|-------|------|-------------|
| `type` | `TBarcodeType` (required) | Barcode symbology type |
| `value` | `string` | Barcode data value |

### `TBarcodeType`

Extensive union type of barcode symbologies supported by bwip-js. Includes common types:

- 1D: `"code128"`, `"code39"`, `"ean13"`, `"ean8"`, `"upca"`, `"upce"`, `"interleaved2of5"`, `"itf14"`, `"isbn"`, `"issn"`, `"pharmacode"`, etc.
- 2D: `"qrcode"`, `"datamatrix"`, `"azteccode"`, `"pdf417"`, `"maxicode"`, `"dotcode"`, `"hanxin"`, `"microqrcode"`, etc.
- GS1: `"gs1-128"`, `"gs1datamatrix"`, `"gs1qrcode"`, etc.
- Postal: `"postnet"`, `"royalmail"`, `"japanpost"`, `"onecode"`, etc.

Full list: `"auspost" | "azteccode" | "azteccodecompact" | "aztecrune" | "bc412" | "channelcode" | "codablockf" | "code11" | "code128" | "code16k" | "code2of5" | "code32" | "code39" | "code39ext" | "code49" | "code93" | "code93ext" | "codeone" | "coop2of5" | "daft" | "databarexpanded" | "databarexpandedcomposite" | "databarexpandedstacked" | "databarexpandedstackedcomposite" | "databarlimited" | "databarlimitedcomposite" | "databaromni" | "databaromnicomposite" | "databarstacked" | "databarstackedcomposite" | "databarstackedomni" | "databarstackedomnicomposite" | "databartruncated" | "databartruncatedcomposite" | "datalogic2of5" | "datamatrix" | "datamatrixrectangular" | "datamatrixrectangularextension" | "dotcode" | "ean13" | "ean13composite" | "ean14" | "ean2" | "ean5" | "ean8" | "ean8composite" | "flattermarken" | "gs1-128" | "gs1-128composite" | "gs1-cc" | "gs1datamatrix" | "gs1datamatrixrectangular" | "gs1dldatamatrix" | "gs1dlqrcode" | "gs1dotcode" | "gs1northamericancoupon" | "gs1qrcode" | "hanxin" | ... | "upce" | "upcecomposite"`

## `SdEchartsControl`

Apache ECharts wrapper component. Renders charts using SVG renderer with automatic resize handling.

Selector: `sd-echarts`

| Input | Type | Description |
|-------|------|-------------|
| `option` | `echarts.EChartsOption` (required) | ECharts configuration option |
| `notMerge` | `boolean` | Whether to replace (not merge) options (default: `false`) |
| `loading` | `boolean` | Show loading indicator (default: `false`) |
