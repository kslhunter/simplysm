# @simplysm/core-node

Node.js 전용 코어 유틸리티 패키지. 파일 시스템 조작, 자식 프로세스 실행, 경로 처리, 파일 감시, Worker thread 래퍼, consola 로깅 설정을 제공한다.

## Installation

```bash
npm install @simplysm/core-node
```

## API Overview

### Utilities (fsx)

파일 시스템 유틸리티. `import { fsx } from "@simplysm/core-node"` 형태로 사용한다.

| API | Type | Description |
|-----|------|-------------|
| `fsx.exists` | function | 파일/디렉토리 존재 여부 확인 (비동기) |
| `fsx.existsSync` | function | 파일/디렉토리 존재 여부 확인 (동기) |
| `fsx.mkdir` | function | 디렉토리 재귀 생성 (비동기) |
| `fsx.mkdirSync` | function | 디렉토리 재귀 생성 (동기) |
| `fsx.rm` | function | 파일/디렉토리 삭제, 최대 6회 재시도 (비동기) |
| `fsx.rmSync` | function | 파일/디렉토리 삭제, 재시도 없음 (동기) |
| `fsx.copy` | function | 파일/디렉토리 복사, filter 옵션 지원 (비동기) |
| `fsx.copySync` | function | 파일/디렉토리 복사, filter 옵션 지원 (동기) |
| `fsx.read` | function | 파일을 UTF-8 문자열로 읽기 (비동기) |
| `fsx.readSync` | function | 파일을 UTF-8 문자열로 읽기 (동기) |
| `fsx.readBytes` | function | 파일을 Uint8Array로 읽기 (비동기) |
| `fsx.readBytesSync` | function | 파일을 Uint8Array로 읽기 (동기) |
| `fsx.readJson` | function | JSON 파일 읽기 (비동기) |
| `fsx.readJsonSync` | function | JSON 파일 읽기 (동기) |
| `fsx.write` | function | 파일 쓰기, 상위 디렉토리 자동 생성 (비동기) |
| `fsx.writeSync` | function | 파일 쓰기, 상위 디렉토리 자동 생성 (동기) |
| `fsx.writeJson` | function | JSON 파일 쓰기 (비동기) |
| `fsx.writeJsonSync` | function | JSON 파일 쓰기 (동기) |
| `fsx.readdir` | function | 디렉토리 내용 읽기 (비동기) |
| `fsx.readdirSync` | function | 디렉토리 내용 읽기 (동기) |
| `fsx.stat` | function | 파일 정보 조회, 심볼릭 링크 따라감 (비동기) |
| `fsx.statSync` | function | 파일 정보 조회, 심볼릭 링크 따라감 (동기) |
| `fsx.lstat` | function | 파일 정보 조회, 심볼릭 링크 따라가지 않음 (비동기) |
| `fsx.lstatSync` | function | 파일 정보 조회, 심볼릭 링크 따라가지 않음 (동기) |
| `fsx.glob` | function | glob 패턴으로 파일 검색, 절대 경로 반환 (비동기) |
| `fsx.globSync` | function | glob 패턴으로 파일 검색, 절대 경로 반환 (동기) |
| `fsx.clearEmptyDirectory` | function | 빈 디렉토리 재귀 삭제 (비동기) |
| `fsx.findAllParentChildPaths` | function | 부모 디렉토리 순회하며 glob 매칭 경로 수집 (비동기) |
| `fsx.findAllParentChildPathsSync` | function | 부모 디렉토리 순회하며 glob 매칭 경로 수집 (동기) |

→ See [docs/utilities-fsx.md](./docs/utilities-fsx.md) for details.

### Utilities (cpx)

자식 프로세스 실행 유틸리티. `import { cpx } from "@simplysm/core-node"` 형태로 사용한다.

| API | Type | Description |
|-----|------|-------------|
| `cpx.spawn` | function | 비동기 자식 프로세스 실행, SpawnProcess 반환 |
| `cpx.spawnSync` | function | 동기 자식 프로세스 실행, SpawnResult 반환 |
| `cpx.SpawnProcess` | class | spawn()의 반환 타입. PromiseLike + kill() 지원 |
| `cpx.SpawnResult` | interface | 프로세스 실행 결과 (stdout, stderr, exitCode) |
| `cpx.getSystemEncoding` | function | 시스템 인코딩 감지 (Windows: chcp, Linux: LANG 환경변수) |
| `cpx.codePageToEncoding` | function | Windows 코드 페이지 번호를 인코딩 이름으로 변환 |
| `cpx.resetEncodingCache` | function | 캐시된 시스템 인코딩 초기화 |
| `cpx.decodeBytes` | function | Uint8Array를 시스템 인코딩으로 디코딩 |
| `cpx.resolveStdioPipe` | function | stdio 옵션에서 stdout/stderr pipe 여부 추출 |

→ See [docs/utilities-cpx.md](./docs/utilities-cpx.md) for details.

### Utilities (pathx)

경로 유틸리티. `import { pathx } from "@simplysm/core-node"` 형태로 사용한다.

| API | Type | Description |
|-----|------|-------------|
| `pathx.PosixPath` | type | POSIX 슬래시 경로임을 타입 수준에서 보장하는 브랜드 타입 |
| `pathx.posix` | function | 백슬래시를 슬래시로 변환하여 PosixPath 반환 |
| `pathx.posixResolve` | function | 절대 경로 resolve 후 POSIX 스타일로 변환 |
| `pathx.changeFileDirectory` | function | 파일 경로의 디렉토리 부분을 변경 |
| `pathx.basenameWithoutExt` | function | 확장자를 제외한 파일명 반환 |
| `pathx.isChildPath` | function | childPath가 parentPath의 하위 경로인지 확인 |
| `pathx.filterByTargets` | function | 대상 경로 목록으로 파일 목록 필터링 |

→ See [docs/utilities-pathx.md](./docs/utilities-pathx.md) for details.

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
