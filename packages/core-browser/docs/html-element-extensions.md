# HTML Element Extensions

Side-effect import that extends the global `HTMLElement` prototype with layout and scroll utility methods.

## `HTMLElement.prototype.repaint`

Force a synchronous repaint by triggering a reflow (reads `offsetHeight`).

```typescript
repaint(): void
```

## `HTMLElement.prototype.getRelativeOffset`

Calculate the element's position relative to a parent element. Returns coordinates suitable for CSS `top`/`left` properties.

The calculation accounts for:
- Viewport position (`getBoundingClientRect`)
- Parent internal scroll (`parentEl.scrollTop/Left`)
- Intermediate element border widths
- CSS `transform`

```typescript
getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `parent` | `HTMLElement \| string` | Parent element or CSS selector to match via `closest()` |

**Returns:** `{ top: number; left: number }` -- Coordinates usable for CSS `top`/`left`.

**Throws:** `ArgumentError` if the parent element cannot be found.

## `HTMLElement.prototype.scrollIntoViewIfNeeded`

Scroll the container so that the target position is not obscured by fixed offset areas (e.g., sticky headers or fixed columns). Only handles cases where the target is above or to the left of the visible area; downward/rightward scrolling relies on the browser's default focus scroll behavior.

```typescript
scrollIntoViewIfNeeded(
  target: { top: number; left: number },
  offset?: { top: number; left: number },
): void
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target` | `{ top: number; left: number }` | | Target position within the container (`offsetTop`, `offsetLeft`) |
| `offset` | `{ top: number; left: number }` | `{ top: 0, left: 0 }` | Size of the offset area that must not obscure the target (e.g., fixed header height) |
