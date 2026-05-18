## @simplysm/core-node — pathx

`import { pathx } from "@simplysm/core-node"` — 경로 변환·비교 유틸. POSIX 스타일 통일과 cwd 기준 target 필터링용.

### PosixPath 브랜드 타입

```ts
type PosixPath = string & { [POSIX]: never };
```

`posix()` 또는 `posixResolve()` 결과에만 부여. 슬래시 경로임을 타입으로 보장.

### 변환

```ts
pathx.posix(p: string): PosixPath
// 백슬래시 → 슬래시 만. resolve 안 함.
// posix("C:\\Users\\test") === "C:/Users/test"

pathx.posixResolve(...args: string[]): PosixPath
// path.resolve 후 슬래시화. 항상 절대 경로.
```

### 비교/판정

```ts
pathx.isChildPath(child, parent): boolean
// posixResolve 정규화 후 비교. 동일 경로면 false.

pathx.changeFileDirectory(filePath, fromDir, toDir): string
// filePath 의 fromDir 부분을 toDir 로 치환.
// filePath === fromDir 이면 toDir 반환.
// filePath 가 fromDir 하위가 아니면 ArgumentError throw.

pathx.basenameWithoutExt(filePath): string
// path.basename(p, path.extname(p)). "a/b/c.spec.ts" → "c.spec"
```

### target 필터링

```ts
pathx.filterByTargets(files: string[], targets: string[], cwd: string): string[]
```

- `targets` 가 비면 `files` 그대로 반환.
- 각 `target` 은 cwd 기준 상대 경로 (POSIX 권장).
- `files` 각 원소를 cwd 기준 상대 POSIX 로 변환 후 `relative === target || relative.startsWith(target + "/")` 매칭.
- `files` 는 cwd 하위 절대 경로 가정 — 외부 경로는 `../` 로 변환되어 매칭에서 빠짐.

CLI 의 `-t <project>` 처럼 사용자 지정 부분 경로로 후보를 좁힐 때 사용.

```ts
const files = ["/proj/src/a.ts", "/proj/tests/c.ts"];
pathx.filterByTargets(files, ["src"], "/proj"); // ["/proj/src/a.ts"]
```
