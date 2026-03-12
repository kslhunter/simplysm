# Element Extensions

Side-effect module that extends `Element.prototype` with DOM traversal, focus management, and visibility helpers. Also exports standalone functions for clipboard operations and element bounds measurement.

## Prototype Methods

### Element.findAll

```typescript
findAll<TEl extends Element = Element>(selector: string): TEl[]
```

Find all child elements matching a CSS selector. Returns an empty array if the selector is empty.

### Element.findFirst

```typescript
findFirst<TEl extends Element = Element>(selector: string): TEl | undefined
```

Find the first child element matching a CSS selector. Returns `undefined` if the selector is empty or no match is found.

### Element.prependChild

```typescript
prependChild<TEl extends Element>(child: TEl): TEl
```

Insert an element as the first child. Returns the inserted child element.

### Element.getParents

```typescript
getParents(): Element[]
```

Get all parent elements ordered from closest to farthest (up to the root).

### Element.findFocusableParent

```typescript
findFocusableParent(): HTMLElement | undefined
```

Find the nearest focusable ancestor element. Uses the `tabbable` library to determine focusability.

### Element.findFirstFocusableChild

```typescript
findFirstFocusableChild(): HTMLElement | undefined
```

Find the first focusable descendant element using a tree walker. Uses the `tabbable` library to determine focusability.

### Element.isOffsetElement

```typescript
isOffsetElement(): boolean
```

Check whether the element is an offset parent. Returns `true` if the computed `position` is `relative`, `absolute`, `fixed`, or `sticky`.

### Element.isVisible

```typescript
isVisible(): boolean
```

Check whether the element is visible on screen. Checks for the existence of client rects, `visibility: hidden`, and `opacity: 0`.

---

## Exported Interfaces

### ElementBounds

```typescript
interface ElementBounds {
  target: Element;
  top: number;
  left: number;
  width: number;
  height: number;
}
```

Bounds information for an element, with positions relative to the viewport.

---

## Exported Functions

### copyElement

```typescript
function copyElement(event: ClipboardEvent): void
```

Copy element content to clipboard. Intended for use as a `copy` event handler. Finds the first `input` or `textarea` within the event target and writes its value to the clipboard.

### pasteToElement

```typescript
function pasteToElement(event: ClipboardEvent): void
```

Paste clipboard content into an element. Intended for use as a `paste` event handler. Finds the first `input` or `textarea` within the event target and replaces its value with clipboard text, dispatching an `input` event afterward.

### getBounds

```typescript
function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>
```

Get bounds information for multiple elements using `IntersectionObserver`. Results are returned in the same order as the input array, with duplicates removed.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `els` | `Element[]` | -- | Target elements |
| `timeout` | `number` | `5000` | Timeout in milliseconds |

Throws `TimeoutError` (from `@simplysm/core-common`) if the observer does not respond within the timeout duration.

---

## Usage Examples

```typescript
import "@simplysm/core-browser"; // activate side effects

// Find elements
const buttons = container.findAll<HTMLButtonElement>("button.primary");
const firstInput = form.findFirst<HTMLInputElement>("input[type=text]");

// DOM traversal
const parents = element.getParents();
const focusable = element.findFirstFocusableChild();

// Visibility check
if (element.isVisible()) {
  // element is rendered and visible
}

// Clipboard handlers
document.addEventListener("copy", copyElement);
document.addEventListener("paste", pasteToElement);

// Measure element bounds
const bounds = await getBounds([el1, el2, el3]);
// bounds[0].top, bounds[0].left, bounds[0].width, bounds[0].height
```
