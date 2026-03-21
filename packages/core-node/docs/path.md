# Path Utilities

Path utilities exported as the `pathx` namespace.

```typescript
import { pathx } from "@simplysm/core-node";
```

## Types

### `NormPath`

Brand type representing a normalized path. Can only be created through `norm()`.

```typescript
type NormPath = string & { [NORM]: never };
```

## Functions

### `posix`

Converts to POSIX-style path (backslash to forward slash).

```typescript
function posix(...args: string[]): string;
```

**Examples:**
```typescript
posix("C:\\Users\\test"); // "C:/Users/test"
posix("src", "index.ts"); // "src/index.ts"
```

### `changeFileDirectory`

Changes the directory of a file path.

```typescript
function changeFileDirectory(
  filePath: string,
  fromDirectory: string,
  toDirectory: string,
): string;
```

Throws an error if the file is not inside `fromDirectory`.

**Example:**
```typescript
changeFileDirectory("/a/b/c.txt", "/a", "/x");
// "/x/b/c.txt"
```

### `basenameWithoutExt`

Returns the filename (basename) without extension.

```typescript
function basenameWithoutExt(filePath: string): string;
```

**Examples:**
```typescript
basenameWithoutExt("file.txt"); // "file"
basenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
```

### `isChildPath`

Checks if `childPath` is a child path of `parentPath`. Returns `false` if the paths are the same.

Paths are internally normalized using `norm()` and compared using platform-specific path separators.

```typescript
function isChildPath(childPath: string, parentPath: string): boolean;
```

**Examples:**
```typescript
isChildPath("/a/b/c", "/a/b"); // true
isChildPath("/a/b", "/a/b/c"); // false
isChildPath("/a/b", "/a/b");   // false (same path)
```

### `norm`

Normalizes the path and returns it as `NormPath`. Converts to absolute path and normalizes using platform-specific separators.

```typescript
function norm(...paths: string[]): NormPath;
```

**Examples:**
```typescript
norm("/some/path");        // NormPath
norm("relative", "path");  // NormPath (converted to absolute path)
```

### `filterByTargets`

Filters files based on a list of target paths. Includes files that match or are children of a target path.

```typescript
function filterByTargets(files: string[], targets: string[], cwd: string): string[];
```

**Parameters:**
- `files` -- File paths to filter. Must be absolute paths under `cwd`.
- `targets` -- Target paths (relative to `cwd`, POSIX style recommended)
- `cwd` -- Current working directory (absolute path)

If `targets` is empty, returns `files` as-is; otherwise returns only files under target paths.

**Example:**
```typescript
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
filterByTargets(files, ["src"], "/proj");
// ["/proj/src/a.ts", "/proj/src/b.ts"]
```
