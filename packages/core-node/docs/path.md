# Path Utilities (`pathx`)

Imported as a namespace:

```typescript
import { pathx } from "@simplysm/core-node";
```

Provides path normalization, POSIX conversion, child path detection, and target-based filtering utilities.

---

## API Reference

### NormPath

```typescript
type NormPath = string & { [NORM]: never };
```

A branded string type representing a normalized absolute path. Can only be created through `norm()`. Useful for ensuring path consistency throughout an application.

---

### posix

```typescript
function posix(...args: string[]): string;
```

Converts path segments to a POSIX-style path (backslashes replaced with forward slashes). Segments are joined using `path.join()` before conversion.

```typescript
pathx.posix("C:\\Users\\test");       // "C:/Users/test"
pathx.posix("src", "index.ts");       // "src/index.ts"
```

---

### changeFileDirectory

```typescript
function changeFileDirectory(
  filePath: string,
  fromDirectory: string,
  toDirectory: string,
): string;
```

Changes the base directory of a file path. Throws `ArgumentError` if `filePath` is not inside `fromDirectory`.

```typescript
pathx.changeFileDirectory("/a/b/c.txt", "/a", "/x");
// "/x/b/c.txt"
```

---

### basenameWithoutExt

```typescript
function basenameWithoutExt(filePath: string): string;
```

Returns the filename without extension.

```typescript
pathx.basenameWithoutExt("file.txt");              // "file"
pathx.basenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
```

---

### isChildPath

```typescript
function isChildPath(childPath: string, parentPath: string): boolean;
```

Checks if `childPath` is a child of `parentPath`. Returns `false` if the paths are identical. Paths are normalized internally.

```typescript
pathx.isChildPath("/a/b/c", "/a/b"); // true
pathx.isChildPath("/a/b", "/a/b/c"); // false
pathx.isChildPath("/a/b", "/a/b");   // false (same path)
```

---

### norm

```typescript
function norm(...paths: string[]): NormPath;
```

Normalizes and resolves path segments to an absolute `NormPath`. Uses platform-specific separators.

```typescript
const p = pathx.norm("/some/path");          // NormPath
const q = pathx.norm("relative", "path");    // NormPath (resolved to absolute)
```

---

### filterByTargets

```typescript
function filterByTargets(
  files: string[],
  targets: string[],
  cwd: string,
): string[];
```

Filters an array of absolute file paths to only include those that match or are children of the given target paths.

**Parameters:**
- `files` -- Absolute file paths to filter.
- `targets` -- Target paths relative to `cwd` (POSIX style recommended).
- `cwd` -- Current working directory (absolute path).

Returns `files` unmodified if `targets` is empty.

```typescript
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathx.filterByTargets(files, ["src"], "/proj");
// ["/proj/src/a.ts", "/proj/src/b.ts"]
```

---

## Usage Examples

```typescript
import { pathx } from "@simplysm/core-node";

// Normalize paths for consistent comparison
const a = pathx.norm("/project/src/../lib");
const b = pathx.norm("/project/lib");
console.log(a === b); // true

// Remap file paths from one directory to another
const newPath = pathx.changeFileDirectory(
  "/build/src/utils/helper.ts",
  "/build/src",
  "/dist",
);
// "/dist/utils/helper.ts"

// Filter files by target directories
const allFiles = ["/proj/src/a.ts", "/proj/docs/b.md", "/proj/tests/c.ts"];
const srcOnly = pathx.filterByTargets(allFiles, ["src", "tests"], "/proj");
// ["/proj/src/a.ts", "/proj/tests/c.ts"]
```
