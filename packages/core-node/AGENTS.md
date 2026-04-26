# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/core-node/README.md`를 참조한다.

## Package Overview

- 패키지: `@simplysm/core-node`
- 설명: Node.js 런타임 전용 코어 유틸리티. 파일 시스템, 자식 프로세스, 경로, 파일 감시, Worker thread, consola reporter를 제공한다.
- 공개 진입점: `src/index.ts`
- 소스 파일 수: 10개 (`src/**/*.ts`)
- 주요 의존성: `@simplysm/core-common`, `chokidar`, `consola`, `glob`, `minimatch`, `tsx`

## Architecture

```text
src/
  index.ts                    # 공개 API export 집계
  features/
    fs-watcher.ts             # Chokidar 기반 파일 감시 래퍼
    consola/
      file-reporter.ts        # JSON lines 파일 reporter
      pretty-reporter.ts      # 터미널용 consola reporter
      setup-consola.ts        # 환경별 reporter 조합
  utils/
    cp.ts                     # 자식 프로세스 실행 및 인코딩 처리
    fs.ts                     # 파일 시스템 편의 함수
    path.ts                   # POSIX 경로 브랜드 타입과 경로 유틸
  worker/
    create-worker.ts          # worker thread 내부 메서드 등록
    types.ts                  # Worker proxy/protocol 타입
    worker.ts                 # 메인 스레드용 Worker proxy
```

`index.ts`는 세 유틸리티 파일을 namespace export로 공개한다.

```typescript
export * as cpx from "./utils/cp";
export * as fsx from "./utils/fs";
export * as pathx from "./utils/path";
```

기능 클래스와 로깅/워커 API는 named export로 공개한다.

## Key Patterns

### Namespace export for low-level utilities

`utils/cp.ts`, `utils/fs.ts`, `utils/path.ts`는 함수 수가 많아 `cpx`, `fsx`, `pathx` namespace로만 공개된다. 소비자 문서도 이 단위를 Entry로 다룬다.

```typescript
import { fsx, cpx, pathx } from "@simplysm/core-node";

await fsx.write("/tmp/a.txt", "data");
const result = await cpx.spawn("git", ["status"], { cwd: "/repo" });
const rel = pathx.posix("src\\index.ts");
```

새 유틸리티 파일을 추가할 때는 `src/index.ts`에서 namespace export 여부를 먼저 결정한다. 기존 namespace에 넣는 편이 소비자 API 탐색에 맞으면 새 top-level named export를 만들지 않는다.

### Error wrapping in filesystem helpers

`utils/fs.ts`의 파일 시스템 함수는 Node 원본 오류를 그대로 던지지 않고 `SdError`에 대상 경로를 함께 담는다.

```typescript
export async function read(targetPath: string): Promise<string> {
  try {
    return await fs.promises.readFile(targetPath, "utf-8");
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}
```

새 파일 시스템 helper도 실패 경로를 호출자가 추적할 수 있도록 같은 방식으로 감싼다.

### Sync/async pairs

`fsx`는 대부분의 파일 작업을 동기/비동기 쌍으로 제공한다. 비동기 함수는 기본 API로 보고, 동기 함수는 CLI 초기화처럼 이벤트 루프 차단이 허용되는 경로에서만 사용한다.

```typescript
export function readSync(targetPath: string): string;
export async function read(targetPath: string): Promise<string>;
```

동기/비동기 쌍을 추가할 때는 이름을 `nameSync` / `name` 형태로 맞추고, JSDoc에도 동기 여부를 명시한다.

### Uint8Array boundary instead of Buffer

공개 API에서 바이너리 데이터는 `Uint8Array`로 노출한다. 내부에서 Node `fs`나 child process가 `Buffer`를 반환하더라도 즉시 `Uint8Array`로 변환하거나 `Uint8Array[]`로 수집한다.

```typescript
export function readBytesSync(targetPath: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(targetPath));
}
```

### Worker proxy protocol

`worker/create-worker.ts`와 `worker/worker.ts`는 `@simplysm/core-common`의 `transfer.encode/decode`로 요청/응답을 직렬화한다. 공개 타입은 `WorkerModule`, `WorkerProxy`, `PromisifyMethods`에 모여 있다.

```typescript
const request: WorkerRequest = {
  id: Uuid.generate().toString(),
  method,
  params,
};

const serialized = transfer.encode(request);
this._worker.postMessage(serialized.result, serialized.transferList);
```

메인 스레드 API는 `Worker.create<typeof import("./worker")>()`, 워커 파일 API는 `createWorker()`가 한 쌍이다. 프로토콜 필드를 바꾸면 양쪽 파일과 소비자 문서를 함께 확인한다.

### FsWatcher event coalescing

`FsWatcher`는 chokidar의 `"all"` 이벤트를 그대로 전달하지 않는다. `DebounceQueue`와 `Map`으로 같은 경로의 연속 이벤트를 병합한 뒤 `FsWatcherChangeInfo[]`를 전달한다.

```typescript
watcher.onChange({ delay: 300 }, (changes) => {
  for (const change of changes) {
    // change.event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
  }
});
```

`ignoreInitial`은 chokidar에 항상 `true`로 전달된다. 사용자가 `ignoreInitial: false`를 넘긴 경우에도 실제 초기 파일 목록은 전달하지 않고 첫 콜백을 빈 배열로만 호출한다.

### Consola reporter composition

`setupConsola()`는 환경에 따라 reporter 조합을 고정한다.

- 프로덕션(`DEV` 아님, `cli` 아님): `FileReporter`
- 개발 또는 `cli: true` + `SD_DEBUG`: `PrettyReporter`
- 개발 또는 `cli: true`: `FileReporter` + info 이하 `PrettyReporter`

로깅 정책을 바꿀 때는 `setup-consola.ts`만 보지 말고 `file-reporter.ts`, `pretty-reporter.ts`의 출력 형식도 같이 확인한다.

## Testing

테스트는 `packages/core-node/tests` 하위에 있다.

```text
tests/
  utils/
    cp.spec.ts
    fs.spec.ts
    fs-watcher*.spec.ts
    path.spec.ts
    spawn*.spec.ts
  worker/
    sd-worker.spec.ts
    fixtures/test-worker.ts
```

- 파일 시스템/경로/프로세스 유틸은 `tests/utils`에 둔다.
- Worker proxy 변경은 `tests/worker`와 fixture worker를 함께 확인한다.
- `*.acc.spec.ts`는 실제 프로세스 실행 등 acceptance 성격의 테스트다.
