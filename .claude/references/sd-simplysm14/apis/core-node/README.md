# @simplysm/core-node

Node.js 런타임 전용 유틸리티·기능 모음. 파일시스템 IO(`fsx`)·경로 가공(`pathx`)·자식 프로세스(`cpx`) 네임스페이스, 파일 감시(`FsWatcher`), consola 로그 reporter 셋업, worker_threads 타입 안전 래퍼를 제공한다.

`cpx`/`fsx`/`pathx` 는 `export * as` 네임스페이스로 노출되므로 항상 접두사로 호출한다 (`import { fsx } from "@simplysm/core-node"` → `fsx.read(...)`). 나머지(FsWatcher, consola 셋업, worker)는 named export.

## 사용 트리거 인덱스

- **fsx** — 파일/디렉토리 읽기·쓰기·복사·삭제·glob·stat·JSON IO 를 sync/async 쌍으로 다룰 때. 모든 오류를 `SdError(원인, 경로)` 로 감싸 던진다. 자세히: [fsx.md](./fsx.md)
- **pathx** — 경로를 POSIX(슬래시)로 정규화하거나, 하위경로 판정·디렉토리 치환·타겟 필터링 같은 경로 가공이 필요할 때. 자세히: [pathx.md](./pathx.md)
- **cpx** — 외부 명령을 실행해 stdout/stderr 를 시스템 인코딩으로 디코딩해 받을 때(`spawn`/`spawnSync`), 또는 OS 코드페이지 인코딩 감지가 필요할 때. 자세히: [cpx.md](./cpx.md)
- **FsWatcher / FsWatcherEvent / FsWatcherChangeInfo** — glob 경로를 chokidar 로 감시하며 짧은 시간 내 이벤트를 병합해 콜백 한 번으로 받을 때(watch 빌드 등). 자세히: [fs-watcher.md](./fs-watcher.md)
- **setupConsola / PrettyReporter / createFileReporter / withMaxLevel** — 앱 진입점에서 consola 전역 로거의 콘솔/파일 출력 형식을 환경별로 셋업할 때. 자세히: [consola.md](./consola.md)
- **Worker / createWorker / WorkerProxy / WorkerModule / PromisifyMethods / WorkerRequest / WorkerResponse** — worker_threads 를 타입 안전한 메서드 호출·이벤트·로그 전달 프록시로 쓸 때. 자세히: [worker.md](./worker.md)

> 위 6개 군은 사용 시점·컨텍스트가 분리되어 각각 별도 `.md` 로 분할됨. README 인라인 군 없음.
</content>
