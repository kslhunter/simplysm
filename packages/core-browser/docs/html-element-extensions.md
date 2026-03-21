# HTMLElement Extensions

Extensions added to the `HTMLElement.prototype` via side-effect import. These methods are available on all `HTMLElement` instances when `@simplysm/core-browser` is imported.

```typescript
import "@simplysm/core-browser";
```

## `HTMLElement.repaint`

Force repaint by triggering reflow. Internally accesses `offsetHeight` which triggers forced synchronous layout in the browser.

```typescript
repaint(): void;
```

## `HTMLElement.getRelativeOffset`

Calculate relative position based on a parent element for CSS positioning.

```typescript
getRelativeOffset(parent: HTMLElement | string): { top: number; left: number };
```

Returns document-based coordinates including `window.scrollX/Y` that can be directly used in CSS `top`/`left` properties.

**Parameters:**
- `parent` -- Parent element or CSS selector to use as reference (e.g., `document.body`, `".container"`)

**Throws:** `ArgumentError` if parent element cannot be found.

**Factors included in calculation:**
- Viewport-relative position (`getBoundingClientRect`)
- Document scroll position (`window.scrollX/Y`)
- Parent element internal scroll (`parentEl.scrollTop/Left`)
- Border thickness of intermediate elements
- CSS transform transformations

**Common use cases:**
- Position dropdowns, popups after appending to `document.body`
- Works correctly on scrolled pages

## `HTMLElement.scrollIntoViewIfNeeded`

Scroll to make target visible if hidden by offset area (e.g., fixed header/column). Only handles cases where target extends beyond top/left boundaries of the scroll area. For downward/rightward scrolling, relies on browser's default focus scroll behavior. Typically used with focus events on tables with fixed headers or columns.

```typescript
scrollIntoViewIfNeeded(
  target: { top: number; left: number },
  offset?: { top: number; left: number },
): void;
```

**Parameters:**
- `target` -- Target position within container (`offsetTop`, `offsetLeft`)
- `offset` -- Size of area that must not be obscured (e.g., fixed header height, fixed column width). Defaults to `{ top: 0, left: 0 }`.
