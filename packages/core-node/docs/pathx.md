# pathx

Namespace of path manipulation utilities. Provides normalized path types, POSIX conversion, and directory-based filtering.

Imported as:
```typescript
import { pathx } from "@simplysm/core-node";
```

## Types

### NormPath

```ts
type NormPath = string & { [NORM]: never }
```

Branded string type representing a normalized, resolved absolute path. Can only be created via `norm()`.

## Functions

### posix

```ts
function posix(...args: string[]): string
```

Convert a path to POSIX style (backslashes replaced with forward slashes). Accepts multiple segments which are joined with `path.join`.

```ts
pathx.posix("C:\\Users\\test");    // "C:/Users/test"
pathx.posix("src", "index.ts");   // "src/index.ts"
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

Check if `childPath` is a descendant of `parentPath`. Returns `false` for identical paths. Paths are normalized internally via `norm()`.

```ts
pathx.isChildPath("/a/b/c", "/a/b"); // true
pathx.isChildPath("/a/b", "/a/b/c"); // false
pathx.isChildPath("/a/b", "/a/b");   // false (same path)
```

### norm

```ts
function norm(...paths: string[]): NormPath
```

Normalize and resolve path segments into a `NormPath` (absolute, platform-native separators).

```ts
pathx.norm("/some/path");          // NormPath
pathx.norm("relative", "path");   // NormPath (resolved to absolute)
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
