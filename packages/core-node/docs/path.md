# Path Utilities (`path`)

Utilities for path manipulation that complement the built-in `path` module.

## Import

```typescript
import { pathNorm, pathPosix, /* ... */ } from "@simplysm/core-node";
```

---

## `NormPath` (type)

A branded `string` type that represents a normalized (absolute) path. Values of this type can only be produced by `pathNorm()`.

```typescript
import type { NormPath } from "@simplysm/core-node";
```

---

## `pathPosix(...args)`

Joins path segments and converts backslashes to forward slashes, producing a POSIX-style path.

```typescript
import { pathPosix } from "@simplysm/core-node";

pathPosix("C:\\Users\\test");          // "C:/Users/test"
pathPosix("src", "utils", "index.ts"); // "src/utils/index.ts"
```

---

## `pathChangeFileDirectory(filePath, fromDirectory, toDirectory)`

Changes the directory portion of a file path from `fromDirectory` to `toDirectory`. Throws `ArgumentError` if `filePath` is not inside `fromDirectory`.

```typescript
import { pathChangeFileDirectory } from "@simplysm/core-node";

pathChangeFileDirectory("/a/b/c.txt", "/a", "/x");
// → "/x/b/c.txt"
```

---

## `pathBasenameWithoutExt(filePath)`

Returns the basename of a file path without its extension.

```typescript
import { pathBasenameWithoutExt } from "@simplysm/core-node";

pathBasenameWithoutExt("file.txt");              // "file"
pathBasenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
```

---

## `pathIsChildPath(childPath, parentPath)`

Returns `true` if `childPath` is strictly inside `parentPath`. Returns `false` when the paths are equal. Comparison is performed after normalizing both paths with `pathNorm()`.

```typescript
import { pathIsChildPath } from "@simplysm/core-node";

pathIsChildPath("/a/b/c", "/a/b"); // true
pathIsChildPath("/a/b", "/a/b");   // false (same path)
```

---

## `pathNorm(...paths)`

Resolves and normalizes path segments to an absolute path and returns it as a `NormPath` brand type.

```typescript
import { pathNorm } from "@simplysm/core-node";

const norm = pathNorm("relative", "path"); // NormPath (absolute)
```

---

## `pathFilterByTargets(files, targets, cwd)`

Filters an array of absolute file paths to those that match or are children of any path in `targets`. `targets` are relative POSIX paths from `cwd`. If `targets` is empty, returns `files` unchanged.

```typescript
import { pathFilterByTargets } from "@simplysm/core-node";

const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathFilterByTargets(files, ["src"], "/proj");
// → ["/proj/src/a.ts", "/proj/src/b.ts"]
```
