# @simplysm/core-browser

A browser-specific utility package for the Simplysm framework. It provides frequently needed features in browser environments such as DOM element traversal, clipboard handling, Blob downloads, and binary downloads.

This package includes both APIs that can be called directly as instance methods by extending `Element` and `HTMLElement` prototypes, and utilities in the form of static functions.

## Installation

```bash
npm install @simplysm/core-browser
# or
pnpm add @simplysm/core-browser
```

## Main Modules

### Element Extension Methods

Instance methods automatically added to `Element.prototype` when importing `"@simplysm/core-browser"`. Works as a side-effect import.

| Method | Return Type | Description |
|--------|-----------|------|
| `findAll<T>(selector: string)` | `T[]` | Search all descendant elements by selector. Returns empty array for empty selector. |
| `findFirst<T>(selector: string)` | `T \| undefined` | Search first matching element by selector. Returns `undefined` for empty selector. |
| `prependChild<T>(child: T)` | `T` | Insert element as first child |
| `getParents()` | `Element[]` | Return list of all parent elements (closest first) |
| `findFocusableParent()` | `HTMLElement \| undefined` | Search for first focusable element among parents (uses tabbable) |
| `findFirstFocusableChild()` | `HTMLElement \| undefined` | Search for first focusable element among children (uses tabbable) |
| `isOffsetElement()` | `boolean` | Check if element has `position: relative`, `absolute`, `fixed`, or `sticky` |
| `isVisible()` | `boolean` | Check element visibility (clientRects exist, not `visibility: hidden`, not `opacity: 0`) |

### HTMLElement Extension Methods

Instance methods automatically added to `HTMLElement.prototype`.

| Method | Return Type | Description |
|--------|-----------|------|
| `repaint()` | `void` | Trigger forced repaint by causing forced synchronous layout |
| `getRelativeOffset(parent: HTMLElement \| string)` | `{ top: number; left: number }` | Calculate document-based position relative to a parent element or CSS selector, suitable for CSS `top`/`left` (includes `window.scrollX/Y`, parent scroll, border widths, and CSS transforms) |
| `scrollIntoViewIfNeeded(target: { top: number; left: number }, offset?: { top: number; left: number })` | `void` | Adjust scroll so that target position is visible past any fixed offset regions (top/left only) |

### Static Functions

| Function | Return Type | Description |
|------|-----------|------|
| `copyElement(event: ClipboardEvent)` | `void` | Copy value of first `input`/`textarea` within the event target element to clipboard |
| `pasteToElement(event: ClipboardEvent)` | `void` | Paste clipboard text into the first `input`/`textarea` within the event target element |
| `getBounds(els: Element[], timeout?: number)` | `Promise<ElementBounds[]>` | Query element bounds using `IntersectionObserver`. Results are returned in input order. Default timeout: 5000ms. |

### Download Utilities

| Function | Return Type | Description |
|------|-----------|------|
| `downloadBlob(blob: Blob, fileName: string)` | `void` | Download a Blob as a file |
| `fetchUrlBytes(url: string, options?: { onProgress?: (progress: DownloadProgress) => void })` | `Promise<Uint8Array>` | Download binary data from a URL with optional progress callback |

### File Dialog

| Function | Return Type | Description |
|------|-----------|------|
| `openFileDialog(options?: { accept?: string; multiple?: boolean })` | `Promise<File[] \| undefined>` | Open a file selection dialog. Returns `undefined` if the user cancels without selecting. |

### Types

| Type | Description |
|------|------|
| `ElementBounds` | Element bounds information: `target: Element`, `top: number`, `left: number`, `width: number`, `height: number` |
| `DownloadProgress` | Download progress: `receivedLength: number`, `contentLength: number` |

## Usage Examples

### Element Extension Methods

```typescript
import "@simplysm/core-browser";

// Search descendant elements
const buttons = container.findAll<HTMLButtonElement>("button.primary");
const firstInput = container.findFirst<HTMLInputElement>("input[type='text']");

// Insert element as first child
const newEl = document.createElement("div");
container.prependChild(newEl);

// Query all parent elements (closest parent first)
const parents = element.getParents();

// Search focusable elements (based on tabbable library)
const focusableParent = element.findFocusableParent();
const focusableChild = element.findFirstFocusableChild();

// Check element state
if (element.isOffsetElement()) {
  // position is one of relative, absolute, fixed, sticky
}

if (element.isVisible()) {
  // Element is visible on screen (clientRects exist, visibility !== "hidden", opacity !== "0")
}
```

### HTMLElement Extension Methods

```typescript
import "@simplysm/core-browser";

// Forced repaint (useful for restarting CSS animations)
element.repaint();

// Calculate document-based position relative to a parent element (can be used directly for CSS top/left)
const offset = element.getRelativeOffset(document.body);
popup.style.top = `${offset.top}px`;
popup.style.left = `${offset.left}px`;

// Parent can also be specified by CSS selector (uses closest())
const offset2 = element.getRelativeOffset(".scroll-container");

// Adjust scroll position in table with fixed header/columns
const scrollContainer = document.getElementById("table-body") as HTMLElement;
const targetRow = document.getElementById("row-42") as HTMLElement;

scrollContainer.scrollIntoViewIfNeeded(
  { top: targetRow.offsetTop, left: targetRow.offsetLeft },
  { top: 50, left: 120 }, // Fixed header height 50px, fixed column width 120px
);
```

### Clipboard Handling

```typescript
import { copyElement, pasteToElement } from "@simplysm/core-browser";

// Use in copy event handler
// Copies value of the first input/textarea within the target element to clipboard
element.addEventListener("copy", (e) => copyElement(e));

// Use in paste event handler
// Pastes clipboard content into the first input/textarea within the target element
element.addEventListener("paste", (e) => pasteToElement(e));
```

### Asynchronous Element Bounds Query

```typescript
import { getBounds } from "@simplysm/core-browser";
import type { ElementBounds } from "@simplysm/core-browser";

const el1 = document.getElementById("item1")!;
const el2 = document.getElementById("item2")!;

// Query bounds information asynchronously using IntersectionObserver
const bounds: ElementBounds[] = await getBounds([el1, el2]);

for (const b of bounds) {
  console.log(b.target);  // Target element being measured
  console.log(b.top);     // Top position relative to viewport
  console.log(b.left);    // Left position relative to viewport
  console.log(b.width);   // Element width
  console.log(b.height);  // Element height
}

// Specify custom timeout (default: 5000ms)
// TimeoutError is thrown if timeout is exceeded
const bounds2 = await getBounds([el1], 3000);
```

### Blob Download

```typescript
import { downloadBlob } from "@simplysm/core-browser";

// Download Blob object as file
const blob = new Blob(["Hello, World!"], { type: "text/plain" });
downloadBlob(blob, "hello.txt");

// Download binary data such as Excel files
const excelBlob = new Blob([excelData], {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});
downloadBlob(excelBlob, "report.xlsx");
```

### Binary Download (with Progress Support)

```typescript
import { fetchUrlBytes } from "@simplysm/core-browser";
import type { DownloadProgress } from "@simplysm/core-browser";

// Basic usage
const data: Uint8Array = await fetchUrlBytes("https://example.com/file.bin");

// Using progress callback
const data2 = await fetchUrlBytes("https://example.com/large-file.zip", {
  onProgress: (progress: DownloadProgress) => {
    const percent = progress.contentLength > 0
      ? Math.round((progress.receivedLength / progress.contentLength) * 100)
      : 0;
    console.log(`Download progress: ${percent}%`);
  },
});
```

### File Selection Dialog

```typescript
import { openFileDialog } from "@simplysm/core-browser";

// Open file selection dialog (single file)
const files = await openFileDialog({
  accept: "image/*", // Optional: specify accepted file types
});
if (files) {
  console.log("Selected file:", files[0].name);
}

// Open file selection dialog (multiple files)
const selectedFiles = await openFileDialog({
  accept: ".pdf,.doc,.docx",
  multiple: true,
});
if (selectedFiles) {
  selectedFiles.forEach((file) => {
    console.log("File:", file.name, "Size:", file.size);
  });
}
```

## Caveats

- This package is **browser-only**. It cannot be used in Node.js environments.
- `Element` and `HTMLElement` prototype extensions work as **side-effect imports**. Extensions are automatically applied when importing `"@simplysm/core-browser"` or any item from the package.
- The `getBounds()` function uses `IntersectionObserver` and works asynchronously. If all elements are not observed within the specified timeout (default 5000ms), a `TimeoutError` is thrown. Duplicate elements in the input array are deduplicated; results are returned in input order.
- The `getRelativeOffset()` method accepts either an `HTMLElement` or a CSS selector string as the `parent` parameter. When a string is given, it uses `closest()` to find the nearest matching ancestor. It throws `ArgumentError` if the parent element cannot be found. The returned coordinates are document-based (include `window.scrollX/Y`) and are suitable for use as CSS `top`/`left` values. Intermediate element border widths, parent scroll position, and CSS `transform` are all included in the calculation.
- The `scrollIntoViewIfNeeded()` method only handles cases where the target is beyond the top/left boundaries. The bottom/right directions rely on the browser's default focus scrolling.
- The `fetchUrlBytes()` function improves memory efficiency by pre-allocating a buffer when the `Content-Length` header is available, and collects and merges chunks for chunked encoding. Throws an `Error` if the response status is not ok or if the response body is not readable.
- The `pasteToElement()` function replaces the entire value of the target input/textarea. It does not consider cursor position or selection range. It dispatches an `input` event after the value is set.

## License

Apache-2.0
