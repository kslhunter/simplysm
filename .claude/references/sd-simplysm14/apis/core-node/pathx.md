# @simplysm/core-node — pathx

`export * as pathx` 네임스페이스 (`packages/core-node/src/utils/path.ts`). 경로 문자열 가공·판정 유틸. OS 무관 비교를 위해 POSIX 슬래시(`/`)로 정규화하는 것이 핵심. `pathx.<fn>(...)` 형태로 호출.

## PosixPath (브랜드 타입)

- `type PosixPath = string & { [POSIX]: never }` — POSIX 슬래시 경로임을 나타내는 브랜드 타입. `posix()`/`posixResolve()` 로만 생성 가능(심볼 키라 외부에서 캐스팅 없이는 못 만듦). 일반 `string` 을 PosixPath 자리에 직접 넣을 수 없어, 정규화를 강제하는 타입 가드 역할.

## 정규화

- `posix(p: string): PosixPath` — 백슬래시 → 슬래시 치환만 수행. **결합·resolve 안 함**. 예: `posix("C:\\Users\\test")` → `"C:/Users/test"`. 이미 절대/상대 경로인 문자열을 POSIX 표기로만 바꿀 때.
- `posixResolve(...args: string[]): PosixPath` — 인자들을 `path.resolve` 로 절대 경로 결합 후 슬래시로 변환. 예: `posixResolve("/base", "sub", "f.txt")` → `"/base/sub/f.txt"`, 상대경로 단독이면 cwd 기준 절대화. 경로 결합+정규화를 동시에 할 때.

## 경로 가공

- `changeFileDirectory(filePath, fromDirectory, toDirectory): string` — `filePath` 의 디렉토리 prefix 를 `fromDirectory` → `toDirectory` 로 치환(상대 위치 유지). 예: `("/a/b/c.txt", "/a", "/x")` → `"/x/b/c.txt"`. `filePath === fromDirectory` 면 `toDirectory` 반환. **filePath 가 fromDirectory 내부가 아니면 `ArgumentError` throw**. src→dist 같은 출력 경로 산출에 사용.
- `basenameWithoutExt(filePath: string): string` — 확장자 1단계만 제거한 basename. 예: `"file.txt"` → `"file"`, `"a/file.spec.ts"` → `"file.spec"`(마지막 확장자만 제거).

## 판정·필터링

- `isChildPath(childPath, parentPath): boolean` — `childPath` 가 `parentPath` 의 하위인지. 양쪽을 `posixResolve` 로 정규화 후 비교. **동일 경로면 false**(자기 자신은 하위 아님). 경계 오탐 방지를 위해 parent 끝에 `/` 를 붙여 startsWith 비교.
- `filterByTargets(files, targets, cwd): string[]` — 파일 목록을 타겟 경로 하위만 남김.
  - `files: string[]` — 필터링할 파일. **cwd 하위 절대 경로여야 함**(외부 경로는 `../` 상대경로로 변환되어 매칭 실패 가능).
  - `targets: string[]` — 대상 경로(cwd 기준 상대, POSIX 권장). 각 파일의 cwd-상대경로가 target 과 같거나 `target + "/"` 로 시작하면 통과.
  - `cwd: string` — 기준 작업 디렉토리(절대 경로).
  - **`targets` 가 비면 `files` 를 그대로 반환**(필터 미적용). CLI 의 `-t <패키지>` 같은 부분 빌드 대상 한정에 사용.

## 사용 예

```ts
import { pathx } from "@simplysm/core-node";
const out = pathx.changeFileDirectory(srcFile, "/proj/src", "/proj/dist");
if (pathx.isChildPath(out, "/proj")) { /* ... */ }
const targeted = pathx.filterByTargets(allFiles, ["src", "tests"], process.cwd());
```
