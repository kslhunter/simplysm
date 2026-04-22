# @simplysm/core-node

Node.js 전용 코어 유틸리티 패키지. 파일 시스템 조작, 자식 프로세스 실행, 경로 처리, 파일 감시, Worker thread 래퍼, consola 로깅 설정을 제공한다.

## Installation

```bash
npm install @simplysm/core-node
```

## API Overview

### Utils

| Entry | Kind | Description |
|-------|------|-------------|
| [`fsx`](./docs/utils/fsx.md) | namespace | 파일 시스템 유틸리티. 존재 확인, 읽기/쓰기, 복사, 삭제, glob 등. 모든 연산은 동기/비동기 쌍으로 제공 |
| [`cpx`](./docs/utils/cpx.md) | namespace | 자식 프로세스 실행 및 인코딩 감지. `spawn`, `spawnSync`, `SpawnProcess`, `SpawnResult` 포함 |
| [`pathx`](./docs/utils/pathx.md) | namespace | 경로 처리. `PosixPath` 브랜드 타입, `posix`, `posixResolve`, `isChildPath`, `filterByTargets` 등 |

### Features

| Entry | Kind | Description |
|-------|------|-------------|
| [`FsWatcher`](./docs/features/fs-watcher.md) | class | Chokidar 기반 파일 시스템 감시. 이벤트 병합, EPERM 자동 복구 |

### Logging

| Entry | Kind | Description |
|-------|------|-------------|
| [`PrettyReporter`](./docs/logging/pretty-reporter.md) | class | 터미널 출력용 consola reporter. 아이콘, 색상, 에러 스택 포맷팅 |
| [`createFileReporter`](./docs/logging/create-file-reporter.md) | function | 파일 기반 consola reporter 생성. JSON 라인, 날짜별 로테이션, 크기 제한 |
| [`setupConsola`](./docs/logging/setup-consola.md) | function | 환경별 자동 consola 구성. `withMaxLevel`도 같은 파일에 포함 |

### Worker

| Entry | Kind | Description |
|-------|------|-------------|
| [`Worker`](./docs/worker/worker.md) | const | 타입 안전한 Worker thread 프록시 생성. `WorkerProxy`, `WorkerModule`, `WorkerRequest`, `WorkerResponse`, `PromisifyMethods` 포함 |
| [`createWorker`](./docs/worker/create-worker.md) | function | 워커 파일에서 메서드와 이벤트를 등록하는 팩토리 함수 |

## Usage Examples

### File System Operations

```typescript
import { fsx } from "@simplysm/core-node";

// 파일 존재 확인
const exists = await fsx.exists("/path/to/file.txt");

// 파일 읽기/쓰기
const content = await fsx.read("/path/to/file.txt");
await fsx.write("/path/to/new-file.txt", "Hello, World!");

// JSON 파일 읽기/쓰기
const data = await fsx.readJson<{ name: string }>("/path/to/config.json");
await fsx.writeJson("/path/to/config.json", { name: "test" });

// 파일 복사 (필터 적용)
await fsx.copy("/src/dir", "/dst/dir", (filePath) => {
  return !filePath.includes("node_modules");
});

// Glob 검색
const tsFiles = await fsx.glob("src/**/*.ts");
```

### Child Process Execution

```typescript
import { cpx } from "@simplysm/core-node";

// 기본 실행
const result = await cpx.spawn("npm", ["list"], { cwd: "/project" });

// 실시간 출력
await cpx.spawn("npm", ["run", "build"], { stdio: "inherit" });

// 오류 무시
const r = await cpx.spawn("cmd", ["nonexistent"], { reject: false });

// 동기 실행
const syncResult = cpx.spawnSync("node", ["--version"]);
```

### File Watching

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

### Logging Setup

```typescript
import { setupConsola } from "@simplysm/core-node";

// 환경별 자동 구성
setupConsola();

// CLI 모드 (프로덕션에서도 터미널 출력 포함)
setupConsola({ cli: true });
```

### Worker Threads

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface MyEvents { progress: number; }

const methods = {
  add: (a: number, b: number) => a + b,
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

const worker = Worker.create<typeof MyWorker>("./worker.ts");

worker.on("progress", (value) => { /* ... */ });
const sum = await worker.add(10, 20); // 30
await worker.terminate();
```
