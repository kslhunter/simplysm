# Features

Async operation control and event handling classes. All support `using` statements or `dispose()`.

## DebounceQueue

Async debounce queue (executes only last request).

```typescript
import { DebounceQueue } from "@simplysm/core-common";

using queue = new DebounceQueue(300); // 300ms debounce

// Error handling
queue.on("error", (err) => console.error(err));

// Only last call is executed
queue.run(() => console.log("1")); // Ignored
queue.run(() => console.log("2")); // Ignored
queue.run(() => console.log("3")); // Executed after 300ms
```

---

## SerialQueue

Async serial queue (sequential execution).

```typescript
import { SerialQueue } from "@simplysm/core-common";

using queue = new SerialQueue(100); // 100ms interval between tasks

queue.on("error", (err) => console.error(err));

queue.run(async () => { await fetch("/api/1"); });
queue.run(async () => { await fetch("/api/2"); }); // Runs after #1 completes
queue.run(async () => { await fetch("/api/3"); }); // Runs after #2 completes
```

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
service.on("data", (data) => console.log(data)); // data: string (type inferred)
service.off("data", listener);                   // Remove listener
service.listenerCount("data");                   // Number of registered listeners
service.dispose();                                // Remove all listeners
```

---

## ZipArchive

ZIP file compression/decompression utility. Resources can be auto-cleaned with `await using`.

```typescript
import { ZipArchive } from "@simplysm/core-common";

// Read ZIP file
await using archive = new ZipArchive(zipBytes);
const content = await archive.get("file.txt");
const exists = await archive.exists("data.json");

// Extract all (with progress)
const files = await archive.extractAll((progress) => {
  console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
});

// Create ZIP file
await using newArchive = new ZipArchive();
newArchive.write("file.txt", textBytes);
newArchive.write("data.json", jsonBytes);
const zipBytes = await newArchive.compress();
```
