## @simplysm/core-node — pathx

`import { pathx } from "@simplysm/core-node"`. POSIX 슬래시 경로 정규화·비교·필터링.

### 타입

- `PosixPath` — `string & { [POSIX]: never }` 브랜드 타입. `posix()` / `posixResolve()` 만 생성 가능. 글로브·minimatch·URL 호환 경로 표현용.

### 함수

- `posix(p): PosixPath` — 백슬래시→슬래시 치환만. resolve 안 함.
- `posixResolve(...args): PosixPath` — `path.resolve(...args)` 후 슬래시 치환. 절대 경로 보장.
- `changeFileDirectory(filePath, fromDirectory, toDirectory): string` — `filePath` 의 디렉토리 prefix 를 `fromDirectory`→`toDirectory` 로 갈아끼움. `filePath === fromDirectory` 면 `toDirectory` 반환. `filePath` 가 `fromDirectory` 하위가 아니면 `ArgumentError` throw.
- `basenameWithoutExt(filePath): string` — 마지막 확장자 1개 제거한 basename. `"a.spec.ts"` → `"a.spec"`.
- `isChildPath(childPath, parentPath): boolean` — `child` 가 `parent` **엄격 하위**인지 (동일 경로면 false). 내부적으로 `posixResolve` 정규화 후 `parent + "/"` prefix 매칭.
- `filterByTargets(files, targets, cwd): string[]` — `files`(cwd 하위 절대 경로 배열)에서 `targets`(cwd 기준 상대 POSIX 경로) 와 일치 또는 하위 항목만 통과. `targets` 가 빈 배열이면 `files` 그대로 반환. sd-cli 의 `-t` 옵션 처리에 사용.

### 예

```ts
import { pathx } from "@simplysm/core-node";
const out = pathx.changeFileDirectory("/proj/src/a.ts", "/proj/src", "/proj/dist"); // /proj/dist/a.ts
pathx.isChildPath("/a/b/c", "/a/b"); // true
```
