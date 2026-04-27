# API Index — @simplysm/core-node

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Utils

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `fsx` | namespace | [fsx.md](./utils/fsx.md) | 파일 시스템 CRUD, glob 검색, JSON 파일 처리가 필요할 때 |
| `cpx` | namespace | [cpx.md](./utils/cpx.md) | 외부 명령어나 자식 프로세스를 실행할 때 |
| `pathx` | namespace | [pathx.md](./utils/pathx.md) | 경로를 POSIX 스타일로 변환하거나 경로 간 관계를 확인할 때 |

## Features

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `FsWatcher` | class | [fs-watcher.md](./features/fs-watcher.md) | 파일/디렉토리 변경을 지속적으로 감시하고 이벤트를 받아야 할 때 |

## Logging

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `setupConsola` | function | [setup-consola.md](./logging/setup-consola.md) | 서버/CLI 시작 시 consola 로깅을 환경별로 자동 구성할 때 |
| `withMaxLevel` | function | [setup-consola.md](./logging/setup-consola.md) | reporter에 로그 레벨 상한선을 설정할 때 |
| `PrettyReporter` | class | [pretty-reporter.md](./logging/pretty-reporter.md) | 터미널에 아이콘/색상이 포함된 포맷으로 로그를 출력할 때 |
| `createFileReporter` | function | [create-file-reporter.md](./logging/create-file-reporter.md) | 로그를 JSON 라인 파일로 기록하고 날짜별 로테이션이 필요할 때 |

## Worker

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `Worker` | const | [worker.md](./worker/worker.md) | 메인 스레드에서 타입 안전하게 워커 메서드를 호출할 때 |
| `createWorker` | function | [create-worker.md](./worker/create-worker.md) | 워커 파일에서 메서드/이벤트를 등록할 때 |
