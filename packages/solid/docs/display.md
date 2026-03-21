# Display Components

Source: `src/components/display/**`

## `Barcode`

SVG barcode renderer using bwip-js. Supports 100+ barcode formats.

```typescript
export interface BarcodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  type: BarcodeType;
  value?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `type` | `BarcodeType` | Barcode format (e.g., `"qrcode"`, `"code128"`, `"ean13"`) |
| `value` | `string` | Data to encode |

### `BarcodeType`

Union of 100+ barcode format strings including `"qrcode"`, `"code128"`, `"ean13"`, `"datamatrix"`, `"pdf417"`, `"azteccode"`, etc.

---

## `Card`

Surface container with shadow, hover effects, and fade-in animation.

```typescript
export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}
```

---

## `Echarts`

Apache ECharts wrapper with auto-resize and loading state support.

```typescript
export interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echarts.EChartsOption;
  busy?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `option` | `echarts.EChartsOption` | ECharts configuration object |
| `busy` | `boolean` | Show loading overlay |

---

## `Icon`

Wrapper for Tabler Icons with consistent sizing and vertical alignment.

```typescript
export interface IconProps extends Omit<TablerIconProps, "size"> {
  icon: Component<TablerIconProps>;
  size?: string | number;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `Component<TablerIconProps>` | Tabler icon component |
| `size` | `string \| number` | Icon size. Default: `"1.25em"` |

---

## `Tag`

Inline badge/tag with semantic theme colors.

```typescript
export interface TagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: TagTheme;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme. Default: `"base"` |

### `TagTheme`

```typescript
export type TagTheme = SemanticTheme;
```

---

## `Link`

Styled anchor element with theme colors and disabled state.

```typescript
export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  theme?: LinkTheme;
  disabled?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme. Default: `"primary"` |
| `disabled` | `boolean` | Disabled state |

### `LinkTheme`

```typescript
export type LinkTheme = SemanticTheme;
```

---

## `Alert`

Block-level alert container with semantic theme background.

```typescript
export interface AlertProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: AlertTheme;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `SemanticTheme` | Color theme. Default: `"base"` |

### `AlertTheme`

```typescript
export type AlertTheme = SemanticTheme;
```
