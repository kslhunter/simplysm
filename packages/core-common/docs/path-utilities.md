# Path Utilities

Imported as the `path` namespace. Browser-safe replacements for Node.js `path` module functions.

```typescript
import { path } from "@simplysm/core-common";
```

**Note:** Supports POSIX-style paths (forward slash `/`) only. Windows backslash paths are not supported.

## join

```typescript
function join(...segments: string[]): string;
```

Combines path segments (replacement for `path.join`).

---

## basename

```typescript
function basename(filePath: string, ext?: string): string;
```

Extracts the filename from a path. Optionally removes the specified extension.

---

## extname

```typescript
function extname(filePath: string): string;
```

Extracts the file extension. Hidden files (e.g., `.gitignore`) return an empty string, matching Node.js behavior.

---

## Usage Examples

```typescript
import { path } from "@simplysm/core-common";

path.join("a", "b", "c.txt");          // "a/b/c.txt"
path.join("/root/", "/dir/", "file");   // "/root/dir/file"

path.basename("/dir/file.txt");         // "file.txt"
path.basename("/dir/file.txt", ".txt"); // "file"

path.extname("archive.tar.gz");  // ".gz"
path.extname(".gitignore");      // ""
```
