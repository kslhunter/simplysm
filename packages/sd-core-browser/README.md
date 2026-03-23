# @simplysm/sd-core-browser

Browser-specific core utilities for the Simplysm framework. Provides prototype extensions for `Blob`, `Element`, and `HTMLElement`, plus a static utility class for HTML element measurement.

Depends on `@simplysm/sd-core-common`.

## Installation

```bash
npm install @simplysm/sd-core-browser
```

## API Overview

### Exported Classes

| API | Type | Description |
|-----|------|-------------|
| `HtmlElementUtils` | Class | Static utility methods for HTML element measurement |

### Side-Effect Extensions (auto-applied on import)

| API | Target | Description |
|-----|--------|-------------|
| `Blob.download()` | `Blob` prototype | Downloads the blob as a file |
| `Element.prependChild()` | `Element` prototype | Inserts a child element at the beginning |
| `Element.findAll()` | `Element` prototype | Finds all descendant elements matching a selector |
| `Element.findFirst()` | `Element` prototype | Finds the first descendant element matching a selector |
| `Element.getParents()` | `Element` prototype | Returns all parent elements up to the root |
| `Element.findParent()` | `Element` prototype | Finds a parent matching a selector or reference (deprecated) |
| `Element.isFocusable()` | `Element` prototype | Checks if the element is focusable |
| `Element.findFocusableAll()` | `Element` prototype | Finds all focusable descendants |
| `Element.findFocusableFirst()` | `Element` prototype | Finds the first focusable descendant |
| `Element.findFocusableParent()` | `Element` prototype | Finds the nearest focusable ancestor |
| `Element.isOffsetElement()` | `Element` prototype | Checks if element has a positioning context |
| `Element.isVisible()` | `Element` prototype | Checks if element is visible |
| `Element.copyAsync()` | `Element` prototype | Copies element content to clipboard |
| `Element.pasteAsync()` | `Element` prototype | Pastes clipboard content into input |
| `HTMLElement.repaint()` | `HTMLElement` prototype | Forces a repaint on the element |
| `HTMLElement.getRelativeOffset()` | `HTMLElement` prototype | Gets the offset relative to a parent element |
| `HTMLElement.scrollIntoViewIfNeeded()` | `HTMLElement` prototype | Scrolls the element if a target is out of view |

## API Reference

### `HtmlElementUtils`

Static utility class for HTML element bounds measurement using `IntersectionObserver`.

```typescript
class HtmlElementUtils {
  static async getBoundsAsync(els: HTMLElement[]): Promise<{
    target: HTMLElement;
    top: number;
    left: number;
    width: number;
    height: number;
  }[]>;
}
```

#### `getBoundsAsync(els)`

Returns bounding rectangle information for each element using `IntersectionObserver`. This provides an async alternative to `getBoundingClientRect()`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `els` | `HTMLElement[]` | Array of elements to measure |

**Returns**: `Promise` of an array of objects containing `target`, `top`, `left`, `width`, and `height`.

### `Blob.download()`

Downloads the Blob as a file with the specified filename.

```typescript
interface Blob {
  download(fileName: string): void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileName` | `string` | The filename for the downloaded file |

### `Element.prependChild()`

Inserts a child element before the first child of this element.

```typescript
interface Element {
  prependChild<T extends Element>(newChild: T): T;
}
```

### `Element.findAll()`

Finds all descendant elements matching a CSS selector, using `:scope` for relative queries.

```typescript
interface Element {
  findAll<T extends Element>(selector: string): T[];
  findAll(selector: string): Element[];
}
```

### `Element.findFirst()`

Finds the first descendant element matching a CSS selector.

```typescript
interface Element {
  findFirst<T extends Element>(selector: string): T | undefined;
  findFirst(selector: string): Element | undefined;
}
```

### `Element.getParents()`

Returns an array of all parent `HTMLElement` nodes up to the document root.

```typescript
interface Element {
  getParents(): HTMLElement[];
}
```

### `Element.findParent()`

> **Deprecated**: Use the built-in `closest()` method instead.

Finds a parent element matching a selector string or element reference.

```typescript
interface Element {
  findParent(selector: string): HTMLElement | undefined;
  findParent(element: Element): HTMLElement | undefined;
}
```

### `Element.isFocusable()`

Returns `true` if the element matches standard focusable selectors (links, buttons, inputs, textareas, elements with `tabindex` or `contenteditable`, etc.).

```typescript
interface Element {
  isFocusable(): boolean;
}
```

### `Element.findFocusableAll()`

Finds all focusable descendant elements.

```typescript
interface Element {
  findFocusableAll(): TFocusableElement[];
}
```

### `Element.findFocusableFirst()`

Finds the first focusable descendant element.

```typescript
interface Element {
  findFocusableFirst(): TFocusableElement | undefined;
}
```

### `Element.findFocusableParent()`

Walks up the DOM tree and returns the first focusable ancestor.

```typescript
interface Element {
  findFocusableParent(): TFocusableElement | undefined;
}
```

### `Element.isOffsetElement()`

Returns `true` if the element's computed position is `relative`, `absolute`, `fixed`, or `sticky`.

```typescript
interface Element {
  isOffsetElement(): boolean;
}
```

### `Element.isVisible()`

Returns `true` if the element has client rects, is not `visibility: hidden`, and is not `opacity: 0`.

```typescript
interface Element {
  isVisible(): boolean;
}
```

### `Element.copyAsync()`

Copies element content to the clipboard. If the element contains an `<input>`, copies its value; otherwise copies `innerHTML`.

```typescript
interface Element {
  copyAsync(): Promise<void>;
}
```

### `Element.pasteAsync()`

Reads text from the clipboard and pastes it into the first `<input>` found within the element.

```typescript
interface Element {
  pasteAsync(): Promise<void>;
}
```

### `HTMLElement.repaint()`

Forces a browser repaint by reading `offsetHeight`.

```typescript
interface HTMLElement {
  repaint(): void;
}
```

### `HTMLElement.getRelativeOffset()`

Calculates the element's offset relative to a parent element, accounting for scroll position, borders, and CSS transforms.

```typescript
interface HTMLElement {
  getRelativeOffset(parentElement: HTMLElement): { top: number; left: number };
  getRelativeOffset(parentSelector: string): { top: number; left: number };
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `parentElement` | `HTMLElement` | Direct parent element reference |
| `parentSelector` | `string` | CSS selector resolved via `closest()` |

### `HTMLElement.scrollIntoViewIfNeeded()`

Scrolls the element so that the given target position is visible, with optional offset.

```typescript
interface HTMLElement {
  scrollIntoViewIfNeeded(
    target: { top: number; left: number },
    offset?: { top: number; left: number },
  ): void;
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target` | `{ top: number; left: number }` | -- | Target position to scroll into view |
| `offset` | `{ top: number; left: number }` | `{ top: 0, left: 0 }` | Offset from viewport edge |

## Usage Examples

### Measuring element bounds

```typescript
import { HtmlElementUtils } from "@simplysm/sd-core-browser";

const elements = Array.from(document.querySelectorAll(".item")) as HTMLElement[];
const bounds = await HtmlElementUtils.getBoundsAsync(elements);

for (const b of bounds) {
  console.log(`${b.target.id}: top=${b.top}, left=${b.left}, ${b.width}x${b.height}`);
}
```

### Downloading a Blob

```typescript
import "@simplysm/sd-core-browser";

const blob = new Blob(["Hello, World!"], { type: "text/plain" });
blob.download("hello.txt");
```

### Finding elements

```typescript
import "@simplysm/sd-core-browser";

const container = document.getElementById("app")!;

// Find all buttons inside
const buttons = container.findAll<HTMLButtonElement>("button");

// Find the first focusable element
const firstFocusable = container.findFocusableFirst();
firstFocusable?.focus();
```
