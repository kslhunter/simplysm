# @simplysm/core-browser

Simplysm package - Core module (browser)

Browser-only utilities including DOM element extensions, file download helpers, fetch utilities, and file dialog helpers.

## Installation

```bash
pnpm add @simplysm/core-browser
```

Import the package to activate side-effect extensions on `Element` and `HTMLElement`:

```ts
import "@simplysm/core-browser";
```

---

## Element Extensions

Extends the global `Element` interface with utility methods. These are activated as side effects when the package is imported.

### `element.findAll<T>(selector)`

Finds all child elements matching a CSS selector.

- Returns an empty array if the selector is empty.

```ts
import "@simplysm/core-browser";

const items = containerEl.findAll<HTMLLIElement>("li.active");
```

**Signature:**

```ts
findAll<T extends Element = Element>(selector: string): T[]
```

---

### `element.findFirst<T>(selector)`

Finds the first child element matching a CSS selector.

- Returns `undefined` if the selector is empty or no match is found.

```ts
import "@simplysm/core-browser";

const input = formEl.findFirst<HTMLInputElement>("input[name='email']");
```

**Signature:**

```ts
findFirst<T extends Element = Element>(selector: string): T | undefined
```

---

### `element.prependChild<T>(child)`

Inserts a child element as the first child of the element.

```ts
import "@simplysm/core-browser";

const newEl = document.createElement("div");
containerEl.prependChild(newEl);
```

**Signature:**

```ts
prependChild<T extends Element>(child: T): T
```

---

### `element.getParents()`

Returns all ancestor elements in order from closest to farthest.

```ts
import "@simplysm/core-browser";

const parents = someEl.getParents();
// parents[0] is the immediate parent, parents[n-1] is the farthest ancestor
```

**Signature:**

```ts
getParents(): Element[]
```

---

### `element.findFocusableParent()`

Finds the first focusable ancestor element using the `tabbable` library's focusability check.

- Returns `undefined` if no focusable parent is found.

```ts
import "@simplysm/core-browser";

const focusableParent = someEl.findFocusableParent();
focusableParent?.focus();
```

**Signature:**

```ts
findFocusableParent(): HTMLElement | undefined
```

---

### `element.findFirstFocusableChild()`

Finds the first focusable descendant element using a `TreeWalker` and the `tabbable` library's focusability check.

- Returns `undefined` if no focusable child is found.

```ts
import "@simplysm/core-browser";

const firstFocusable = dialogEl.findFirstFocusableChild();
firstFocusable?.focus();
```

**Signature:**

```ts
findFirstFocusableChild(): HTMLElement | undefined
```

---

### `element.isOffsetElement()`

Checks whether the element has a CSS `position` of `relative`, `absolute`, `fixed`, or `sticky`.

```ts
import "@simplysm/core-browser";

if (someEl.isOffsetElement()) {
  // element is a positioning context
}
```

**Signature:**

```ts
isOffsetElement(): boolean
```

---

### `element.isVisible()`

Checks whether the element is visible on screen.

Considers:
- Presence of client rects (`getClientRects().length > 0`)
- `visibility: hidden`
- `opacity: 0`

```ts
import "@simplysm/core-browser";

if (someEl.isVisible()) {
  // element is visible
}
```

**Signature:**

```ts
isVisible(): boolean
```

---

## HTMLElement Extensions

Extends the global `HTMLElement` interface with utility methods. These are activated as side effects when the package is imported.

### `htmlElement.repaint()`

Forces a browser repaint by triggering a synchronous reflow.

Accessing `offsetHeight` forces the browser to flush pending style changes immediately.

```ts
import "@simplysm/core-browser";

el.classList.add("animate");
el.repaint(); // flush styles
el.classList.add("animate-active");
```

**Signature:**

```ts
repaint(): void
```

---

### `htmlElement.getRelativeOffset(parent)`

Calculates the element's position relative to a parent element, returning coordinates suitable for use directly in CSS `top`/`left` properties.

Accounts for:
- Viewport-relative position (`getBoundingClientRect`)
- Document scroll position (`window.scrollX/Y`)
- Parent element internal scroll (`scrollTop/Left`)
- Border widths of intermediate elements
- CSS `transform` on element and parent

Typical use: positioning dropdowns or popups appended to `document.body`.

- `parent` — a reference `HTMLElement` or a CSS selector string (resolved via `closest`)
- Throws `ArgumentError` if the parent element cannot be found.

```ts
import "@simplysm/core-browser";

const popup = document.createElement("div");
document.body.appendChild(popup);
const { top, left } = triggerEl.getRelativeOffset(document.body);
popup.style.top = `${top}px`;
popup.style.left = `${left}px`;
```

**Signature:**

```ts
getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }
```

---

### `htmlElement.scrollIntoViewIfNeeded(target, offset?)`

Scrolls the element so that a target position becomes visible, but only if the target is hidden behind an offset area (e.g., a fixed header or fixed column).

- Only handles cases where the target is obscured from the top or left. Downward/rightward scrolling relies on the browser's default focus behavior.
- Typically used with focus events on tables with fixed headers or columns.

```ts
import "@simplysm/core-browser";

tableEl.scrollIntoViewIfNeeded(
  { top: row.offsetTop, left: row.offsetLeft },
  { top: 48, left: 120 }, // fixed header height and fixed column width
);
```

**Signature:**

```ts
scrollIntoViewIfNeeded(
  target: { top: number; left: number },
  offset?: { top: number; left: number },
): void
```

---

## Static Element Utilities

Standalone functions exported from `element-ext`.

### `copyElement(event)`

Copies the value of the first `input` or `textarea` inside the event target element to the clipboard.

Intended for use as a `copy` event handler.

```ts
import { copyElement } from "@simplysm/core-browser";

someEl.addEventListener("copy", copyElement);
```

**Signature:**

```ts
function copyElement(event: ClipboardEvent): void
```

---

### `pasteToElement(event)`

Pastes plain-text clipboard content into the first `input` or `textarea` inside the event target element, replacing its entire value.

Intended for use as a `paste` event handler. Does not consider cursor position or selection.

```ts
import { pasteToElement } from "@simplysm/core-browser";

someEl.addEventListener("paste", pasteToElement);
```

**Signature:**

```ts
function pasteToElement(event: ClipboardEvent): void
```

---

### `getBounds(els, timeout?)`

Retrieves bounding box information for multiple elements using `IntersectionObserver`. Results are returned in the same order as the input array.

- Deduplicates elements internally.
- Returns an empty array if `els` is empty.
- Throws `TimeoutError` if results are not received within `timeout` milliseconds (default: `5000`).

```ts
import { getBounds } from "@simplysm/core-browser";

const bounds = await getBounds([el1, el2]);
for (const { target, top, left, width, height } of bounds) {
  console.log(target, top, left, width, height);
}
```

**Signature:**

```ts
function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>
```

---

## Download Utilities

### `downloadBlob(blob, fileName)`

Triggers a file download in the browser for a given `Blob` object.

Creates a temporary object URL, simulates an anchor click, and revokes the URL after 1 second.

```ts
import { downloadBlob } from "@simplysm/core-browser";

const blob = new Blob(["hello"], { type: "text/plain" });
downloadBlob(blob, "hello.txt");
```

**Signature:**

```ts
function downloadBlob(blob: Blob, fileName: string): void
```

---

## Fetch Utilities

### `fetchUrlBytes(url, options?)`

Downloads binary data from a URL and returns it as a `Uint8Array`, with optional progress reporting.

- When `Content-Length` is known, pre-allocates memory for efficiency.
- When `Content-Length` is unknown (chunked transfer encoding), collects chunks then merges.
- Throws an `Error` if the response is not OK or the body is not readable.

```ts
import { fetchUrlBytes } from "@simplysm/core-browser";

const bytes = await fetchUrlBytes("https://example.com/file.bin", {
  onProgress: ({ receivedLength, contentLength }) => {
    console.log(`${receivedLength} / ${contentLength}`);
  },
});
```

**Signature:**

```ts
function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>
```

---

## File Dialog Utilities

### `openFileDialog(options?)`

Programmatically opens a browser file selection dialog and returns the selected files.

- Returns `undefined` if the user cancels or selects no files.
- `options.accept` — MIME type or file extension filter (e.g., `"image/*"`, `".pdf"`)
- `options.multiple` — allow selecting multiple files (default: `false`)

```ts
import { openFileDialog } from "@simplysm/core-browser";

const files = await openFileDialog({ accept: ".csv", multiple: true });
if (files) {
  for (const file of files) {
    console.log(file.name);
  }
}
```

**Signature:**

```ts
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>
```

---

## Types

### `ElementBounds`

Bounding box information for an element, returned by `getBounds`.

```ts
interface ElementBounds {
  /** Element that was measured */
  target: Element;
  /** Top position relative to the viewport */
  top: number;
  /** Left position relative to the viewport */
  left: number;
  /** Element width */
  width: number;
  /** Element height */
  height: number;
}
```

---

### `DownloadProgress`

Progress information passed to the `onProgress` callback of `fetchUrlBytes`.

```ts
interface DownloadProgress {
  /** Number of bytes received so far */
  receivedLength: number;
  /** Total content length in bytes (0 if unknown) */
  contentLength: number;
}
```
