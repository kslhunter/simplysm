# @simplysm/core-node — pathx

`import { pathx } from "@simplysm/core-node"`. 경로 정규화·판정·치환 유틸 네임스페이스. 내부 비교는 항상 POSIX 슬래시 기준이다.

## PosixPath 생성

- `posix(p: string): PosixPath` — `\` → `/` 치환만 수행(resolve·결합 안 함). 반환은 브랜드 타입 `PosixPath`.
- `posixResolve(...args: string[]): PosixPath` — `path.resolve` 로 절대 경로화한 뒤 슬래시 치환. 상대 입력은 cwd 기준으로 절대화.
- `PosixPath` — `string & { [POSIX]: never }` 브랜드 타입. `posix`/`posixResolve` 로만 생성 가능. POSIX 슬래시 경로임을 타입으로 보장할 때 쓰임(예: `FsWatcherChangeInfo.path`).

```ts
pathx.posix("C:\\a\\b");        // "C:/a/b"
pathx.posixResolve("a", "b");   // "<cwd>/a/b"
```

## 판정·치환

- `isChildPath(childPath: string, parentPath: string): boolean` — child 가 parent 의 하위인지. **동일 경로는 false**. 내부적으로 양쪽을 `posixResolve` 정규화 후 `parent + "/"` 접두 비교.
- `changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string` — filePath 의 소속 디렉토리를 from→to 로 교체. `filePath === fromDirectory` 면 toDirectory 반환. from 하위가 아니면 `ArgumentError` throw. 빌드 출력 경로 산출에 사용.
- `basenameWithoutExt(filePath: string): string` — 마지막 확장자만 제거한 basename. `file.spec.ts` → `file.spec`.

```ts
pathx.isChildPath("/a/b/c", "/a/b");                     // true
pathx.changeFileDirectory("/src/x.ts", "/src", "/dist"); // "/dist/x.ts"
```

## 타겟 필터링

- `filterByTargets(files: string[], targets: string[], cwd: string): string[]` — files 중 targets 경로와 일치하거나 그 하위인 것만 반환.
  - `files` — 필터링할 파일 경로. cwd 하위 절대 경로 권장(cwd 외부 경로는 `../` 상대로 변환되어 매칭이 어려움).
  - `targets` — cwd 기준 상대 경로(POSIX 슬래시 권장). **빈 배열이면 files 를 그대로 반환**("필터 없음" 의미).
  - `cwd` — 절대 기준 디렉토리. files 의 cwd 상대 경로를 만들어 target 과 비교.

```ts
pathx.filterByTargets(["/p/src/a.ts", "/p/tests/c.ts"], ["src"], "/p");
// → ["/p/src/a.ts"]
```

## 주의사항

- `filterByTargets` 의 `targets` 가 비면 전체 통과 — 빈 결과를 기대하지 말 것.
- `changeFileDirectory` 는 범위 밖 입력을 silent 처리하지 않고 throw 하므로, 호출 전 `isChildPath` 로 보장하거나 throw 를 처리.
