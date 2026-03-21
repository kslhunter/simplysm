# Element Extensions

Extensions added to the `Element.prototype` via side-effect import. These methods are available on all `Element` instances when `@simplysm/core-browser` is imported.

```typescript
import "@simplysm/core-browser";
```

## `ElementBounds`

Element bounds information type returned by `getBounds`.

```typescript
interface ElementBounds {
  /** Element to be measured */
  target: Element;
  /** Top position relative to viewport */
  top: number;
  /** Left position relative to viewport */
  left: number;
  /** Element width */
  width: number;
  /** Element height */
  height: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `Element` | Element to be measured |
| `top` | `number` | Top position relative to viewport |
| `left` | `number` | Left position relative to viewport |
| `width` | `number` | Element width |
| `height` | `number` | Element height |

## `Element.findAll`

Find all child elements matching a CSS selector.

```typescript
findAll<TEl extends Element = Element>(selector: string): TEl[];
```

Returns an empty array if the selector is empty.

## `Element.findFirst`

Find first element matching a CSS selector.

```typescript
findFirst<TEl extends Element = Element>(selector: string): TEl | undefined;
```

Returns `undefined` if the selector is empty or no match is found.

## `Element.prependChild`

Insert element as first child.

```typescript
prependChild<TEl extends Element>(child: TEl): TEl;
```

## `Element.getParents`

Get all parent elements in order of proximity (from closest to farthest).

```typescript
getParents(): Element[];
```

## `Element.findFocusableParent`

Find first focusable parent element (using tabbable library).

```typescript
findFocusableParent(): HTMLElement | undefined;
```

## `Element.findFirstFocusableChild`

Find first focusable child element (using tabbable library). Uses a TreeWalker for traversal.

```typescript
findFirstFocusableChild(): HTMLElement | undefined;
```

## `Element.isOffsetElement`

Check if element is an offset parent (`position: relative | absolute | fixed | sticky`).

```typescript
isOffsetElement(): boolean;
```

## `Element.isVisible`

Check if element is visible on screen. Checks existence of clientRects, `visibility: hidden`, and `opacity: 0`.

```typescript
isVisible(): boolean;
```

## `copyElement`

Copy element content to clipboard. Use as a copy event handler. Finds the first `input`/`textarea` within the target element and copies its value.

```typescript
function copyElement(event: ClipboardEvent): void;
```

## `pasteToElement`

Paste clipboard content to element. Use as a paste event handler. Finds the first `input`/`textarea` within the target element and replaces its entire value with clipboard content. Does not consider cursor position or selection.

```typescript
function pasteToElement(event: ClipboardEvent): void;
```

## `getBounds`

Get bounds information for multiple elements using IntersectionObserver.

```typescript
async function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>;
```

**Parameters:**
- `els` -- Array of target elements
- `timeout` -- Timeout in milliseconds (default: `5000`)

**Throws:** `TimeoutError` if no response within the timeout duration.

Results are returned sorted in input order, with duplicates removed.
