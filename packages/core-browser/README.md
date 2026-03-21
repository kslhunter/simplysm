# @simplysm/core-browser

Core module (browser) -- browser-only utilities including DOM extensions, file downloads, IndexedDB storage, and virtual file system.

## Installation

```bash
npm install @simplysm/core-browser
```

## Side-Effect Imports

This package includes side-effect imports that augment global prototypes when the module is loaded:

- `import "./extensions/element-ext"` -- Adds methods to `Element.prototype` (`findAll`, `findFirst`, `prependChild`, `getParents`, `findFocusableParent`, `findFirstFocusableChild`, `isOffsetElement`, `isVisible`).
- `import "./extensions/html-element-ext"` -- Adds methods to `HTMLElement.prototype` (`repaint`, `getRelativeOffset`, `scrollIntoViewIfNeeded`).

These side effects run automatically when you import from `@simplysm/core-browser`.

## API Overview

### Extensions -- Element

| API | Type | Description |
|-----|------|-------------|
| `ElementBounds` | interface | Element bounds info (`target`, `top`, `left`, `width`, `height`) |
| `copyElement` | function | Copy element content to clipboard via ClipboardEvent |
| `pasteToElement` | function | Paste clipboard content to element via ClipboardEvent |
| `getBounds` | function | Get bounds for multiple elements using IntersectionObserver |
| `Element.findAll` | prototype method | Find all child elements matching a CSS selector |
| `Element.findFirst` | prototype method | Find first element matching a CSS selector |
| `Element.prependChild` | prototype method | Insert element as first child |
| `Element.getParents` | prototype method | Get all parent elements (closest to farthest) |
| `Element.findFocusableParent` | prototype method | Find first focusable parent element |
| `Element.findFirstFocusableChild` | prototype method | Find first focusable child element |
| `Element.isOffsetElement` | prototype method | Check if element has offset positioning |
| `Element.isVisible` | prototype method | Check if element is visible on screen |

### Extensions -- HTMLElement

| API | Type | Description |
|-----|------|-------------|
| `HTMLElement.repaint` | prototype method | Force repaint (triggers reflow) |
| `HTMLElement.getRelativeOffset` | prototype method | Calculate position relative to a parent element |
| `HTMLElement.scrollIntoViewIfNeeded` | prototype method | Scroll to make target visible if obscured |

### Utils

| API | Type | Description |
|-----|------|-------------|
| `downloadBlob` | function | Download a Blob as a file |
| `DownloadProgress` | interface | Download progress info (`receivedLength`, `contentLength`) |
| `fetchUrlBytes` | function | Download binary data from URL with progress callback |
| `openFileDialog` | function | Programmatically open file selection dialog |
| `StoreConfig` | interface | IndexedDB store configuration (`name`, `keyPath`) |
| `IndexedDbStore` | class | IndexedDB wrapper for key-value storage |
| `VirtualFsEntry` | interface | Virtual file system entry (`kind`, `dataBase64`) |
| `IndexedDbVirtualFs` | class | IndexedDB-backed virtual file system |

## `ElementBounds`

```typescript
interface ElementBounds {
  target: Element;
  top: number;
  left: number;
  width: number;
  height: number;
}
```

## `copyElement`

```typescript
function copyElement(event: ClipboardEvent): void;
```

Copy element content to clipboard. Use as a copy event handler.

## `pasteToElement`

```typescript
function pasteToElement(event: ClipboardEvent): void;
```

Paste clipboard content to element. Finds the first `input`/`textarea` within the target and replaces its value.

## `getBounds`

```typescript
async function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>;
```

Get bounds information for elements using IntersectionObserver. Throws `TimeoutError` if no response within `timeout` ms (default: 5000).

## `downloadBlob`

```typescript
function downloadBlob(blob: Blob, fileName: string): void;
```

Download a Blob as a file by creating a temporary object URL and clicking a link.

## `DownloadProgress`

```typescript
interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}
```

## `fetchUrlBytes`

```typescript
async function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>;
```

Download binary data from URL with optional progress callback. Pre-allocates memory when Content-Length is known.

## `openFileDialog`

```typescript
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>;
```

Programmatically open a file selection dialog. Returns `undefined` if cancelled.

## `StoreConfig`

```typescript
interface StoreConfig {
  name: string;
  keyPath: string;
}
```

## `IndexedDbStore`

```typescript
class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[]);
  async open(): Promise<IDBDatabase>;
  async withStore<TResult>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult>;
  async get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>;
  async put(storeName: string, value: unknown): Promise<void>;
  async delete(storeName: string, key: IDBValidKey): Promise<void>;
  async getAll<TItem>(storeName: string): Promise<TItem[]>;
  close(): void;
}
```

IndexedDB wrapper that manages database connections, schema upgrades, and transactional CRUD operations.

## `VirtualFsEntry`

```typescript
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

## `IndexedDbVirtualFs`

```typescript
class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string);
  async getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>;
  async putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>;
  async deleteByPrefix(keyPrefix: string): Promise<boolean>;
  async listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>;
  async ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>;
}
```

Virtual file system backed by IndexedDB. Stores files and directories as key-value entries with hierarchical path support.

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
