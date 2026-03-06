# @simplysm/core-browser

Simplysm package - Core module (browser)

Browser-only utilities including DOM element extensions, file download helpers, fetch utilities, file dialog helpers, and IndexedDB wrappers.

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

### `element.findAll<TEl>(selector)`

Finds all child elements matching a CSS selector.

- Returns an empty array if the selector is empty.

```ts
import "@simplysm/core-browser";

const items = containerEl.findAll<HTMLLIElement>("li.active");
```

**Signature:**

```ts
findAll<TEl extends Element = Element>(selector: string): TEl[]
```

---

### `element.findFirst<TEl>(selector)`

Finds the first child element matching a CSS selector.

- Returns `undefined` if the selector is empty or no match is found.

```ts
import "@simplysm/core-browser";

const input = formEl.findFirst<HTMLInputElement>("input[name='email']");
```

**Signature:**

```ts
findFirst<TEl extends Element = Element>(selector: string): TEl | undefined
```

---

### `element.prependChild<TEl>(child)`

Inserts a child element as the first child of the element.

```ts
import "@simplysm/core-browser";

const newEl = document.createElement("div");
containerEl.prependChild(newEl);
```

**Signature:**

```ts
prependChild<TEl extends Element>(child: TEl): TEl
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

## IndexedDB Store

### `IndexedDbStore`

A thin wrapper around the browser `IndexedDB` API for typed key-value object stores. Opens a versioned database, auto-creates stores on upgrade, and closes the connection after each operation.

```ts
import { IndexedDbStore } from "@simplysm/core-browser";

const db = new IndexedDbStore("my-db", 1, [
  { name: "users", keyPath: "id" },
]);

await db.put("users", { id: 1, name: "Alice" });
const user = await db.get<{ id: number; name: string }>("users", 1);
const all = await db.getAll<{ id: number; name: string }>("users");
```

**Constructor:**

```ts
new IndexedDbStore(
  dbName: string,
  dbVersion: number,
  storeConfigs: StoreConfig[],
)
```

**Methods:**

```ts
open(): Promise<IDBDatabase>

withStore<TResult>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<TResult>,
): Promise<TResult>

get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>

put(storeName: string, value: unknown): Promise<void>

getAll<TItem>(storeName: string): Promise<TItem[]>
```

- `open()` — opens the database and returns the raw `IDBDatabase`. Creates missing object stores declared in `storeConfigs`. Rejects if the connection is blocked.
- `withStore()` — executes `fn` inside a single transaction on `storeName`. Aborts the transaction if `fn` throws. Closes the database when the transaction completes.
- `get()` — retrieves one record by `key` from `storeName`. Returns `undefined` if not found.
- `put()` — inserts or updates a record in `storeName`.
- `getAll()` — retrieves all records from `storeName`.

---

## IndexedDB Virtual Filesystem

### `IndexedDbVirtualFs`

A virtual filesystem built on top of `IndexedDbStore`. Each entry is stored as a flat key (slash-separated path string) with a kind (`"file"` or `"dir"`) and optional base64 data payload.

```ts
import { IndexedDbStore, IndexedDbVirtualFs } from "@simplysm/core-browser";

const db = new IndexedDbStore("my-fs-db", 1, [
  { name: "fs", keyPath: "fullKey" },
]);
const vfs = new IndexedDbVirtualFs(db, "fs", "fullKey");

await vfs.putEntry("/docs/readme.txt", "file", btoa("hello"));
const entry = await vfs.getEntry("/docs/readme.txt");
const children = await vfs.listChildren("/docs/");
await vfs.deleteByPrefix("/docs");
```

**Constructor:**

```ts
new IndexedDbVirtualFs(
  db: IndexedDbStore,
  storeName: string,
  keyField: string,
)
```

- `db` — an `IndexedDbStore` instance to use for persistence.
- `storeName` — the object store name within the database.
- `keyField` — the field name used as the primary key in stored records.

**Methods:**

```ts
getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>

putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>

deleteByPrefix(keyPrefix: string): Promise<boolean>

listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>

ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>
```

- `getEntry()` — retrieves the entry for `fullKey`. Returns `undefined` if not found.
- `putEntry()` — writes or overwrites an entry with the given `kind` and optional base64 data.
- `deleteByPrefix()` — deletes all entries whose key equals `keyPrefix` or starts with `keyPrefix + "/"`. Returns `true` if at least one entry was deleted.
- `listChildren()` — lists the immediate children under `prefix`. Each result includes `name` (the path segment) and `isDirectory`.
- `ensureDir()` — creates directory entries for every path segment in `dirPath` if they do not already exist. `fullKeyBuilder` maps a path string to the full store key.

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

---

### `StoreConfig`

Configuration for a single object store within an `IndexedDbStore`.

```ts
interface StoreConfig {
  /** Object store name */
  name: string;
  /** Primary key field path */
  keyPath: string;
}
```

---

### `VirtualFsEntry`

A single entry stored in the `IndexedDbVirtualFs`.

```ts
interface VirtualFsEntry {
  /** Entry kind: "file" or "dir" */
  kind: "file" | "dir";
  /** File contents encoded as base64 (only present for file entries) */
  dataBase64?: string;
}
```
