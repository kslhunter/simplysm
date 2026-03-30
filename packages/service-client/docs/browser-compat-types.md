# Browser Compat Types

Cross-environment compatible types that replace DOM-only types (`FileList`, `BlobPart`, `Worker`, `Transferable`) so that typecheck passes in both Node.js and browser environments.

## `BlobInput`

Blob constructor data type replacing DOM `BlobPart`.

```typescript
export type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string;
```

## `FileCollection`

File collection interface replacing DOM `FileList`. Structurally compatible with browser `FileList`.

```typescript
export interface FileCollection {
  readonly length: number;
  item(index: number): File | null;
  [index: number]: File;
  [Symbol.iterator](): IterableIterator<File>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `length` | `number` (readonly) | Number of files in the collection |
| `item(index)` | `(index: number) => File \| null` | Returns the file at the given index |
| `[index]` | `File` | Index accessor |
| `[Symbol.iterator]` | `() => IterableIterator<File>` | Iterable protocol support |

## `WorkerLike`

Web Worker interface replacing DOM `Worker`. Structurally compatible with browser `Worker`.

```typescript
export interface WorkerLike {
  onmessage: ((ev: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: unknown[]): void;
  terminate(): void;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `onmessage` | `((ev: MessageEvent) => void) \| null` | Message event handler |
| `postMessage` | `(message: unknown, transfer?: unknown[]) => void` | Posts a message to the worker |
| `terminate` | `() => void` | Terminates the worker |

## `isWorkerSupported`

Checks whether Web Worker API is available in the current environment.

```typescript
export function isWorkerSupported(): boolean;
```

**Returns:** `boolean` -- `true` if `Worker` exists in `globalThis`.

## `createBrowserWorker`

Creates a Web Worker instance. Returns `undefined` if the environment does not support workers.

```typescript
export function createBrowserWorker(
  url: URL,
  options: { type: string },
): WorkerLike | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `URL` | Worker script URL |
| `options` | `{ type: string }` | Worker options (e.g., `{ type: "module" }`) |

**Returns:** `WorkerLike | undefined`
