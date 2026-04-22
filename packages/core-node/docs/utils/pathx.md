# pathx

경로 처리 및 `PosixPath` 브랜드 타입 유틸리티 네임스페이스.

```typescript
import { pathx } from "@simplysm/core-node";
```

## Members

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `PosixPath` | type | `string & { [POSIX]: never }` | POSIX 스타일(슬래시) 경로 브랜드 타입 |
| `posix` | function | `(p: string) => PosixPath` | 백슬래시를 슬래시로 변환. resolve는 수행하지 않음 |
| `posixResolve` | function | `(...args: string[]) => PosixPath` | 절대 경로로 resolve한 뒤 POSIX 스타일로 변환 |
| `changeFileDirectory` | function | `(filePath: string, fromDirectory: string, toDirectory: string) => string` | 파일 경로의 디렉토리를 변경 |
| `basenameWithoutExt` | function | `(filePath: string) => string` | 확장자를 제외한 파일명(basename) 반환 |
| `isChildPath` | function | `(childPath: string, parentPath: string) => boolean` | childPath가 parentPath의 하위 경로인지 확인 |
| `filterByTargets` | function | `(files: string[], targets: string[], cwd: string) => string[]` | 대상 경로 목록에 기반한 파일 필터링 |

## `PosixPath`

슬래시(`/`) 구분자임을 타입 수준에서 보장하는 브랜드 타입. `posix()` 또는 `posixResolve()`를 통해서만 생성할 수 있다. `FsWatcher`가 반환하는 경로는 항상 `PosixPath`다.

```typescript
export type PosixPath = string & {
  [POSIX]: never;
};
```

## `changeFileDirectory` — 예외 조건

`filePath`가 `fromDirectory` 내부에 없으면 `ArgumentError`를 throw한다.

## `isChildPath` — 동일 경로 처리

동일한 경로이면 `false`를 반환한다. 내부적으로 `posixResolve()`로 정규화하여 비교한다.

## `filterByTargets` — files 파라미터 주의

`files`는 `cwd` 하위의 절대 경로여야 한다. `cwd` 외부 경로는 상대 경로(`../`)로 변환되어 처리되며 의도치 않은 결과가 생길 수 있다. `targets`가 비어있으면 `files`를 그대로 반환한다.

## Usage

```typescript
import { pathx } from "@simplysm/core-node";

// POSIX 경로 변환
const p = pathx.posix("C:\\Users\\test"); // "C:/Users/test"

// 절대 경로 resolve + POSIX
const abs = pathx.posixResolve("./relative", "path"); // e.g. "D:/cwd/relative/path"

// 파일 디렉토리 변경
const newPath = pathx.changeFileDirectory("/a/b/c.txt", "/a", "/x"); // "/x/b/c.txt"

// 확장자 없는 basename
pathx.basenameWithoutExt("file.spec.ts"); // "file.spec"

// 자식 경로 확인
pathx.isChildPath("/a/b/c", "/a/b"); // true
pathx.isChildPath("/a/b", "/a/b"); // false (동일 경로)

// 파일 필터링
const files = ["/proj/src/a.ts", "/proj/tests/b.ts"];
pathx.filterByTargets(files, ["src"], "/proj"); // ["/proj/src/a.ts"]
```
