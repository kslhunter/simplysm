# @simplysm/core-node

Node.js 전용 코어 유틸리티 패키지. 파일 시스템 조작, 자식 프로세스 실행, 경로 처리, 파일 감시, Worker thread 래퍼, consola 로깅 설정을 제공한다.

## Installation

```bash
npm install @simplysm/core-node
```

## API Overview

### Utilities

네임스페이스로 re-export되는 유틸리티 모음. `import { fsx, cpx, pathx } from "@simplysm/core-node"` 형태로 사용한다.

| API | Type | Description |
|-----|------|-------------|
| `cpx` | namespace | 자식 프로세스 실행, 인코딩 감지, spawn/spawnSync |
| `fsx` | namespace | 파일 시스템 유틸리티 (존재 확인, 읽기/쓰기, 복사, 삭제, glob) |
| `pathx` | namespace | 경로 유틸리티 (PosixPath 브랜드 타입, posix 변환, 경로 비교) |

→ See [docs/utilities.md](./docs/utilities.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `FsWatcher` | class | Chokidar 기반 파일 시스템 감시 래퍼. 이벤트 병합, EPERM 자동 복구 |
| `FsWatcherEvent` | type | 파일 변경 이벤트 타입 (`"add" \| "addDir" \| "change" \| "unlink" \| "unlinkDir"`) |
| `FsWatcherChangeInfo` | interface | 파일 변경 정보 (event + path) |
| `PrettyReporter` | class | 터미널 출력용 consola reporter (아이콘, 색상, 에러 스택 포맷팅) |
| `createFileReporter` | function | 파일 기반 consola reporter 생성 (JSON 라인, 날짜별 로테이션, 크기 제한) |
| `FileReporterOptions` | interface | createFileReporter 옵션 (maxSize, maxDays) |
| `withMaxLevel` | function | consola reporter를 지정된 로그 레벨 이하로 제한하는 래퍼 |
| `setupConsola` | function | 환경에 따라 consola reporter를 자동 구성 |
| `SetupConsolaOptions` | interface | setupConsola 옵션 (cli 모드 여부) |

→ See [docs/features.md](./docs/features.md) for details.

### Worker

| API | Type | Description |
|-----|------|-------------|
| `Worker` | const (object) | 타입 안전한 Worker Proxy 생성 팩토리 (`Worker.create()`) |
| `createWorker` | function | Worker thread 측에서 메서드와 이벤트를 등록하는 팩토리 |
| `WorkerModule` | interface | createWorker가 반환하는 워커 모듈의 타입 구조 |
| `PromisifyMethods` | type | 메서드 반환값을 Promise로 감싸는 매핑 타입 |
| `WorkerProxy` | type | Worker.create()가 반환하는 프록시 타입 (메서드 + on/off + terminate) |
| `WorkerRequest` | interface | 내부 워커 요청 메시지 |
| `WorkerResponse` | type | 내부 워커 응답 메시지 (discriminated union: return \| error \| event \| log) |

→ See [docs/worker.md](./docs/worker.md) for details.

## Usage Examples

### 파일 시스템 조작

```typescript
import { fsx } from "@simplysm/core-node";

// 파일 읽기/쓰기
await fsx.write("/path/to/file.txt", "content");
const text = await fsx.read("/path/to/file.txt");

// JSON 읽기/쓰기
await fsx.writeJson("/path/to/config.json", { key: "value" }, { space: 2 });
const config = await fsx.readJson<{ key: string }>("/path/to/config.json");

// glob 검색
const tsFiles = await fsx.glob("/project/src/**/*.ts");
```

### 자식 프로세스 실행

```typescript
import { cpx } from "@simplysm/core-node";

const result = await cpx.spawn("git", ["status"], { cwd: "/project" });
// result: { stdout: string, stderr: string, exitCode: number }

// 실행 중 종료 가능
const proc = cpx.spawn("long-running-cmd", []);
proc.kill();
```

### Worker thread

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

const methods = { add: (a: number, b: number) => a + b };
export default createWorker(methods);

// main.ts
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

const worker = Worker.create<typeof MyWorker>("./worker.ts");
const result = await worker.add(10, 20); // 30
await worker.terminate();
```
