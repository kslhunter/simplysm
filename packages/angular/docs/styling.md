# Styling

CSS classes, custom properties, themes, and SCSS mixins provided by the `@simplysm/angular` package.

## CSS Classes

### Flex Layout

| Class | Description |
|-------|-------------|
| `.flex-row` | `display: flex; flex-direction: row; flex-wrap: nowrap` |
| `.flex-column` | `display: flex; flex-direction: column; flex-wrap: nowrap` |
| `.flex-row-inline` | `display: inline-flex; flex-direction: row` |
| `.flex-column-inline` | `display: inline-flex; flex-direction: column` |
| `.flex-auto` | `flex: 1 0 auto` — grows but does not shrink |
| `.flex-fill` | `flex: 1 1 auto; overflow: auto` — fills remaining space |
| `.flex-min` | `flex: 0 0 0` — collapses to minimum |

### Grid Layout

| Class | Description |
|-------|-------------|
| `.grid` | 12-column CSS grid |
| `.grid-{1…12}` | Span N columns |
| `.grid-sm-{1…12}` | Span N columns at ≤1280px |
| `.grid-xs-{1…12}` | Span N columns at ≤1024px |
| `.grid-xxs-{1…12}` | Span N columns at ≤800px |

### Card

| Class | Description |
|-------|-------------|
| `.card` | Block with control-color background, border-radius, elevation 2 shadow, entrance animation. Elevation 4 on hover/focus-within |

### Font Size

| Class | Description |
|-------|-------------|
| `.ft-size-{key}` | `font-size: var(--font-size-{key})` — keys: `lg`, `default`, `sm`, `h1`–`h6` |

### Background

| Class | Description |
|-------|-------------|
| `.bg-theme-{theme}-{shade}` | Background from theme color. Themes: `gray`, `blue-gray`, `primary`, `secondary`, `info`, `success`, `warning`, `danger`. Shades: `lightest`–`darkest` |
| `.bg-trans-{key}` | Translucent black background. Keys: `darkest`–`lightest`, `rev-default`–`rev-lightest` |
| `.bg-default` | Background color set to `--background-color` |
| `.bg-control` | Background set to `--control-color` |

### Text Color

| Class | Description |
|-------|-------------|
| `.tx-trans-{key}` | Text color from `--text-trans-{key}`. Keys: `dark`, `default`, `light`, `lighter`, `lightest`, `rev-default`, `rev-dark`, `rev-darker` |
| `.tx-theme-{theme}-{shade}` | Text color from theme palette |
| `.tx-line-through` | `text-decoration: line-through` |
| `.tx-underline` | `text-decoration: underline` |
| `.tx-left` | `text-align: left` |
| `.tx-right` | `text-align: right` |
| `.tx-center` | `text-align: center` |

### Border

| Class | Description |
|-------|-------------|
| `.bd` | `border: 1px solid` |
| `.bd-theme-{theme}-{shade}` | Border color from theme palette |
| `.bd-trans-{key}` | Border color from transparent scale |
| `.bd-color-{key}` | Border color from semantic scale: `lighter`, `light`, `default`, `dark`, `darker` |
| `.bd-none` | Removes border |
| `.bd-transparent` | Transparent border-color |
| `.bd{t\|r\|b\|l}` | Directional border (e.g., `.bdt`, `.bdr`, `.bdb`, `.bdl`) |
| `.bd{t\|r\|b\|l}-theme-{theme}-{shade}` | Directional border color from theme |
| `.bd{t\|r\|b\|l}-trans-{key}` | Directional border color from transparent scale |
| `.bd{t\|r\|b\|l}-color-{key}` | Directional border color from semantic scale |
| `.bd{t\|r\|b\|l}-none` | Removes directional border |
| `.bd{t\|r\|b\|l}-transparent` | Transparent directional border |

### Border Width

| Class | Description |
|-------|-------------|
| `.bd-width-{key}` | Border width from gap scale: `xxs`–`xxl`, `0`, `auto` |
| `.bd{t\|r\|b\|l}-width-{key}` | Directional border width |

### Border Radius

| Class | Description |
|-------|-------------|
| `.bd-radius-{key}` | `border-radius: var(--border-radius-{key})` — keys: `xs`–`xxl` |
| `.bdt-radius-{key}` | Top-left + top-right radius |
| `.bdb-radius-{key}` | Bottom-left + bottom-right radius |
| `.bdl-radius-{key}` | Top-left + bottom-left radius |
| `.bdr-radius-{key}` | Top-right + bottom-right radius |

### Spacing (Padding / Margin / Position)

Gap keys: `xxs` (0.0833rem), `xs` (0.1667rem), `sm` (0.3333rem), `default` (0.5rem), `lg` (0.6667rem), `xl` (1rem), `xxl` (1.5rem), `0`, `auto`.

| Class | Description |
|-------|-------------|
| `.p-{key}` | Padding all sides |
| `.pv-{key}` | Padding top + bottom |
| `.ph-{key}` | Padding left + right |
| `.p{t\|r\|b\|l}-{key}` | Directional padding |
| `.m-{key}` | Margin all sides |
| `.mv-{key}` | Margin top + bottom |
| `.mh-{key}` | Margin left + right |
| `.m{t\|r\|b\|l}-{key}` | Directional margin |
| `.{t\|r\|b\|l}-{key}` | Positional offset (top/right/bottom/left) |

### Sizing

| Class | Description |
|-------|-------------|
| `.sw-{key}` | `width: var(--gap-{key})` |
| `.sh-{key}` | `height: var(--gap-{key})` |
| `.sh-topbar` | `height: var(--topbar-height)` |
| `.sw-sidebar` | `width: var(--sidebar-width)` |

### Alignment

| Class | Description |
|-------|-------------|
| `.main-align-{start\|end\|center}` | `justify-content` |
| `.cross-align-{start\|end\|center}` | `align-items` |
| `.gap-{key}` | `gap: var(--gap-{key})` |

### Form & Table

| Class | Description |
|-------|-------------|
| `.form-control` | Base form input styling (padding, border, font) |
| `.form-box` | Vertical flex form layout with labeled children |
| `.form-box-inline` | Inline-flex row wrap form layout |
| `.form-box-item` | Child item class for `.form-box` |
| `.form-table` | CSS table-display layout for labeled form fields |
| `.form-table-header` | Section heading inside `.form-table > th` |
| `.table` | Standard bordered table |
| `.table-inset` | Table variant without outer border |
| `.table-inline` | Table variant with `width: auto` |
| `.table-bd-v` | Vertical borders only |
| `.table-bd-h` | Horizontal borders only |

### Misc Utilities

| Class | Description |
|-------|-------------|
| `.fill` | `width: 100%; height: 100%; overflow: auto` |
| `.help` | Dotted underline + `cursor: help` |
| `.control-header` | Small gray label above a control |
| `.page-header` | Small gray section heading with bottom margin |
| `.sticky-top` | `position: sticky; top: 0; z-index: 1` |
| `.overflow-auto` | `overflow: auto` |
| `.position-relative` | `position: relative` |
| `.nowrap` | `white-space: nowrap` |

## CSS Custom Properties

### Color Palette

`--color-{name}` — Named colors from the palette: `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`, `slate`, `gray`, `zinc`, `neutral`, `stone`.

### Theme Colors

`--theme-{group}-{shade}` — Groups: `gray`, `blue-gray`, `primary`, `secondary`, `info`, `success`, `warning`, `danger`. Shades: `lightest`, `lighter`, `light`, `default`, `dark`, `darker`, `darkest`.

### Transparency

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--trans-darkest` | `rgba(0,0,0,0.5)` | `rgba(255,255,255,0.5)` |
| `--trans-darker` | `rgba(0,0,0,0.4)` | `rgba(255,255,255,0.4)` |
| `--trans-dark` | `rgba(0,0,0,0.3)` | `rgba(255,255,255,0.3)` |
| `--trans-default` | `rgba(0,0,0,0.2)` | `rgba(255,255,255,0.2)` |
| `--trans-light` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.1)` |
| `--trans-lighter` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.03)` |
| `--trans-lightest` | `rgba(0,0,0,0.03)` | `rgba(255,255,255,0.05)` |
| `--trans-rev-default` | `rgba(255,255,255,0.1)` | `rgba(0,0,0,0.1)` |
| `--trans-rev-light` | `rgba(255,255,255,0.2)` | `rgba(0,0,0,0.2)` |
| `--trans-rev-lighter` | `rgba(255,255,255,0.3)` | `rgba(0,0,0,0.3)` |
| `--trans-rev-lightest` | `rgba(255,255,255,0.4)` | `rgba(0,0,0,0.4)` |

### Text Transparency

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--text-trans-dark` | `black` | `white` |
| `--text-trans-default` | `rgba(0,0,0,0.87)` | `rgba(255,255,255,0.87)` |
| `--text-trans-light` | `rgba(0,0,0,0.6)` | `rgba(255,255,255,0.6)` |
| `--text-trans-lighter` | `rgba(0,0,0,0.38)` | `rgba(255,255,255,0.38)` |
| `--text-trans-lightest` | `rgba(0,0,0,0.2)` | `rgba(255,255,255,0.2)` |
| `--text-trans-rev-default` | `white` | `black` |
| `--text-trans-rev-dark` | `rgba(255,255,255,0.7)` | `rgba(0,0,0,0.7)` |
| `--text-trans-rev-darker` | `rgba(255,255,255,0.5)` | `rgba(0,0,0,0.5)` |

### Font Sizes

| Property | Value |
|----------|-------|
| `--font-size-lg` | `1.1667rem` |
| `--font-size-default` | `1rem` |
| `--font-size-sm` | `0.9167rem` |
| `--font-size-h1` | `2rem` |
| `--font-size-h2` | `1.5rem` |
| `--font-size-h3` | `1.3333rem` |
| `--font-size-h4` | `1.1667rem` |
| `--font-size-h5` | `1rem` |
| `--font-size-h6` | `0.9167rem` |

### Gaps (Spacing Scale)

| Property | Value |
|----------|-------|
| `--gap-xxs` | `0.0833rem` |
| `--gap-xs` | `0.1667rem` |
| `--gap-sm` | `0.3333rem` |
| `--gap-default` | `0.5rem` |
| `--gap-lg` | `0.6667rem` |
| `--gap-xl` | `1rem` |
| `--gap-xxl` | `1.5rem` |

### Border Colors

| Property | Value |
|----------|-------|
| `--border-color-lighter` | `var(--theme-gray-lightest)` |
| `--border-color-light` | `var(--theme-gray-lighter)` |
| `--border-color-default` | `var(--theme-gray-light)` |
| `--border-color-dark` | `var(--theme-gray-default)` |
| `--border-color-darker` | `var(--theme-gray-dark)` |

### Border Radii

| Property | Value |
|----------|-------|
| `--border-radius-xs` | `0.0833rem` |
| `--border-radius-sm` | `0.1667rem` |
| `--border-radius-default` | `0.3333rem` |
| `--border-radius-lg` | `0.5rem` |
| `--border-radius-xl` | `0.6667rem` |
| `--border-radius-xxl` | `1rem` |

### Z-Index

| Property | Value |
|----------|-------|
| `--z-index-toast` | `9999` |
| `--z-index-busy` | `9998` |
| `--z-index-dropdown` | `5000` |
| `--z-index-modal` | `4000` |
| `--z-index-sidebar` | `3000` |

### Miscellaneous

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--line-height` | `1.5em` | — |
| `--font-family` | `sans-serif` | — |
| `--font-family-monospace` | `monospace` | — |
| `--background-color` | `white` | `#000` |
| `--background-rev-color` | `black` | `#fff` |
| `--control-color` | `white` | `#000` |
| `--busy-overlay-bg` | `rgba(255,255,255,0.6)` | `rgba(0,0,0,0.6)` |
| `--animation-duration` | `0.2s` | — |
| `--elevation-size` | `0.0833rem` | — |
| `--sidebar-width` | `15em` | — |
| `--topbar-height` | `3em` | — |
| `--sheet-pv` | `var(--gap-xs)` | — |
| `--sheet-ph` | `var(--gap-sm)` | — |
| `--sheet-bg` | `var(--theme-gray-lightest)` | — |

## Themes

### `.sd-theme-dark`

Overrides CSS custom properties for dark mode. Inverts `--trans-*`, `--text-trans-*`, `--theme-*` color maps, and sets `--background-color: #000`, `--control-color: #000`.

Images are automatically inverted via `filter: invert(1) hue-rotate(180deg)`. Add `.no-invert` class to opt out.

## Mixins / Functions

### `writeVars($value, $prevKey)`

Recursively walks a nested SASS map and emits each leaf as a CSS custom property `--{key}: {value}`.

### `elevation($value)`

Generates a `box-shadow` declaration for material-style elevation. Negative values produce inset shadows.

### `form-control-base()`

Emits base styles for form input controls (padding, border, font).

### `help()`

Applies dotted underline and `cursor: help`.

### `flex-direction($direction, $defaultGap: null)`

Sets `flex-direction` and optional `gap`. Includes fallback for browsers without flex gap support (Chrome 61+).

### `color-map($base, $offset: 0%)`

Returns a 7-shade map (`lightest`–`darkest`) by scaling the lightness of a base color.

### `to-rgb($oklch-color)`

Converts an OKLCH color value to RGB color space.
