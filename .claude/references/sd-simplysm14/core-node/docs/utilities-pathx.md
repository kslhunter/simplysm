# Utilities — pathx

`pathx`는 `@simplysm/core-node`에서 네임스페이스로 re-export되는 경로 유틸리티 모음이다.

```typescript
import { pathx } from "@simplysm/core-node";
```

---

## `PosixPath`

POSIX 스타일(슬래시 `/`) 경로를 나타내는 브랜드 타입. `posix()` 또는 `posixResolve()`를 통해서만 생성할 수 있다.

```typescript
export type PosixPath = string & {
  [POSIX]: never;
};
```

`FsWatcher`가 반환하는 경로는 항상 `PosixPath`다.

---

## `posix`

POSIX 스타일 경로로 변환한다 (백슬래시 → 슬래시). 경로 결합이나 resolve는 수행하지 않는다.

```typescript
export function posix(p: string): PosixPath
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `p` | `string` | 변환할 경로 |

```typescript
pathx.posix("C:\\Users\\test"); // "C:/Users/test"
```

---

## `posixResolve`

절대 경로로 resolve한 뒤 POSIX 스타일로 변환한다.

```typescript
export function posixResolve(...args: string[]): PosixPath
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `...args` | `string[]` | `path.resolve()`에 전달할 경로 세그먼트 |

```typescript
pathx.posixResolve("/base", "sub", "file.txt"); // "/base/sub/file.txt"
pathx.posixResolve("relative/path"); // "D:/cwd/relative/path" (절대 경로화)
```

---

## `changeFileDirectory`

파일 경로의 디렉토리를 변경한다.

```typescript
export function changeFileDirectory(
  filePath: string,
  fromDirectory: string,
  toDirectory: string,
): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | 변경할 파일 경로 |
| `fromDirectory` | `string` | 원래 디렉토리 경로 |
| `toDirectory` | `string` | 새로운 디렉토리 경로 |

**Throws**: `filePath`가 `fromDirectory` 내부에 없는 경우 `ArgumentError`를 던진다.

```typescript
pathx.changeFileDirectory("/a/b/c.txt", "/a", "/x");
// → "/x/b/c.txt"
```

---

## `basenameWithoutExt`

확장자를 제외한 파일명(basename)을 반환한다.

```typescript
export function basenameWithoutExt(filePath: string): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | 파일 경로 |

```typescript
pathx.basenameWithoutExt("file.txt");           // "file"
pathx.basenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
```

---

## `isChildPath`

`childPath`가 `parentPath`의 하위 경로인지 확인한다. 동일한 경로이면 `false`를 반환한다.

경로는 내부적으로 `posixResolve()`를 사용하여 정규화된다.

```typescript
export function isChildPath(childPath: string, parentPath: string): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `childPath` | `string` | 자식 경로 후보 |
| `parentPath` | `string` | 부모 경로 |

```typescript
pathx.isChildPath("/a/b/c", "/a/b"); // true
pathx.isChildPath("/a/b", "/a/b/c"); // false
pathx.isChildPath("/a/b", "/a/b");   // false (동일 경로)
```

---

## `filterByTargets`

대상 경로 목록을 기반으로 파일을 필터링한다. 대상 경로와 일치하거나 하위에 있는 파일을 포함한다.

```typescript
export function filterByTargets(files: string[], targets: string[], cwd: string): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `string[]` | 필터링할 파일 경로. cwd 하위의 절대 경로여야 한다 |
| `targets` | `string[]` | 대상 경로 (cwd 기준 상대 경로, POSIX 스타일 권장) |
| `cwd` | `string` | 현재 작업 디렉토리 (절대 경로) |

**반환**: `targets`가 비어있으면 `files`를 그대로 반환. 그렇지 않으면 대상 경로 하위의 파일만 반환.

```typescript
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathx.filterByTargets(files, ["src"], "/proj");
// → ["/proj/src/a.ts", "/proj/src/b.ts"]
```
