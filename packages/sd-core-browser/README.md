# @simplysm/sd-core-browser

Browser-specific core utilities for the Simplysm framework. Provides prototype extensions for `Blob`, `Element`, and `HTMLElement`, plus a static utility class for HTML element measurement.

Depends on `@simplysm/sd-core-common`.

## Installation

```bash
npm install @simplysm/sd-core-browser
```

## Setup

Import the package at your application entry point. This registers all prototype extensions on the global `Blob`, `Element`, and `HTMLElement` prototypes.

```ts
import "@simplysm/sd-core-browser";
```

## API

### Blob Extensions

Extensions added to the global `Blob` prototype.

#### `Blob.prototype.download(fileName: string): void`

Triggers a browser file download for the blob content.

```ts
const blob = new Blob(["hello"], { type: "text/plain" });
blob.download("hello.txt");
```

---

### Element Extensions

Extensions added to the global `Element` prototype.

#### `prependChild<T extends Element>(newChild: T): T`

Inserts a child element before the first existing child. Returns the inserted element.

```ts
const newEl = document.createElement("div");
parentEl.prependChild(newEl);
```

#### `findAll<T extends Element>(selector: string): T[]`

Finds all descendant elements matching the CSS selector. Uses `:scope` internally for correct scoping.

```ts
const buttons = container.findAll<HTMLButtonElement>("button.primary");
```

#### `findFirst<T extends Element>(selector: string): T | undefined`

Finds the first descendant element matching the CSS selector, or `undefined` if none found.

```ts
const input = form.findFirst<HTMLInputElement>("input[name='email']");
```

#### `getParents(): HTMLElement[]`

Returns an array of all ancestor `HTMLElement` nodes, from the immediate parent up to the root.

```ts
const ancestors = element.getParents();
```

#### `findParent(selector: string): HTMLElement | undefined` (deprecated)

Walks up the DOM tree and returns the first parent matching the CSS selector. Use the native `Element.closest()` method instead.

#### `findParent(element: Element): HTMLElement | undefined` (deprecated)

Walks up the DOM tree and returns the first parent that is the given element. Use the native `Element.closest()` method instead.

#### `isFocusable(): boolean`

Returns `true` if the element matches common focusable selectors (links, buttons, inputs, textareas, elements with `tabindex` or `contenteditable`, etc.).

```ts
if (element.isFocusable()) {
  (element as HTMLElement).focus();
}
```

#### `findFocusableAll(): TFocusableElement[]`

Finds all focusable descendant elements.

```ts
const focusables = container.findFocusableAll();
```

#### `findFocusableFirst(): TFocusableElement | undefined`

Finds the first focusable descendant element, or `undefined` if none found.

```ts
const first = dialog.findFocusableFirst();
first?.focus();
```

#### `findFocusableParent(): TFocusableElement | undefined`

Walks up the DOM tree and returns the first focusable ancestor, or `undefined` if none found.

```ts
const focusableParent = element.findFocusableParent();
```

#### `isOffsetElement(): boolean`

Returns `true` if the element has a CSS `position` value of `relative`, `absolute`, `fixed`, or `sticky`.

```ts
if (element.isOffsetElement()) {
  // element participates in offset calculations
}
```

#### `isVisible(): boolean`

Returns `true` if the element has client rects, is not `visibility: hidden`, and is not `opacity: 0`.

```ts
if (element.isVisible()) {
  // element is rendered and visible
}
```

#### `copyAsync(): Promise<void>`

Copies the element content to the clipboard. If the element contains an `<input>` element, copies its value; otherwise copies the element's `innerHTML`.

```ts
await cell.copyAsync();
```

#### `pasteAsync(): Promise<void>`

Reads text from the clipboard and pastes it into the first `<input>` descendant element.

```ts
await cell.pasteAsync();
```

---

### HTMLElement Extensions

Extensions added to the global `HTMLElement` prototype.

#### `repaint(): void`

Forces a synchronous layout repaint by reading `offsetHeight`.

```ts
element.repaint();
```

#### `getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }`

Calculates the element's offset position relative to a parent element. The parent can be specified as an `HTMLElement` reference or a CSS selector string. Accounts for scroll positions, borders, and CSS transforms.

```ts
const offset = element.getRelativeOffset(scrollContainer);
// or
const offset = element.getRelativeOffset(".scroll-container");
```

#### `scrollIntoViewIfNeeded(target: { top: number; left: number }, offset?: { top: number; left: number }): void`

Scrolls the element so that the given target position is visible, applying an optional offset. Only scrolls if the target is currently outside the visible scroll area.

```ts
const targetOffset = child.getRelativeOffset(scrollContainer);
scrollContainer.scrollIntoViewIfNeeded(targetOffset, { top: 10, left: 0 });
```

---

### HtmlElementUtils

A static utility class for HTML element measurement.

#### `static getBoundsAsync(els: HTMLElement[]): Promise<{ target: HTMLElement; top: number; left: number; width: number; height: number }[]>`

Uses `IntersectionObserver` to asynchronously measure the bounding rectangles of multiple elements. Returns an array of bound objects with `target`, `top`, `left`, `width`, and `height`.

```ts
import { HtmlElementUtils } from "@simplysm/sd-core-browser";

const bounds = await HtmlElementUtils.getBoundsAsync([el1, el2, el3]);
for (const b of bounds) {
  console.log(b.target, b.top, b.left, b.width, b.height);
}
```
