# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/core-node` — Node.js 전용 코어 유틸리티 패키지. 파일 시스템 조작(fsx), 자식 프로세스 실행(cpx), 경로 처리(pathx), 파일 감시(FsWatcher), Worker thread 래퍼, consola 로깅 설정을 제공한다. 11개 TypeScript 소스 파일.

## Architecture

```
src/
├── utils/
│   ├── fs.ts         ← 파일 시스템 유틸리티 (존재 확인, 읽기/쓰기, 복사, 삭제, glob 등)
│   ├── cp.ts         ← 자식 프로세스 실행 (spawn, spawnSync, SpawnProcess, 인코딩 감지)
│   └── path.ts       ← 경로 유틸리티 (PosixPath 브랜드 타입, posix/posixResolve, isChildPath 등)
├── features/
│   ├── fs-watcher.ts ← Chokidar 기반 파일 시스템 감시 (FsWatcher 클래스, 이벤트 병합, EPERM 자동 복구)
│   └── consola/
│       ├── pretty-reporter.ts ← 터미널 출력용 consola reporter (아이콘, 색상, 에러 스택 포맷팅)
│       ├── file-reporter.ts   ← 파일 기반 consola reporter (JSON 라인, 날짜별 로테이션, 크기 제한)
│       └── setup-consola.ts   ← consola 환경별 자동 구성 (setupConsola, withMaxLevel)
├── worker/
│   ├── types.ts      ← Worker 관련 타입 정의 (WorkerModule, WorkerProxy, 메시지 형식)
│   ├── worker.ts     ← 타입 안전한 Worker 래퍼 (Worker.create, WorkerInternal)
│   └── create-worker.ts ← Worker thread 팩토리 (createWorker, send)
└── index.ts          ← public API: cpx, fsx, pathx 네임스페이스 + FsWatcher + consola + Worker 관련 export
```

`index.ts`에서 유틸리티 3종은 네임스페이스(`cpx`, `fsx`, `pathx`)로 re-export된다. 소비 코드에서 `import { fsx } from "@simplysm/core-node"` 형태로 사용한다.

## Key Patterns

### 유틸리티 네임스페이스 패턴

`fsx`, `cpx`, `pathx`는 각각 `utils/fs.ts`, `utils/cp.ts`, `utils/path.ts`의 모든 함수를 묶은 네임스페이스다. 새로운 함수를 추가할 때는 해당 유틸리티 파일에만 추가하면 자동으로 네임스페이스에 포함된다.

```typescript
// 소비 코드에서의 사용법
import { fsx, cpx, pathx } from "@simplysm/core-node";

await fsx.write("/path/to/file.txt", "content");
const result = await cpx.spawn("node", ["--version"]);
const posixPath = pathx.posixResolve("/base", "sub");
```

### 동기/비동기 쌍 패턴

`fsx`의 모든 연산은 동기(`*Sync`)와 비동기 쌍으로 제공된다. 비동기 버전을 기본으로 사용하고, CLI 초기화 등 동기가 반드시 필요한 경우에만 동기 버전을 사용한다.

- `rm`: 비동기. 파일 잠금 오류 시 최대 6회(500ms 간격) 재시도.
- `rmSync`: 동기. 재시도 없이 즉시 실패.
- 쓰기 함수(`write`, `writeSync`)는 상위 디렉토리를 자동 생성한다.
- 바이너리 읽기는 `readBytes`/`readBytesSync`로 `Uint8Array`를 반환한다.

### PosixPath 브랜드 타입

`pathx.PosixPath`는 슬래시(`/`) 구분자임을 타입 수준에서 보장하는 브랜드 타입이다. `posix()`나 `posixResolve()`를 통해서만 생성할 수 있다. `FsWatcher`가 반환하는 경로는 항상 `PosixPath`다.

```typescript
import { pathx } from "@simplysm/core-node";

const p: pathx.PosixPath = pathx.posix("C:\Users\test"); // "C:/Users/test"
const abs: pathx.PosixPath = pathx.posixResolve("./relative"); // 절대 경로 + POSIX
```

### SpawnProcess 패턴

`cpx.spawn()`은 `PromiseLike<SpawnResult>`를 구현하는 `SpawnProcess`를 반환한다. `await`로 결과를 기다리거나, `kill()`로 프로세스를 종료할 수 있다. `cpx.spawnSync()`는 동기 버전으로 `SpawnResult`를 직접 반환한다.

```typescript
import { cpx } from "@simplysm/core-node";

// await로 결과 획득
const result = await cpx.spawn("git", ["status"], { cwd: "/project" });
// result: { stdout: string, stderr: string, exitCode: number }

// 실행 중 종료
const proc = cpx.spawn("long-running-cmd", []);
proc.kill();

// stdio: "inherit"로 출력 직접 표시, reject: false로 오류 무시
await cpx.spawn("make", ["build"], { stdio: "inherit", reject: false });

// 동기 실행
const syncResult = cpx.spawnSync("node", ["--version"]);
```

기본적으로 `exitCode !== 0`이면 reject된다(spawn) 또는 throw된다(spawnSync). `options.reject: false`를 지정하면 항상 resolve/반환된다.

### FsWatcher 패턴

`FsWatcher.watch()`로 감시를 시작하고 `onChange()`로 핸들러를 등록한다. 짧은 시간 내 연속 이벤트는 내부에서 병합된다 (예: `add` + `change` -> `add`). EPERM 에러 발생 시 최대 3회까지 watcher를 자동 재시작한다.

```typescript
import { FsWatcher } from "@simplysm/core-node";

const watcher = await FsWatcher.watch(["src/**/*.ts"]);

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { event, path } of changes) {
    // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
    // path: PosixPath
  }
});

await watcher.close();
```

glob 패턴이 포함된 경로는 glob base 디렉토리를 감시하고, Minimatch로 이벤트를 필터링한다.

### Consola 로깅 패턴

`setupConsola()`는 환경에 따라 consola reporter를 자동 구성한다. 프로젝트 루트의 `console.*` 금지 규칙을 대체하여 `consola`를 표준 로깅 수단으로 사용한다.

환경별 동작:
- **프로덕션** (`env.DEV` 아님, `cli` 아님): `FileReporter`만 사용, debug 레벨까지 파일 기록
- **개발 또는 `cli: true` + `SD_DEBUG`**: `PrettyReporter`만 사용, debug 레벨까지 터미널 출력
- **개발 또는 `cli: true` (일반)**: `FileReporter` + `PrettyReporter`(info 이하만), debug는 파일에만 기록

```typescript
import { setupConsola, PrettyReporter, createFileReporter, withMaxLevel } from "@simplysm/core-node";

// 환경별 자동 구성
setupConsola();

// CLI 모드 (프로덕션에서도 dev 경로 사용)
setupConsola({ cli: true });

// 개별 reporter 직접 사용
const fileReporter = createFileReporter({ maxSize: 10 * 1024 * 1024, maxDays: 7 });
const limitedReporter = withMaxLevel(new PrettyReporter(), 3); // info 이하만
```

`FileReporter`는 `.logs/` 디렉토리에 `app.YYYY-MM-DD.log` 형식으로 JSON 라인을 기록하며, 날짜별 로테이션과 크기 제한(기본 20MB)을 지원한다. `maxDays`(기본 14일) 이전의 로그 파일은 자동 삭제된다.

### Worker thread 패턴

Worker thread는 `createWorker()`(워커 측)와 `Worker.create()`(메인 측) 한 쌍으로 구성된다. 메서드와 이벤트 타입이 모두 타입 안전하다.

```typescript
// worker.ts (워커 파일)
import { createWorker } from "@simplysm/core-node";

interface MyEvents { progress: number; }

const methods = {
  add: (a: number, b: number) => {
    sender.send("progress", 50);
    return a + b;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts (메인 파일)
import { Worker } from "@simplysm/core-node";
import type * as MyWorkerModule from "./worker";

const worker = Worker.create<typeof MyWorkerModule>("./worker.ts");

worker.on("progress", (value) => { /* ... */ });
const result = await worker.add(10, 20); // 30
await worker.terminate();
```

개발 환경(`.ts` 파일)에서는 `lib/worker-dev-proxy.js`를 통해 tsx로 TypeScript 워커를 실행한다. 프로덕션(`.js` 파일)에서는 직접 Worker를 생성한다.

## Testing

**프레임워크**: Vitest

테스트 디렉토리가 `src/` 구조를 미러링한다. `tests/utils/`에는 유닛 테스트와 수용 테스트(`.acc.spec.ts`)가 공존한다.

```
tests/
├── utils/
│   ├── fs.spec.ts                ← fsx 함수 유닛 테스트 (임시 디렉토리 사용)
│   ├── fs-watcher.spec.ts        ← FsWatcher 유닛 테스트
│   ├── fs-watcher-error.spec.ts  ← FsWatcher 에러 핸들링 테스트
│   ├── fs-watcher-recovery.spec.ts ← FsWatcher EPERM 자동 복구 테스트
│   ├── path.spec.ts              ← pathx 함수 유닛 테스트
│   ├── cp.spec.ts                ← cpx 인코딩/디코딩 함수 유닛 테스트
│   ├── cp.acc.spec.ts            ← cpx 인코딩 감지 수용 테스트
│   ├── spawn.spec.ts             ← resolveStdioPipe 유닛 테스트
│   ├── spawn.acc.spec.ts         ← spawn 수용 테스트 (실제 프로세스 실행)
│   ├── spawn-sync.acc.spec.ts    ← spawnSync 수용 테스트
│   └── exec.acc.spec.ts          ← exec 수용 테스트 (레거시)
└── worker/
    ├── sd-worker.spec.ts         ← Worker thread 통합 테스트
    └── fixtures/test-worker.ts   ← 테스트용 워커 파일
```

`fs.spec.ts`의 패턴: `beforeEach`에서 `os.tmpdir()` 하위에 임시 디렉토리를 생성하고, `afterEach`에서 삭제한다.

워커 테스트(`sd-worker.spec.ts`)는 `afterEach`에서 `worker.terminate()`를 호출하여 반드시 정리한다. 픽스처 워커 파일(`fixtures/test-worker.ts`)은 테스트 전용이므로 `tests/` 내부에 위치한다.

수용 테스트(`.acc.spec.ts`)는 실제 시스템 환경(프로세스 실행, 인코딩 등)에 의존하므로 CI 환경에 따라 결과가 달라질 수 있다.
