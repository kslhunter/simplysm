# @simplysm/core-node — fsx

`import { fsx } from "@simplysm/core-node"`. Node `fs` 래퍼 네임스페이스. 대부분 함수는 동기(`...Sync`)와 비동기(Promise) 쌍으로 제공된다. IO 실패 시 `SdError(err, targetPath)` 로 경로를 포함해 throw 하고, 쓰기 계열은 상위 디렉토리를 자동 생성한다.

## 존재 확인

- `existsSync(targetPath: string): boolean` / `exists(targetPath: string): Promise<boolean>` — 파일/디렉토리 존재 여부. 비동기는 `fs.access` 실패를 throw 하지 않고 false 로 반환. 파일·디렉토리 구분은 없음.

## 디렉토리 생성

- `mkdirSync(targetPath: string): void` / `mkdir(targetPath: string): Promise<void>` — `recursive: true` 재귀 생성. 이미 존재하면 무시.

```ts
await fsx.mkdir("dist/sub");
```

## 삭제

- `rmSync(targetPath: string): void` — 재귀·force 삭제, **재시도 없이 즉시 실패**. 파일 잠금 우려가 있으면 비동기 `rm` 사용.
- `rm(targetPath: string): Promise<void>` — 재귀·force 삭제, 일시 오류 시 500ms 간격 최대 6회 재시도(Windows 잠금 대응).

## 복사

- `copySync(sourcePath: string, targetPath: string, filter?): void` / `copy(...): Promise<void>` — 파일·디렉토리 재귀 복사. **source 미존재 시 아무 작업 없이 반환**. 파일 복사는 실패 시 500ms 간격 최대 7회(0~6) 재시도. 비동기는 디렉토리 하위를 `parallelAsync` 병렬 복사.
  - `filter?: (absolutePath: string) => boolean` — 하위 항목마다 **절대 경로**로 호출, true 만 복사. 최상위 source 자신은 필터 대상 아님. 디렉토리에 false 면 그 디렉토리와 모든 하위를 건너뜀. 특정 확장자·폴더만 복사할 때 사용.

```ts
await fsx.copy("src", "dist", (p) => !p.endsWith(".map"));
```

## 파일 읽기

- `readSync(targetPath: string): string` / `read(...): Promise<string>` — UTF-8 문자열로 읽기.
- `readBytesSync(targetPath: string): Uint8Array` / `readBytes(...): Promise<Uint8Array>` — 바이너리로 읽기.
- `readJsonSync<TData = unknown>(targetPath: string): TData` / `readJson<TData = unknown>(...): Promise<TData>` — `@simplysm/core-common` 의 `json.parse` 로 파싱(표준 `JSON` 아님 — Date 등 확장 타입 복원). 파싱 실패 시 경로 + 내용 500자 프리뷰를 포함해 throw.

```ts
const cfg = await fsx.readJson<{ version: string }>("package.json");
```

## 파일 쓰기

- `writeSync(targetPath: string, data: string | Uint8Array): void` / `write(...): Promise<void>` — 상위 디렉토리 자동 생성 후 `flush: true` 로 기록(데이터 손실 방지 강제 플러시).
- `writeJsonSync(targetPath: string, data: unknown, options?): void` / `writeJson(...): Promise<void>` — `json.stringify` 로 직렬화 후 기록.
  - `options.replacer?: (this, key: string | undefined, value: unknown) => unknown` — 직렬화 시 값 변환 replacer.
  - `options.space?: string | number` — 들여쓰기(가독 출력용).

```ts
await fsx.writeJson("out.json", data, { space: 2 });
```

## 디렉토리 읽기

- `readdirSync(targetPath: string): string[]` / `readdir(...): Promise<string[]>` — 직속 항목 이름(상대 이름) 배열. 절대 경로 아님.

## 파일 정보

- `statSync(targetPath: string): fs.Stats` / `stat(...): Promise<fs.Stats>` — 심볼릭 링크를 따라간 stat.
- `lstatSync(targetPath: string): fs.Stats` / `lstat(...): Promise<fs.Stats>` — 링크 자체의 stat(링크 비추적). 링크 여부 판별·복사 분기에 사용.

## Glob

- `globSync(pattern: string, options?: GlobOptions): string[]` / `glob(...): Promise<string[]>` — glob 매칭. 입력 패턴의 `\` 를 `/` 로 치환하고, 결과는 `path.resolve` 한 **절대 경로** 배열.
  - `options?: GlobOptions` — `glob` 라이브러리 옵션(`dot`, `ignore`, `nodir` 등).

```ts
const files = await fsx.glob("src/**/*.ts", { ignore: ["**/*.d.ts"] });
```

## 유틸리티

- `clearEmptyDirectory(dirPath: string): Promise<void>` — 하위를 재귀 순회해 파일이 하나도 없는 빈 디렉토리를 삭제(하위 삭제로 비게 된 상위도 삭제). 미존재 시 무시.
- `findAllParentChildPathsSync(childGlob: string, fromPath: string, rootPath?: string): string[]` / `findAllParentChildPaths(...): Promise<string[]>` — fromPath 에서 루트 방향으로 부모 디렉토리를 순회하며 각 디렉토리에서 `childGlob` 매칭 파일을 수집(절대 경로). `tsconfig.json` 등 설정 파일 상향 탐색에 사용.
  - `childGlob` — 각 디렉토리에서 검색할 glob 패턴.
  - `fromPath` — 탐색 시작 경로.
  - `rootPath?` — 탐색 중단 경로. 미지정이거나 fromPath 가 rootPath 하위가 아니면 파일시스템 루트까지 올라감.

```ts
const tsconfigs = await fsx.findAllParentChildPaths("tsconfig.json", srcDir, projectRoot);
```

## 주의사항

- 동기 `rmSync`/`copySync` 는 재시도 동작이 비동기와 다름(rmSync 는 무재시도). Windows EPERM/잠금이 우려되면 비동기 버전 사용.
- glob 결과는 항상 절대 경로 — 상대 경로가 필요하면 호출 측에서 `path.relative` 처리.
- JSON IO 는 표준 `JSON` 이 아닌 `@simplysm/core-common` 의 `json` 사용 — Date 등 확장 타입 복원이 다름.
