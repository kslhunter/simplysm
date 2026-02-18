# Features

Async operation control and event handling classes. All support `using` statements or `dispose()`.

## DebounceQueue

Async debounce queue (executes only last request).

```typescript
import { DebounceQueue } from "@simplysm/core-common";

using queue = new DebounceQueue(300); // 300ms debounce delay

// Error handling
queue.on("error", (err) => console.error(err));

// Only last call is executed after the delay
queue.run(() => console.log("1")); // Ignored
queue.run(() => console.log("2")); // Ignored
queue.run(() => console.log("3")); // Executed after 300ms

// Omit delay for immediate execution (next event loop tick)
const immediate = new DebounceQueue();
```

> **Note:** A request added while the queue is running is executed immediately after the current run completes (no additional delay). This prevents requests from being lost.

---

## SerialQueue

Async serial queue (sequential execution). Each task starts only after the previous one completes.

```typescript
import { SerialQueue } from "@simplysm/core-common";

using queue = new SerialQueue(100); // 100ms gap between tasks (optional, default 0)

queue.on("error", (err) => console.error(err));

queue.run(async () => { await fetch("/api/1"); });
queue.run(async () => { await fetch("/api/2"); }); // Runs after #1 completes
queue.run(async () => { await fetch("/api/3"); }); // Runs after #2 completes
```

> **Note:** Errors in a task are caught and emitted (or logged). Subsequent tasks continue regardless.

---

## EventEmitter

EventTarget wrapper with type-safe events.

```typescript
import { EventEmitter } from "@simplysm/core-common";

interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyService extends EventEmitter<MyEvents> {
  process(): void {
    this.emit("data", "result data");
    this.emit("done"); // void type called without arguments
  }
}

const service = new MyService();
const listener = (data: string) => console.log(data);
service.on("data", listener);              // Register listener (type: string inferred)
service.off("data", listener);             // Remove specific listener
service.listenerCount("data");             // Number of registered listeners
service.dispose();                          // Remove all listeners
```

---

## ZipArchive

ZIP file compression/decompression utility. Resources can be auto-cleaned with `await using`.

```typescript
import { ZipArchive } from "@simplysm/core-common";

// Read ZIP file
await using archive = new ZipArchive(zipBytes);

// Get single file
const content = await archive.get("file.txt");          // Uint8Array | undefined
const exists = await archive.exists("data.json");       // boolean

// Extract all files (with optional progress callback)
const files = await archive.extractAll((progress) => {
  // progress: { fileName: string; totalSize: number; extractedSize: number }
  const pct = Math.round((progress.extractedSize / progress.totalSize) * 100);
  console.log(`${progress.fileName}: ${pct}%`);
});
// files: Map<string, Uint8Array | undefined>

// Create ZIP file
await using newArchive = new ZipArchive();
newArchive.write("file.txt", textBytes);
newArchive.write("data.json", jsonBytes);
const zipBytes = await newArchive.compress();
```

> **Note:** `compress()` loads all files into memory first. Be mindful of memory usage for large archives.
