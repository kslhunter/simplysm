# Display Components

Source: `src/components/display/**/*.tsx`

## Barcode

SVG barcode renderer powered by bwip-js.

```ts
interface BarcodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  type: BarcodeType;
  value?: string;
}
```

### BarcodeType

Union type of all supported barcode formats. Common values include: `"qrcode"`, `"code128"`, `"ean13"`, `"datamatrix"`, `"pdf417"`, `"azteccode"`, `"code39"`, `"upca"`, `"isbn"`.

Full list exported from `src/components/display/Barcode.types.ts` with 100+ formats.

## Card

Elevated container with shadow and fade-in animation.

```ts
interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}
```

Applies surface background, rounded corners, shadow with hover/focus-within elevation.

## Echarts

Apache ECharts wrapper with reactive option updates and resize handling.

```ts
interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echarts.EChartsOption;
  busy?: boolean;  // shows/hides loading indicator
}
```

- Uses SVG renderer.
- Automatically resizes with container via `ResizeObserver`.

## Icon

Tabler icon wrapper using `Dynamic` rendering.

```ts
interface IconProps extends Omit<TablerIconProps, "size"> {
  icon: Component<TablerIconProps>;
  size?: string | number;  // default: "1.25em"
}
```

Adds `inline` display and vertical alignment.

## Tag

Themed inline tag/badge with solid background.

```ts
type TagTheme = SemanticTheme;

interface TagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: TagTheme;  // default: "base"
}
```

## Link

Themed anchor link with hover underline.

```ts
type LinkTheme = SemanticTheme;

interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  theme?: LinkTheme;    // default: "primary"
  disabled?: boolean;
}
```

## Alert

Themed alert/callout box with light background.

```ts
type AlertTheme = SemanticTheme;

interface AlertProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: AlertTheme;  // default: "base"
}
```
