# @simplysm/core-browser

Simplysm package - Core module (browser). Browser-only utilities including DOM extensions, file downloads, IndexedDB storage, and virtual file system.

## Installation

```bash
npm install @simplysm/core-browser
```

## Side-Effect Imports

This package includes side-effect imports that augment global prototypes when the module is loaded:

- `Element.prototype` -- Adds `findAll`, `findFirst`, `prependChild`, `getParents`, `findFocusableParent`, `findFirstFocusableChild`, `isOffsetElement`, `isVisible`.
- `HTMLElement.prototype` -- Adds `repaint`, `getRelativeOffset`, `scrollIntoViewIfNeeded`.

These side effects run automatically when you import from `@simplysm/core-browser`.

## API Overview

### Element Extensions

| API | Type | Description |
|-----|------|-------------|
| `ElementBounds` | interface | Element bounds info (`target`, `top`, `left`, `width`, `height`) |
| `Element.findAll` | prototype method | Find all child elements matching a CSS selector |
| `Element.findFirst` | prototype method | Find first element matching a CSS selector |
| `Element.prependChild` | prototype method | Insert element as first child |
| `Element.getParents` | prototype method | Get all parent elements (closest to farthest) |
| `Element.findFocusableParent` | prototype method | Find first focusable parent element |
| `Element.findFirstFocusableChild` | prototype method | Find first focusable child element |
| `Element.isOffsetElement` | prototype method | Check if element has offset positioning |
| `Element.isVisible` | prototype method | Check if element is visible on screen |
| `copyElement` | function | Copy element content to clipboard via ClipboardEvent |
| `pasteToElement` | function | Paste clipboard content to element via ClipboardEvent |
| `getBounds` | function | Get bounds for multiple elements using IntersectionObserver |

-> See [docs/element-extensions.md](./docs/element-extensions.md) for details.

### HTMLElement Extensions

| API | Type | Description |
|-----|------|-------------|
| `HTMLElement.repaint` | prototype method | Force repaint (triggers reflow) |
| `HTMLElement.getRelativeOffset` | prototype method | Calculate position relative to a parent element |
| `HTMLElement.scrollIntoViewIfNeeded` | prototype method | Scroll to make target visible if obscured |

-> See [docs/html-element-extensions.md](./docs/html-element-extensions.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `downloadBlob` | function | Download a Blob as a file |
| `DownloadProgress` | interface | Download progress info (`receivedLength`, `contentLength`) |
| `fetchUrlBytes` | function | Download binary data from URL with progress callback |
| `openFileDialog` | function | Programmatically open file selection dialog |

-> See [docs/utilities.md](./docs/utilities.md) for details.

### Classes

| API | Type | Description |
|-----|------|-------------|
| `StoreConfig` | interface | IndexedDB store configuration (`name`, `keyPath`) |
| `IndexedDbStore` | class | IndexedDB wrapper for key-value storage |
| `VirtualFsEntry` | interface | Virtual file system entry (`kind`, `dataBase64`) |
| `IndexedDbVirtualFs` | class | IndexedDB-backed virtual file system |

-> See [docs/classes.md](./docs/classes.md) for details.

## Usage Examples

### Download a file

```typescript
import { downloadBlob } from "@simplysm/core-browser";

const blob = new Blob(["Hello"], { type: "text/plain" });
downloadBlob(blob, "hello.txt");
```

### Open file dialog and read files

```typescript
import { openFileDialog } from "@simplysm/core-browser";

const files = await openFileDialog({ accept: ".csv", multiple: true });
if (files) {
  for (const file of files) {
    const text = await file.text();
  }
}
```

### Use IndexedDB store

```typescript
import { IndexedDbStore } from "@simplysm/core-browser";

const store = new IndexedDbStore("myApp", 1, [{ name: "settings", keyPath: "key" }]);
await store.put("settings", { key: "theme", value: "dark" });
const item = await store.get<{ key: string; value: string }>("settings", "theme");
store.close();
```
