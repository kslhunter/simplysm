# @simplysm/core-node

Node 런타임에서 파일시스템·경로·자식 프로세스·파일 감시·consola reporter·worker_threads 프록시를 다룰 때 쓰는 기반 API. 거의 모든 함수는 동기/비동기 짝으로 제공되고, fs 계열 오류는 경로를 담은 `SdError` 로 다시 throw 한다.

## 사용 트리거 인덱스

- **cpx** — 외부 명령을 실행해 stdout/stderr 문자열과 exitCode 로 받고, OS 콘솔 인코딩을 감지·디코딩할 때. 자세히: [cpx.md](./cpx.md)
- **fsx** — 파일/디렉토리 존재 확인·생성·삭제·복사·읽기/쓰기·JSON·stat·glob·부모 방향 탐색을 처리할 때. 자세히: [fsx.md](./fsx.md)
- **pathx** — 경로를 POSIX 슬래시로 정규화하거나 하위 경로 판정·디렉토리 치환·basename 추출·target 필터링을 할 때. 자세히: [pathx.md](./pathx.md)
- **FsWatcher** — chokidar 감시 이벤트를 대상 glob 으로 재필터링하고, 짧은 시간의 변경을 병합해 콜백 1회로 처리할 때. 자세히: [fs-watcher.md](./fs-watcher.md)
- **consola 설정/리포터** — Node 진입점에서 consola reporter 를 환경별로 설정하거나 Pretty/File reporter 를 직접 구성할 때. 사용법: [logging.md](../../manuals/logging.md), 자세히: [consola.md](./consola.md)
- **Worker / createWorker** — worker_threads 를 typed method proxy·event 전송·stdout 전달 프로토콜로 감쌀 때. 자세히: [worker.md](./worker.md)
