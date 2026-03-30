# @simplysm/core-browser

Browser-specific core utilities for the Simplysm framework. Provides DOM element extensions, download/fetch helpers, file dialog, and IndexedDB abstractions.

## Installation

```bash
npm install @simplysm/core-browser
```

## API Overview

### Element Extensions

| API | Type | Description |
|-----|------|-------------|
| `ElementBounds` | interface | Bounding rect info for an element |
| `Element.prototype.findAll` | method | Find all descendant elements matching a CSS selector |
| `Element.prototype.findFirst` | method | Find the first descendant element matching a CSS selector |
| `Element.prototype.prependChild` | method | Insert a child as the first element child |
| `Element.prototype.getParents` | method | Get all ancestor elements (nearest first) |
| `Element.prototype.findFocusableParent` | method | Find the nearest focusable ancestor |
| `Element.prototype.findFirstFocusableChild` | method | Find the first focusable descendant |
| `Element.prototype.isOffsetElement` | method | Check if element is an offset parent |
| `Element.prototype.isVisible` | method | Check if element is visible on screen |
| `copyElement` | function | Copy element content to clipboard via ClipboardEvent |
| `pasteToElement` | function | Paste clipboard content into element via ClipboardEvent |
| `getBounds` | function | Get bounding info for multiple elements using IntersectionObserver |

> See [docs/element-extensions.md](./docs/element-extensions.md) for details.

### HTML Element Extensions

| API | Type | Description |
|-----|------|-------------|
| `HTMLElement.prototype.repaint` | method | Force a synchronous repaint |
| `HTMLElement.prototype.getRelativeOffset` | method | Calculate position relative to a parent element |
| `HTMLElement.prototype.scrollIntoViewIfNeeded` | method | Scroll container so target is not hidden by offset areas |

> See [docs/html-element-extensions.md](./docs/html-element-extensions.md) for details.

### Download

| API | Type | Description |
|-----|------|-------------|
| `downloadBlob` | function | Download a Blob as a file |

> See [docs/download.md](./docs/download.md) for details.

### Fetch

| API | Type | Description |
|-----|------|-------------|
| `DownloadProgress` | interface | Progress info for fetch downloads |
| `fetchUrlBytes` | function | Download binary data from a URL with progress callback |

> See [docs/fetch.md](./docs/fetch.md) for details.

### File Dialog

| API | Type | Description |
|-----|------|-------------|
| `openFileDialog` | function | Programmatically open a file picker dialog |

> See [docs/file-dialog.md](./docs/file-dialog.md) for details.

### IndexedDB Store

| API | Type | Description |
|-----|------|-------------|
| `StoreConfig` | interface | Configuration for an IndexedDB object store |
| `IndexedDbStore` | class | Generic IndexedDB wrapper with CRUD operations |

> See [docs/indexed-db-store.md](./docs/indexed-db-store.md) for details.

### IndexedDB Virtual FS

| API | Type | Description |
|-----|------|-------------|
| `VirtualFsEntry` | interface | Entry representing a file or directory in the virtual FS |
| `IndexedDbVirtualFs` | class | Virtual file system backed by IndexedDB |

> See [docs/indexed-db-virtual-fs.md](./docs/indexed-db-virtual-fs.md) for details.

## Usage Examples

### Copy/Paste with ClipboardEvent

```typescript
import { copyElement, pasteToElement } from "@simplysm/core-browser";

document.addEventListener("copy", (event) => copyElement(event));
document.addEventListener("paste", (event) => pasteToElement(event));
```

### Download a Blob

```typescript
import { downloadBlob } from "@simplysm/core-browser";

const blob = new Blob(["hello"], { type: "text/plain" });
downloadBlob(blob, "hello.txt");
```

### Fetch binary data with progress

```typescript
import { fetchUrlBytes } from "@simplysm/core-browser";

const data = await fetchUrlBytes("/api/file.bin", {
  onProgress: ({ receivedLength, contentLength }) => {
    console.log(`${receivedLength} / ${contentLength}`);
  },
});
```

### Open a file dialog

```typescript
import { openFileDialog } from "@simplysm/core-browser";

const files = await openFileDialog({ accept: ".csv", multiple: true });
if (files) {
  for (const file of files) {
    console.log(file.name);
  }
}
```

### IndexedDB Store

```typescript
import { IndexedDbStore } from "@simplysm/core-browser";

const store = new IndexedDbStore("myDb", 1, [{ name: "items", keyPath: "id" }]);
await store.put("items", { id: "1", value: "hello" });
const item = await store.get<{ id: string; value: string }>("items", "1");
store.close();
```

### Get element bounds

```typescript
import { getBounds } from "@simplysm/core-browser";

const elements = document.querySelectorAll(".card");
const bounds = await getBounds([...elements]);
for (const b of bounds) {
  console.log(`${b.target.tagName}: ${b.top}, ${b.left}, ${b.width}x${b.height}`);
}
```
