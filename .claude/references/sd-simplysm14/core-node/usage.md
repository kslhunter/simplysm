# @simplysm/core-node

Node.js 전용 코어 유틸리티 패키지. 파일 시스템 조작, 자식 프로세스 실행, 경로 처리, 파일 감시, Worker thread 래퍼, consola 로깅 설정을 제공한다.

## Installation

```bash
npm install @simplysm/core-node
```

## API Overview

### File System (fsx)

파일 시스템 작업을 위한 유틸리티 네임스페이스. 모든 함수는 동기/비동기 쌍으로 제공된다.

| API | Type | Description |
|-----|------|-------------|
| `exists` | function | 파일 또는 디렉토리가 존재하는지 확인 (비동기) |
| `existsSync` | function | 파일 또는 디렉토리가 존재하는지 확인 (동기) |
| `mkdir` | function | 디렉토리를 생성 (재귀적, 비동기) |
| `mkdirSync` | function | 디렉토리를 생성 (재귀적, 동기) |
| `rm` | function | 파일/디렉토리 삭제, 파일 잠금 시 최대 6회 재시도 (비동기) |
| `rmSync` | function | 파일/디렉토리 삭제 (동기, 재시도 없음) |
| `copy` | function | 파일/디렉토리 복사, 필터 옵션 지원 (비동기) |
| `copySync` | function | 파일/디렉토리 복사, 필터 옵션 지원 (동기) |
| `read` | function | 파일을 UTF-8 문자열로 읽음 (비동기) |
| `readSync` | function | 파일을 UTF-8 문자열로 읽음 (동기) |
| `readBytes` | function | 파일을 Uint8Array로 읽음 (비동기) |
| `readBytesSync` | function | 파일을 Uint8Array로 읽음 (동기) |
| `readJson` | function | JSON 파일 읽음 (비동기) |
| `readJsonSync` | function | JSON 파일 읽음 (동기) |
| `write` | function | 파일에 데이터 쓰기, 상위 디렉토리 자동 생성 (비동기) |
| `writeSync` | function | 파일에 데이터 쓰기, 상위 디렉토리 자동 생성 (동기) |
| `writeJson` | function | JSON 파일에 데이터 쓰기 (비동기) |
| `writeJsonSync` | function | JSON 파일에 데이터 쓰기 (동기) |
| `readdir` | function | 디렉토리 내용 읽기 (비동기) |
| `readdirSync` | function | 디렉토리 내용 읽기 (동기) |
| `stat` | function | 파일/디렉토리 정보 조회, 심볼릭 링크 따라감 (비동기) |
| `statSync` | function | 파일/디렉토리 정보 조회, 심볼릭 링크 따라감 (동기) |
| `lstat` | function | 파일/디렉토리 정보 조회, 심볼릭 링크 따라가지 않음 (비동기) |
| `lstatSync` | function | 파일/디렉토리 정보 조회, 심볼릭 링크 따라가지 않음 (동기) |
| `glob` | function | Glob 패턴으로 파일 검색 (비동기) |
| `globSync` | function | Glob 패턴으로 파일 검색 (동기) |
| `clearEmptyDirectory` | function | 빈 디렉토리 재귀적 삭제 |
| `findAllParentChildPathsSync` | function | 부모 디렉토리에서 특정 파일 검색 (동기) |
| `findAllParentChildPaths` | function | 부모 디렉토리에서 특정 파일 검색 (비동기) |

→ See [docs/file-system.md](./docs/file-system.md) for details.

### Child Process (cpx)

자식 프로세스 실행 및 인코딩 감지.

| API | Type | Description |
|-----|------|-------------|
| `spawn` | function | 자식 프로세스 실행, Promise 기반, 실시간 제어 가능 |
| `spawnSync` | function | 자식 프로세스 동기 실행 |
| `getSystemEncoding` | function | 시스템 기본 인코딩 감지 |
| `codePageToEncoding` | function | Windows 코드 페이지를 인코딩명으로 변환 |
| `decodeBytes` | function | Uint8Array를 문자열로 디코딩 |
| `resolveStdioPipe` | function | stdio 옵션에서 pipe 여부 판단 |
| `resetEncodingCache` | function | 인코딩 캐시 초기화 |
| `SpawnProcess` | class | spawn() 반환 타입, PromiseLike 구현 |
| `SpawnResult` | interface | spawn/spawnSync 결과 타입 |

→ See [docs/child-process.md](./docs/child-process.md) for details.

### Path (pathx)

경로 처리 및 PosixPath 브랜드 타입.

| API | Type | Description |
|-----|------|-------------|
| `posix` | function | 경로를 POSIX 스타일(슬래시)로 변환 |
| `posixResolve` | function | 경로를 절대 경로로 resolve한 후 POSIX 스타일로 변환 |
| `changeFileDirectory` | function | 파일의 디렉토리를 변경 |
| `basenameWithoutExt` | function | 확장자를 제외한 파일명 반환 |
| `isChildPath` | function | 자식 경로 여부 확인 |
| `filterByTargets` | function | 대상 경로 목록에 기반한 파일 필터링 |
| `PosixPath` | type | POSIX 스타일 경로 브랜드 타입 |

→ See [docs/path.md](./docs/path.md) for details.

### File Watching (FsWatcher)

Chokidar 기반 파일 시스템 감시 클래스.

| API | Type | Description |
|-----|------|-------------|
| `FsWatcher` | class | 파일 시스템 감시, 이벤트 병합, 자동 복구 |
| `FsWatcherEvent` | type | 감시 이벤트 타입: "add" \| "addDir" \| "change" \| "unlink" \| "unlinkDir" |
| `FsWatcherChangeInfo` | interface | 파일 변경 정보 (event + path) |

→ See [docs/file-watching.md](./docs/file-watching.md) for details.

### Logging (consola)

Consola 로깅 설정 및 reporter.

| API | Type | Description |
|-----|------|-------------|
| `setupConsola` | function | 환경별 자동 consola 구성 |
| `withMaxLevel` | function | 로그 레벨 상한선을 설정한 reporter 래퍼 |
| `PrettyReporter` | class | 터미널 출력용 consola reporter |
| `createFileReporter` | function | 파일 기반 consola reporter 생성 |

→ See [docs/logging.md](./docs/logging.md) for details.

### Worker Threads

타입 안전한 Worker thread 래퍼.

| API | Type | Description |
|-----|------|-------------|
| `Worker` | class | Worker thread 프록시 생성 및 메서드 호출 |
| `createWorker` | function | 워커 측에서 호출하는 워커 모듈 생성 함수 |
| `WorkerModule` | interface | 워커 모듈의 타입 구조 |
| `WorkerProxy` | type | Worker.create() 반환 프록시 타입 |
| `WorkerRequest` | interface | 워커 요청 메시지 타입 |
| `WorkerResponse` | type | 워커 응답 메시지 타입 |
| `PromisifyMethods` | type | 메서드를 Promise 버전으로 변환하는 매핑 타입 |

→ See [docs/worker-threads.md](./docs/worker-threads.md) for details.

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
console.log(result.stdout);

// 실시간 출력
await cpx.spawn("npm", ["run", "build"], { stdio: "inherit" });

// 오류 무시
const result = await cpx.spawn("cmd", ["nonexistent"], { reject: false });
// result.exitCode가 0이 아니어도 throw되지 않음

// 동기 실행
const syncResult = cpx.spawnSync("node", ["--version"]);
console.log(syncResult.stdout);
```

### Path Utilities

```typescript
import { pathx } from "@simplysm/core-node";

// POSIX 경로 변환
const posixPath = pathx.posix("C:\\Users\\test");
console.log(posixPath); // "C:/Users/test"

// 절대 경로 resolve + POSIX
const absPath = pathx.posixResolve("./relative", "path");

// 자식 경로 확인
const isChild = pathx.isChildPath("/a/b/c", "/a/b"); // true

// 경로 필터링
const filtered = pathx.filterByTargets(
  ["/proj/src/a.ts", "/proj/tests/b.ts"],
  ["src"],
  "/proj"
);
// ["/proj/src/a.ts"]
```

### File Watching

```typescript
import { FsWatcher } from "@simplysm/core-node";

const watcher = await FsWatcher.watch(["src/**/*.ts"]);

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { event, path } of changes) {
    console.log(`${event}: ${path}`);
  }
});

// 파일 감시 종료
await watcher.close();
```

### Logging Setup

```typescript
import { setupConsola } from "@simplysm/core-node";

// 환경별 자동 구성
setupConsola();

// CLI 모드 (프로덕션에서도 file + pretty reporter 사용)
setupConsola({ cli: true });
```

### Worker Threads

```typescript
// worker.ts (워커 파일)
import { createWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
}

const methods = {
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b,
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts (메인 파일)
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

const worker = Worker.create<typeof MyWorker>("./worker.ts");

const sum = await worker.add(10, 20); // 30
const product = await worker.multiply(5, 6); // 30

worker.on("progress", (value) => {
  console.log(`Progress: ${value}%`);
});

await worker.terminate();
```
