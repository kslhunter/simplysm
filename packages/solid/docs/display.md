# Display

## Card

```typescript
interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}
```

Simple card container with default border and background styling.

---

## Icon

```typescript
interface IconProps extends Omit<TablerIconProps, "size"> {
  icon: Component<TablerIconProps>;
  size?: string | number;
}
```

Renders a Tabler icon. Pass the icon component via the `icon` prop.

```typescript
import { Icon } from "@simplysm/solid";
import { IconUser } from "@tabler/icons-solidjs";

<Icon icon={IconUser} size={24} />
```

---

## Tag

```typescript
interface TagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: "base" | "primary" | "success" | "warning" | "danger" | "danger-light" | "neutral";
}
```

Inline badge/tag with semantic theming.

---

## Link

```typescript
interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  theme?: "base" | "primary" | "success" | "warning" | "danger" | "danger-light" | "neutral";
  disabled?: boolean;
}
```

Styled anchor link with theme and disabled state.

---

## Alert

```typescript
interface AlertProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: "base" | "primary" | "success" | "warning" | "danger" | "danger-light" | "neutral";
}
```

Alert banner with semantic theming.

---

## Barcode

```typescript
interface BarcodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  type: BarcodeType;
  value?: string;
}
```

Renders barcodes and QR codes using bwip-js. `type` supports 111+ barcode formats including `"qrcode"`, `"code128"`, `"ean13"`, `"datamatrix"`, etc.

---

## Echarts

```typescript
interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echarts.EChartsOption;
  busy?: boolean;
}
```

Apache ECharts wrapper. Requires `echarts` as a peer dependency. Set `busy` to show a loading overlay.

---

## Progress

```typescript
interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: number;
  theme?: "base" | "primary" | "success" | "warning" | "danger" | "danger-light" | "neutral";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  inset?: boolean;
}
```

Progress bar. `value` is in the range 0–100 (0 = 0%, 100 = 100%). Pass `children` to display custom content instead of the default percentage text.

---

## Usage Examples

```typescript
import { Card, Tag, Alert, Progress, Icon } from "@simplysm/solid";
import { IconCheck } from "@tabler/icons-solidjs";

<Card>
  <Tag theme="success">Active</Tag>
  <Progress value={75} theme="primary" />
</Card>

<Alert theme="warning">
  <Icon icon={IconCheck} /> Operation completed with warnings.
</Alert>
```
