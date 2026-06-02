# @simplysm/core-node — fsx

`export * as fsx` 네임스페이스 (`packages/core-node/src/utils/fs.ts`). Node `fs` 를 감싼 파일시스템 IO. 대부분 동기(`...Sync`)/비동기 쌍을 제공하며, 실패 시 모두 `SdError(err, targetPath)` 로 원인+경로를 붙여 throw 한다. 항상 `fsx.<fn>(...)` 형태로 호출.

## 존재 확인

- `existsSync(targetPath: string): boolean` / `exists(targetPath: string): Promise<boolean>` — 파일/디렉토리 존재 여부. 비동기 버전은 `fs.access` 실패를 catch 해 false 반환(throw 안 함).

## 디렉토리 생성

- `mkdirSync(targetPath: string): void` / `mkdir(targetPath: string): Promise<void>` — 재귀 생성(`recursive: true`). 중간 경로가 없어도 전부 만든다.

## 삭제

- `rmSync(targetPath: string): void` — 재귀+force 삭제. **재시도 없이 즉시 실패**. 파일 잠금 등 일시 오류가 예상되면 비동기 `rm` 을 쓸 것.
- `rm(targetPath: string): Promise<void>` — 재귀+force 삭제. 일시 오류에 대해 **500ms 간격 최대 6회 재시도**(`retryDelay: 500, maxRetries: 6`).

## 복사

- `copySync(sourcePath, targetPath, filter?): void` / `copy(sourcePath, targetPath, filter?): Promise<void>` — 파일/디렉토리 복사. async 는 하위 항목을 `parallelAsync` 로 병렬 복사.
  - `sourcePath: string` — 원본. **존재하지 않으면 아무 것도 안 하고 반환**(throw 안 함).
  - `targetPath: string` — 대상. 디렉토리면 대상 디렉토리를 만들고 하위를 재귀 복사, 파일이면 상위 디렉토리 생성 후 복사.
  - `filter?: (absolutePath: string) => boolean` — 복사 여부 결정. 각 하위 항목의 **절대 경로**가 전달되며 true=복사, false=제외. **최상위 sourcePath 자신은 필터 대상 아님**. 디렉토리에 false 면 그 디렉토리와 모든 내용을 건너뜀. 빌드 산출물 중 특정 파일만 복사할 때 사용.
  - 파일 복사 실패 시 500ms busy-wait(sync)/setTimeout(async) 으로 최대 7회 시도 후 실패하면 `SdError` throw.

## 읽기

- `readSync(targetPath: string): string` / `read(...): Promise<string>` — UTF-8 문자열로 읽음.
- `readBytesSync(targetPath: string): Uint8Array` / `readBytes(...): Promise<Uint8Array>` — 바이너리로 읽음.
- `readJsonSync<TData = unknown>(targetPath): TData` / `readJson<TData = unknown>(...): Promise<TData>` — 읽어 `json.parse`(`@simplysm/core-common`, Date 등 특수타입 복원) 로 파싱. 파싱 실패 시 SdError 메시지에 내용 앞 500자 프리뷰를 첨부.

## 쓰기

- `writeSync(targetPath, data): void` / `write(targetPath, data): Promise<void>` — **상위 디렉토리 자동 생성** 후 기록(`flush: true`).
  - `data: string | Uint8Array` — 텍스트 또는 바이너리.
- `writeJsonSync(targetPath, data, options?): void` / `writeJson(targetPath, data, options?): Promise<void>` — `json.stringify` 로 직렬화 후 write.
  - `data: unknown` — 직렬화 대상.
  - `options?.replacer?: (this, key, value) => unknown` — JSON.stringify 의 replacer 와 동일 역할. 특정 키 값을 변환·제외할 때.
  - `options?.space?: string | number` — 들여쓰기. 사람이 읽을 파일이면 `2` 같은 값 지정.

## 디렉토리 읽기

- `readdirSync(targetPath: string): string[]` / `readdir(...): Promise<string[]>` — 디렉토리 직계 항목명(경로 아님) 배열.

## 파일 정보

- `statSync(targetPath): fs.Stats` / `stat(...): Promise<fs.Stats>` — 정보 조회. **심볼릭 링크를 따라감**(링크 대상의 정보).
- `lstatSync(targetPath): fs.Stats` / `lstat(...): Promise<fs.Stats>` — 정보 조회. **심볼릭 링크를 따라가지 않음**(링크 자체 정보). 링크/실파일을 구분해야 하면 lstat.

## Glob

- `globSync(pattern: string, options?: GlobOptions): string[]` / `glob(...): Promise<string[]>` — glob 검색. 입력 패턴의 `\` 를 `/` 로 치환해 매칭하고, 결과는 모두 `path.resolve` 로 **절대 경로**화해 반환.
  - `pattern: string` — glob 패턴(예: `"src/**/*.ts"`).
  - `options?: GlobOptions` — `glob` 패키지 옵션 그대로(`dot`, `cwd`, `ignore` 등). 숨김 파일 포함하려면 `{ dot: true }`.

## 유틸리티

- `clearEmptyDirectory(dirPath: string): Promise<void>` — `dirPath` 하위를 재귀 순회하며 **빈 디렉토리만** 삭제. 하위가 모두 비어 상위도 비게 되면 상위도 삭제. 파일이 하나라도 있으면 그 디렉토리는 보존. 존재하지 않으면 즉시 반환.
- `findAllParentChildPathsSync(childGlob, fromPath, rootPath?): string[]` / `findAllParentChildPaths(...): Promise<string[]>` — `fromPath` 에서 루트 방향으로 부모 디렉토리를 거슬러 올라가며 각 디렉토리에서 `childGlob` 매칭 파일을 모아 평탄화 반환. 상위 디렉토리의 설정 파일(예: 각 단계 `package.json`) 수집에 사용.
  - `childGlob: string` — 각 디렉토리에서 검색할 glob.
  - `fromPath: string` — 탐색 시작 경로.
  - `rootPath?: string` — 탐색 중단 경로. 생략 시 파일시스템 루트까지. **주의: fromPath 는 rootPath 의 하위여야 함**, 아니면 루트까지 올라간다.

## 사용 예

```ts
import { fsx } from "@simplysm/core-node";
await fsx.writeJson("dist/meta.json", { builtAt: new Date() }, { space: 2 });
await fsx.copy("src", "dist", (p) => !p.endsWith(".ts")); // .ts 제외 복사
const pkgs = await fsx.findAllParentChildPaths("package.json", process.cwd());
```
</content>
