# Path (pathx)

## `PosixPath`

POSIX 스타일(슬래시) 경로임을 타입 수준에서 보장하는 브랜드 타입.

posix() 또는 posixResolve()를 통해서만 생성할 수 있다.

```typescript
export type PosixPath = string & {
  [POSIX]: never;
}
```

**Note**: 일반 문자열을 강제로 PosixPath로 캐스팅할 수 없다. posix() 또는 posixResolve()를 반드시 사용해야 한다.

---

## `posix`

경로를 POSIX 스타일(슬래시)로 변환한다.

경로 결합이나 resolve는 수행하지 않으며, 단순히 백슬래시를 슬래시로 바꾼다.

```typescript
export function posix(p: string): PosixPath
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `p` | string | 변환할 경로 |

**Return**: PosixPath (슬래시로 정규화된 경로)

**Example**:
```typescript
posix("C:\\Users\\test"); // "C:/Users/test"
posix("./relative/path"); // "./relative/path"
```

---

## `posixResolve`

절대 경로로 resolve한 뒤 POSIX 스타일로 변환한다.

```typescript
export function posixResolve(...args: string[]): PosixPath
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `...args` | string[] | resolve할 경로 세그먼트 (node:path.resolve와 동일) |

**Return**: PosixPath (절대 경로, 슬래시로 정규화)

**Example**:
```typescript
posixResolve("/base", "sub", "file.txt"); // "/base/sub/file.txt" (Unix 환경)
posixResolve("relative/path"); // "/home/user/relative/path" (절대 경로로 resolve됨)
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
| `filePath` | string | 파일 경로 |
| `fromDirectory` | string | 현재 디렉토리 |
| `toDirectory` | string | 새 디렉토리 |

**Return**: 새 디렉토리로 변경된 파일 경로

**Throws**: filePath가 fromDirectory 내부에 없는 경우 ArgumentError 발생

**Example**:
```typescript
changeFileDirectory("/a/b/c.txt", "/a/b", "/x");
// → "/x/c.txt"

changeFileDirectory("/a/b/sub/c.txt", "/a/b", "/x");
// → "/x/sub/c.txt"
```

---

## `basenameWithoutExt`

확장자를 제외한 파일명(basename)을 반환한다.

```typescript
export function basenameWithoutExt(filePath: string): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | 파일 경로 |

**Return**: 확장자를 제외한 파일명

**Example**:
```typescript
basenameWithoutExt("file.txt"); // "file"
basenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
basenameWithoutExt("/path/to/file"); // "file"
```

---

## `isChildPath`

childPath가 parentPath의 하위 경로인지 확인한다.

동일한 경로이면 false를 반환한다.

경로는 내부적으로 posixResolve()를 사용하여 정규화되며, POSIX 슬래시(/)를 구분자로 사용하여 비교한다.

```typescript
export function isChildPath(childPath: string, parentPath: string): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `childPath` | string | 자식으로 확인할 경로 |
| `parentPath` | string | 부모로 확인할 경로 |

**Return**: childPath가 parentPath의 하위 경로이면 true, 동일하거나 상위 경로이면 false

**Example**:
```typescript
isChildPath("/a/b/c", "/a/b"); // true
isChildPath("/a/b", "/a/b/c"); // false
isChildPath("/a/b", "/a/b"); // false (동일 경로)
isChildPath("/a/bc", "/a/b"); // false (접두사 매칭이 아님)
```

---

## `filterByTargets`

대상 경로 목록을 기반으로 파일을 필터링한다.

대상 경로와 일치하거나 하위에 있는 파일을 포함한다.

```typescript
export function filterByTargets(files: string[], targets: string[], cwd: string): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | string[] | 필터링할 파일 경로 배열. 주의: cwd 하위의 절대 경로여야 한다. cwd 외부의 경로는 상대 경로(../)로 변환되어 처리된다. |
| `targets` | string[] | 대상 경로 (cwd 기준 상대 경로, POSIX 스타일 권장) |
| `cwd` | string | 현재 작업 디렉토리 (절대 경로) |

**Return**: targets가 비어있으면 files를 그대로 반환; 그렇지 않으면 대상 경로 하위의 파일만 반환

**Example**:
```typescript
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
filterByTargets(files, ["src"], "/proj");
// → ["/proj/src/a.ts", "/proj/src/b.ts"]

filterByTargets(files, [], "/proj");
// → ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"] (targets가 비어있음)
```
