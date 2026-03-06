# Display

Visual presentation components for rendering data, media, and decorative elements.

---

## `Barcode`

Renders a barcode using the bwip-js library.

```tsx
import { Barcode } from "@simplysm/solid";

<Barcode type="code128" value="ABC-1234" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `type` | `BarcodeType` | Barcode format (e.g., `"code128"`, `"qrcode"`, `"ean13"`, ...) |
| `value` | `string \| undefined` | Barcode data |

`BarcodeType` is a string union of all supported bwip-js symbology names.

---

## `Card`

White surface card with shadow and hover animation.

```tsx
import { Card } from "@simplysm/solid";

<Card>Card content</Card>
```

Extends `JSX.HTMLAttributes<HTMLDivElement>`.

---

## `Echarts`

Apache ECharts chart with lazy loading and auto-resize. Requires `echarts` peer dependency.

```tsx
import { Echarts } from "@simplysm/solid";

<Echarts option={chartOption} busy={loading} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `option` | `EChartsOption` | ECharts configuration object |
| `busy` | `boolean` | Shows loading overlay |

---

## `Icon`

Renders a Tabler icon SVG.

```tsx
import { Icon } from "@simplysm/solid";
import { IconHome } from "@tabler/icons-solidjs";

<Icon icon={IconHome} size={20} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `Component<TablerIconProps>` | Icon component from `@tabler/icons-solidjs` |
| `size` | `string \| number` | Icon size |

---

## `Tag`

Inline badge/tag with semantic color theming.

```tsx
import { Tag } from "@simplysm/solid";

<Tag theme="success">Active</Tag>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme |

---

## `Link`

Styled anchor/button element with theme and disabled support.

```tsx
import { Link } from "@simplysm/solid";

<Link theme="primary" href="/dashboard">Go to Dashboard</Link>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme (default: `"primary"`) |
| `disabled` | `boolean` | Disabled state |

Extends `JSX.AnchorHTMLAttributes<HTMLAnchorElement>`.

---

## `Alert`

Styled alert/callout block.

```tsx
import { Alert } from "@simplysm/solid";

<Alert theme="warning">Something needs your attention.</Alert>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme (default: `"base"`) |
