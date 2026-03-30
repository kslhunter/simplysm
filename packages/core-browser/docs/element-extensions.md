# Element Extensions

Side-effect import that extends the global `Element` prototype with DOM utility methods, plus standalone clipboard and bounds functions.

## `ElementBounds`

Bounding rectangle information for an element, returned by `getBounds`.

```typescript
interface ElementBounds {
  target: Element;
  top: number;
  left: number;
  width: number;
  height: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `Element` | The measured element |
| `top` | `number` | Top position relative to viewport |
| `left` | `number` | Left position relative to viewport |
| `width` | `number` | Element width |
| `height` | `number` | Element height |

## `Element.prototype.findAll`

Find all descendant elements matching a CSS selector.

```typescript
findAll<TEl extends Element = Element>(selector: string): TEl[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `selector` | `string` | CSS selector. Returns empty array if empty string. |

**Returns:** `TEl[]` -- Array of matching elements.

## `Element.prototype.findFirst`

Find the first descendant element matching a CSS selector.

```typescript
findFirst<TEl extends Element = Element>(selector: string): TEl | undefined
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `selector` | `string` | CSS selector. Returns `undefined` if empty string. |

**Returns:** `TEl | undefined` -- First matching element or `undefined`.

## `Element.prototype.prependChild`

Insert a child element as the first child.

```typescript
prependChild<TEl extends Element>(child: TEl): TEl
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `child` | `TEl` | Element to insert |

**Returns:** `TEl` -- The inserted child element.

## `Element.prototype.getParents`

Get all ancestor elements, ordered from nearest to farthest.

```typescript
getParents(): Element[]
```

**Returns:** `Element[]` -- Array of parent elements (nearest first).

## `Element.prototype.findFocusableParent`

Find the nearest focusable ancestor element (uses `tabbable` library).

```typescript
findFocusableParent(): HTMLElement | undefined
```

**Returns:** `HTMLElement | undefined` -- First focusable parent or `undefined`.

## `Element.prototype.findFirstFocusableChild`

Find the first focusable descendant element (uses `tabbable` library).

```typescript
findFirstFocusableChild(): HTMLElement | undefined
```

**Returns:** `HTMLElement | undefined` -- First focusable child or `undefined`.

## `Element.prototype.isOffsetElement`

Check whether the element is an offset parent (`position: relative | absolute | fixed | sticky`).

```typescript
isOffsetElement(): boolean
```

**Returns:** `boolean` -- `true` if element has a positioning CSS property.

## `Element.prototype.isVisible`

Check whether the element is visible on screen. Checks `getClientRects()`, `visibility`, and `opacity`.

```typescript
isVisible(): boolean
```

**Returns:** `boolean` -- `true` if the element is visible.

## `copyElement`

Copy element content to the clipboard. Intended for use as a `copy` event handler. Finds the first `input` or `textarea` within the event target and copies its value.

```typescript
function copyElement(event: ClipboardEvent): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `ClipboardEvent` | The copy event object |

## `pasteToElement`

Paste clipboard content into an element. Intended for use as a `paste` event handler. Finds the first `input` or `textarea` within the event target and replaces its entire value with the clipboard text.

```typescript
function pasteToElement(event: ClipboardEvent): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `ClipboardEvent` | The paste event object |

## `getBounds`

Get bounding rectangle information for multiple elements using `IntersectionObserver`. Results are returned in the same order as the input array. Duplicate elements are deduplicated.

```typescript
async function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `els` | `Element[]` | | Target elements |
| `timeout` | `number` | `5000` | Timeout in milliseconds |

**Returns:** `Promise<ElementBounds[]>` -- Bounding info sorted by input order.

**Throws:** `TimeoutError` if the observer does not respond within the timeout.
