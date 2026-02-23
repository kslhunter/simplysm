# @simplysm/sd-core-browser

Browser-specific core extensions for the Simplysm framework. Augments native browser APIs (`Blob`, `Element`, `HTMLElement`) with utility methods, and exports the `HtmlElementUtils` helper class.

## Installation

```bash
yarn add @simplysm/sd-core-browser
```

## Main Modules

### Blob Extensions (`Blob.ext`)

Imported automatically when you import `@simplysm/sd-core-browser`. Adds a `download` method to the native `Blob` prototype.

#### `Blob.prototype.download(fileName: string): void`

Triggers a file download in the browser by creating a temporary `<a>` element with an object URL.

```typescript
import "@simplysm/sd-core-browser";

const blob = new Blob(["Hello, world!"], { type: "text/plain" });
blob.download("hello.txt");
```

---

### Element Extensions (`Element.ext`)

Imported automatically when you import `@simplysm/sd-core-browser`. Adds utility methods to the native `Element` prototype.

#### `Element.prototype.prependChild<T extends Element>(newChild: T): T`

Inserts `newChild` as the first child of the element (before any existing children). Returns the inserted child.

#### `Element.prototype.findAll<T extends Element>(selector: string): T[]`

Returns all descendant elements matching `selector`, scoped to the current element (uses `:scope`).

#### `Element.prototype.findFirst<T extends Element>(selector: string): T | undefined`

Returns the first descendant element matching `selector`, scoped to the current element.

#### `Element.prototype.getParents(): HTMLElement[]`

Returns all ancestor `HTMLElement`s from the direct parent up to (but not including) the document root.

#### `Element.prototype.findParent(selector: string): HTMLElement | undefined` _(deprecated)_

#### `Element.prototype.findParent(element: Element): HTMLElement | undefined` _(deprecated)_

> **Deprecated**: Use the browser-native `Element.closest()` instead.

#### `Element.prototype.isFocusable(): boolean`

Returns `true` if the element matches common focusable selectors.

#### `Element.prototype.findFocusableAll(): TFocusableElement[]`

Returns all focusable descendant elements.

#### `Element.prototype.findFocusableFirst(): TFocusableElement | undefined`

Returns the first focusable descendant element.

#### `Element.prototype.findFocusableParent(): TFocusableElement | undefined`

Traverses ancestors to find the nearest focusable parent.

#### `Element.prototype.isOffsetElement(): boolean`

Returns `true` if the element has CSS `position` of `relative`, `absolute`, `fixed`, or `sticky`.

#### `Element.prototype.isVisible(): boolean`

Returns `true` if the element is visually visible (has client rects, `visibility !== "hidden"`, `opacity !== "0"`).

#### `Element.prototype.copyAsync(): Promise<void>`

Copies the element's content to the clipboard (input value or innerHTML).

#### `Element.prototype.pasteAsync(): Promise<void>`

Pastes clipboard text into the element's first input or itself.

---

### HTMLElement Extensions (`HtmlElement.ext`)

Imported automatically when you import `@simplysm/sd-core-browser`.

#### `HTMLElement.prototype.repaint(): void`

Forces a browser repaint by reading `offsetHeight`.

#### `HTMLElement.prototype.getRelativeOffset(parentElement: HTMLElement): { top: number; left: number }`

#### `HTMLElement.prototype.getRelativeOffset(parentSelector: string): { top: number; left: number }`

Calculates the offset of the element relative to a parent element or selector. Accounts for scroll, borders, and CSS transforms. Throws if parent is not found.

```typescript
const offset = childEl.getRelativeOffset(containerEl);
// or
const offset2 = childEl.getRelativeOffset(".scroll-container");
```

#### `HTMLElement.prototype.scrollIntoViewIfNeeded(target: { top: number; left: number }, offset?: { top: number; left: number }): void`

Scrolls `this` element so that `target` coordinates are visible, with an optional `offset` padding.

```typescript
container.scrollIntoViewIfNeeded(itemOffset, { top: 8, left: 0 });
```

---

### HtmlElementUtils

```typescript
import { HtmlElementUtils } from "@simplysm/sd-core-browser";
```

#### `HtmlElementUtils.getBoundsAsync(els: HTMLElement[]): Promise<{ target: HTMLElement; top: number; left: number; width: number; height: number }[]>`

Uses `IntersectionObserver` to asynchronously retrieve bounding rectangles for multiple elements at once.

```typescript
const bounds = await HtmlElementUtils.getBoundsAsync(els);
for (const b of bounds) {
  console.log(b.target, b.top, b.left, b.width, b.height);
}
```

## Types

### `TFocusableElement`

Internal type used by `Element` extension methods:

```typescript
type TFocusableElement = Element & HTMLOrSVGElement;
```

Returned by `findFocusableAll`, `findFocusableFirst`, and `findFocusableParent`. Not exported from the public API.
