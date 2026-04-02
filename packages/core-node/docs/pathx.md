# pathx

Namespace of path manipulation utilities. Provides a branded POSIX path type, path conversion, and directory-based filtering.

Imported as:
```typescript
import { pathx } from "@simplysm/core-node";
```

## Types

### PosixPath

```ts
type PosixPath = string & { [POSIX]: never }
```

Branded string type guaranteeing forward-slash (`/`) separators. Can only be created via `posix()` or `posixResolve()`.

## Functions

### posix

```ts
function posix(p: string): PosixPath
```

Convert a path to POSIX style (backslashes replaced with forward slashes). No path resolution or joining is performed.

```ts
pathx.posix("C:\\Users\\test"); // "C:/Users/test"
```

### posixResolve

```ts
function posixResolve(...args: string[]): PosixPath
```

Resolve path segments to an absolute path, then convert to POSIX style.

```ts
pathx.posixResolve("/base", "sub", "file.txt"); // "/base/sub/file.txt"
pathx.posixResolve("relative/path");            // "D:/cwd/relative/path"
```

### changeFileDirectory

```ts
function changeFileDirectory(
  filePath: string,
  fromDirectory: string,
  toDirectory: string,
): string
```

Change the parent directory of a file path. The file must be inside `fromDirectory`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | File path to transform |
| `fromDirectory` | `string` | Original parent directory |
| `toDirectory` | `string` | New parent directory |

**Throws:** `ArgumentError` if `filePath` is not inside `fromDirectory`.

```ts
pathx.changeFileDirectory("/a/b/c.txt", "/a", "/x");
// "/x/b/c.txt"
```

### basenameWithoutExt

```ts
function basenameWithoutExt(filePath: string): string
```

Get the filename without its extension (last extension only).

```ts
pathx.basenameWithoutExt("file.txt");            // "file"
pathx.basenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
```

### isChildPath

```ts
function isChildPath(childPath: string, parentPath: string): boolean
```

Check if `childPath` is a descendant of `parentPath`. Returns `false` for identical paths. Paths are normalized internally via `posixResolve()`.

```ts
pathx.isChildPath("/a/b/c", "/a/b"); // true
pathx.isChildPath("/a/b", "/a/b/c"); // false
pathx.isChildPath("/a/b", "/a/b");   // false (same path)
```

### filterByTargets

```ts
function filterByTargets(
  files: string[],
  targets: string[],
  cwd: string,
): string[]
```

Filter a list of file paths to only include those under the specified target directories. If `targets` is empty, all files are returned.

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `string[]` | Absolute file paths to filter (should be under `cwd`) |
| `targets` | `string[]` | Target directory paths relative to `cwd` (POSIX style recommended) |
| `cwd` | `string` | Current working directory (absolute path) |

```ts
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathx.filterByTargets(files, ["src"], "/proj");
// ["/proj/src/a.ts", "/proj/src/b.ts"]
```
