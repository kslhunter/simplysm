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
| `findAll<T>(selector)` | `T[]` | Search all descendant elements by selector |
| `findFirst<T>(selector)` | `T \| undefined` | Search first matching element by selector |
| `prependChild<T>(child)` | `T` | Insert element as first child |
| `getParents()` | `Element[]` | Return list of all parent elements (closest first) |
| `findFocusableParent()` | `HTMLElement \| undefined` | Search for first focusable element among parents |
| `findFirstFocusableChild()` | `HTMLElement \| undefined` | Search for first focusable element among children |
| `isOffsetElement()` | `boolean` | Check if element is an offset reference element |
| `isVisible()` | `boolean` | Check element visibility |

### HTMLElement Extension Methods

Instance methods automatically added to `HTMLElement.prototype`.

| Method | Return Type | Description |
|--------|-----------|------|
| `repaint()` | `void` | Trigger forced repaint |
| `getRelativeOffset(parent)` | `{ top, left }` | Calculate relative position based on parent element |
| `scrollIntoViewIfNeeded(target, offset?)` | `void` | Adjust scroll if obscured by fixed regions |

### Static Functions

| Function | Return Type | Description |
|------|-----------|------|
| `copyElement(event)` | `void` | Copy element content to clipboard |
| `pasteToElement(event)` | `void` | Paste clipboard content into element |
| `getBounds(els, timeout?)` | `Promise<ElementBounds[]>` | Query element bounds using IntersectionObserver |

### Download Utilities

| Function | Return Type | Description |
|------|-----------|------|
| `downloadBlob(blob, fileName)` | `void` | Download Blob as file |
| `fetchUrlBytes(url, options?)` | `Promise<Uint8Array>` | Download binary data from URL (with progress callback support) |

### File Dialog

| Function | Return Type | Description |
|------|-----------|------|
| `openFileDialog(options?)` | `Promise<File[] \| undefined>` | Open file selection dialog (supports single/multiple file selection) |

### Types

| Type | Description |
|------|------|
| `ElementBounds` | Element bounds information (`target`, `top`, `left`, `width`, `height`) |
| `DownloadProgress` | Download progress information (`receivedLength`, `contentLength`) |

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

// Calculate relative position based on parent element (can be used directly for CSS top/left)
const offset = element.getRelativeOffset(document.body);
popup.style.top = `${offset.top}px`;
popup.style.left = `${offset.left}px`;

// Parent can also be specified by selector
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
// Copy value of first input/textarea within target element to clipboard
element.addEventListener("copy", (e) => copyElement(e));

// Use in paste event handler
// Paste clipboard content into first input/textarea within target element
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
- The `getBounds()` function uses `IntersectionObserver` and works asynchronously. If all elements are not observed within the specified timeout (default 5000ms), a `TimeoutError` is thrown.
- The `getRelativeOffset()` method correctly handles elements with CSS `transform` applied. Border thickness and scroll position of intermediate elements are also included in the calculation.
- The `scrollIntoViewIfNeeded()` method only handles cases where the target is beyond the top/left boundaries. The bottom/right directions rely on the browser's default focus scrolling.
- The `fetchUrlBytes()` function improves memory efficiency by pre-allocating when the `Content-Length` header is available, and collects and merges chunks for chunked encoding.
- The `pasteToElement()` function replaces the entire value of the target input/textarea. It does not consider cursor position or selection range.

## License

Apache-2.0
