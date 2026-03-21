# Display Components

Source: `src/components/display/**`

## `Barcode`

Barcode/QR code renderer using bwip-js library.

```ts
interface BarcodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  type: BarcodeType;
  value?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `BarcodeType` | Barcode format to render |
| `value` | `string` | Data to encode |

### `BarcodeType`

Union type of 111 supported barcode format strings including:

```ts
type BarcodeType =
  | "code128" | "code39" | "code93"
  | "ean13" | "ean8" | "ean5" | "ean2"
  | "upca" | "upce"
  | "isbn" | "issn" | "ismn"
  | "qrcode" | "microqrcode" | "datamatrix"
  | "pdf417" | "micropdf417"
  | "azteccode" | "maxicode"
  | "gs1-128" | "itf14"
  | ... ; // 111 formats total
```

## `Card`

Elevated surface card container with shadow and hover effects.

```ts
interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}
```

No additional props. Renders children inside a styled card surface.

## `Echarts`

Apache ECharts integration with responsive resizing and busy state overlay.

```ts
interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echarts.EChartsOption;
  busy?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `option` | `echarts.EChartsOption` | ECharts configuration object |
| `busy` | `boolean` | Show loading overlay |

## `Icon`

Tabler icons wrapper with customizable size.

```ts
interface IconProps extends Omit<TablerIconProps, "size"> {
  icon: Component<TablerIconProps>;
  size?: string | number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `icon` | `Component<TablerIconProps>` | Tabler icon component reference |
| `size` | `string \| number` | Icon size (CSS value or number) |

## `Tag`

Semantic themed inline tag/badge.

```ts
type TagTheme = SemanticTheme;

interface TagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: TagTheme;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `theme` | `TagTheme` | Semantic color theme |

## `Link`

Semantic themed anchor link with disabled state.

```ts
type LinkTheme = SemanticTheme;

interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  theme?: LinkTheme;
  disabled?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `theme` | `LinkTheme` | Semantic color theme |
| `disabled` | `boolean` | Disable link interaction |

## `Alert`

Semantic themed alert box.

```ts
type AlertTheme = SemanticTheme;

interface AlertProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: AlertTheme;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `theme` | `AlertTheme` | Semantic color theme |
