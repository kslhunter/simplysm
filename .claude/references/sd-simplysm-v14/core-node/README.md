# @simplysm/core-node

> Node.js 전용 코어 유틸리티 패키지. 파일 시스템 조작, 자식 프로세스 실행, 경로 처리, 파일 감시, Worker thread 래퍼, consola 로깅 설정을 제공한다.
> `@simplysm/core-common`에 의존하며, Node.js 런타임에서만 동작한다.

## Installation

```bash
npm install @simplysm/core-node
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 파일 읽기/쓰기/복사/삭제 | [fsx](./utils/fsx.md) |
| 자식 프로세스 실행 | [cpx](./utils/cpx.md) |
| 경로 변환/비교 | [pathx](./utils/pathx.md) |
| 파일 변경 감시 | [FsWatcher](./features/fs-watcher.md) |
| 로깅 설정 | [setupConsola](./logging/setup-consola.md) |
| 커스텀 터미널 로깅 | [PrettyReporter](./logging/pretty-reporter.md) |
| 커스텀 파일 로깅 | [createFileReporter](./logging/create-file-reporter.md) |
| 워커 스레드로 작업 분리 | [Worker](./worker/worker.md) + [createWorker](./worker/create-worker.md) |

## API Overview

### Utils

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`fsx`](./utils/fsx.md) | namespace | 파일 시스템 작업(존재 확인, 읽기/쓰기, 복사, 삭제, glob)이 필요할 때 |
| [`cpx`](./utils/cpx.md) | namespace | 외부 명령어나 자식 프로세스를 실행할 때 |
| [`pathx`](./utils/pathx.md) | namespace | 경로를 POSIX 스타일로 변환하거나, 경로 간 관계(하위 경로 여부)를 확인할 때 |

### Features

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`FsWatcher`](./features/fs-watcher.md) | class | 파일/디렉토리 변경을 지속적으로 감시하고 이벤트를 받아야 할 때 |

### Logging

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`setupConsola`](./logging/setup-consola.md) | function | 서버/CLI 시작 시 consola 로깅을 환경에 맞게 자동 구성할 때 |
| [`PrettyReporter`](./logging/pretty-reporter.md) | class | 터미널에 아이콘/색상이 포함된 포맷으로 로그를 출력할 때 |
| [`createFileReporter`](./logging/create-file-reporter.md) | function | 로그를 JSON 라인 파일로 기록하고 날짜별 로테이션이 필요할 때 |

### Worker

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`Worker`](./worker/worker.md) | const | 메인 스레드에서 타입 안전하게 워커 메서드를 호출할 때 |
| [`createWorker`](./worker/create-worker.md) | function | 워커 파일에서 메서드/이벤트를 등록할 때 (`Worker`와 쌍으로 사용) |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 환경 → `@simplysm/core-browser`
- 플랫폼 중립 유틸리티(DateTime, UUID, EventEmitter 등) → `@simplysm/core-common`
