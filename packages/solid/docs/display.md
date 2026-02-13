# Display Components

## Card

Container with shadow effect.

```tsx
import { Card } from "@simplysm/solid";

<Card>Card content</Card>
<Card class="p-4">Card with padding</Card>
```

---

## Tag

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

## Alert

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

## Icon

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

## Progress

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

## Barcode

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

## Echarts

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
