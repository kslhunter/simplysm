# HTMLElement Extensions

Side-effect module that extends `HTMLElement.prototype` with layout and scrolling utilities.

## Prototype Methods

### HTMLElement.repaint

```typescript
repaint(): void
```

Force a synchronous repaint by triggering a reflow. Internally accesses `offsetHeight` to flush pending style changes.

---

### HTMLElement.getRelativeOffset

```typescript
getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }
```

Calculate the element's position relative to a parent element, returning document-based coordinates suitable for CSS `top`/`left` properties.

| Parameter | Type | Description |
|-----------|------|-------------|
| `parent` | `HTMLElement \| string` | Parent element or CSS selector to use as reference |

**Returns:** `{ top: number; left: number }` -- coordinates usable in CSS positioning.

**Throws:** `ArgumentError` (from `@simplysm/core-common`) if the parent element cannot be found.

The calculation accounts for:
- Viewport-relative position (`getBoundingClientRect`)
- Document scroll position (`window.scrollX/Y`)
- Parent element internal scroll (`parentEl.scrollTop/Left`)
- Border thickness of intermediate elements
- CSS `transform` transformations

Common use cases include positioning dropdowns and popups after appending them to `document.body`.

---

### HTMLElement.scrollIntoViewIfNeeded

```typescript
scrollIntoViewIfNeeded(
  target: { top: number; left: number },
  offset?: { top: number; left: number },
): void
```

Scroll the element so that a target position is not obscured by a fixed offset area (e.g., a sticky header or fixed column).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target` | `{ top: number; left: number }` | -- | Target position within the container (`offsetTop`, `offsetLeft`) |
| `offset` | `{ top: number; left: number }` | `{ top: 0, left: 0 }` | Size of the area that must remain unobscured |

Only handles cases where the target extends beyond the top/left boundaries of the scroll area. For downward/rightward scrolling, the browser's default focus scroll behavior is relied upon. Typically used with focus events on tables that have fixed headers or columns.

---

## Usage Examples

```typescript
import "@simplysm/core-browser"; // activate side effects

// Force repaint after style changes
element.style.transform = "scale(1.1)";
element.repaint();

// Position a dropdown relative to document.body
const pos = trigger.getRelativeOffset(document.body);
dropdown.style.top = `${pos.top + trigger.offsetHeight}px`;
dropdown.style.left = `${pos.left}px`;

// Position relative to a container found by selector
const pos2 = cell.getRelativeOffset(".scroll-container");

// Scroll table so focused cell is visible past fixed header
tableContainer.scrollIntoViewIfNeeded(
  { top: cell.offsetTop, left: cell.offsetLeft },
  { top: headerHeight, left: fixedColumnWidth },
);
```
