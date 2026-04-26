# @simplysm/core-node

> Node.js 전용 코어 유틸리티 패키지. 파일 시스템 조작, 자식 프로세스 실행, 경로 처리, 파일 감시, Worker thread 래퍼, consola 로깅 설정을 제공한다.
> `@simplysm/core-common`에 의존하며, Node.js 런타임에서만 동작한다.

## Installation

```bash
npm install @simplysm/core-node
```

## 하려는 작업 → 읽을 파일

### 파일 시스템 작업

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 파일/디렉토리 읽기, 쓰기, 복사, 삭제, glob 검색 | [fsx](./utils/fsx.md) |
| 파일/디렉토리 변경을 지속적으로 감시하고 이벤트를 받아야 할 때 | [FsWatcher](./features/fs-watcher.md) |

### 프로세스 실행

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 외부 명령어(git, npm, 빌드 도구 등)를 실행하고 결과를 받아야 할 때 | [cpx](./utils/cpx.md) |
| CPU 집약적 작업을 워커 스레드로 분리할 때 | [Worker](./worker/worker.md) + [createWorker](./worker/create-worker.md) |

### 경로 처리

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 경로를 POSIX 스타일로 변환하거나, 경로 간 관계를 확인할 때 | [pathx](./utils/pathx.md) |

### 로깅 설정

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 서버/CLI 시작 시 consola 로깅을 환경에 맞게 자동 구성할 때 | [setupConsola](./logging/setup-consola.md) |
| 터미널에 아이콘/색상이 포함된 포맷으로 로그를 출력할 때 | [PrettyReporter](./logging/pretty-reporter.md) |
| 로그를 JSON 라인 파일로 기록하고 날짜별 로테이션이 필요할 때 | [createFileReporter](./logging/create-file-reporter.md) |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 환경 → `@simplysm/core-browser`
- 플랫폼 중립 유틸리티(DateTime, UUID, EventEmitter 등) → `@simplysm/core-common`

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
