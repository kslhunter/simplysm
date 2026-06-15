# @simplysm/core-node

`@simplysm/core-common` 위에 Node 전용 API(`fs`/`path`/`child_process`/`worker_threads`/`chokidar`/`consola`)를 얹은 기반 계층. 브라우저에서는 사용 불가.

`cpx`/`fsx`/`pathx` 는 `export * as` 네임스페이스로 노출되므로 항상 접두사로 호출한다 (`import { fsx } from "@simplysm/core-node"` → `fsx.read(...)`). 나머지(FsWatcher, consola 셋업, worker)는 named export.

## 사용 트리거 인덱스

- **fsx** — 파일/디렉토리 존재 확인·생성(재귀)·삭제(재시도)·복사(필터)·읽기/쓰기(텍스트·바이너리·JSON)·stat·glob·빈 디렉토리 정리·부모 방향 탐색을 동기/비동기 쌍으로 다룰 때. 실패는 모두 `SdError(원인, 경로)` 로 감싸 throw. 자세히: [fsx.md](./fsx.md)
- **pathx** — 경로를 POSIX(슬래시)로 정규화(`PosixPath` 브랜드)하거나, 하위 경로 판정·디렉토리 치환·확장자 제거 basename·타겟 필터링 같은 경로 문자열 가공이 필요할 때. 자세히: [pathx.md](./pathx.md)
- **cpx** — 외부 명령을 자식 프로세스로 실행해(`spawn`/`spawnSync`) stdout/stderr 를 OS 인코딩(Windows 코드페이지·POSIX LANG)으로 디코딩해 받을 때. exitCode≠0 자동 throw. 자세히: [cpx.md](./cpx.md)
- **FsWatcher / FsWatcherEvent / FsWatcherChangeInfo** — glob 경로를 chokidar 로 감시하며 짧은 시간 내 이벤트를 병합해 콜백 한 번으로 받을 때(watch 빌드 등). Windows EPERM 자동 복구. 자세히: [fs-watcher.md](./fs-watcher.md)
- **setupConsola / PrettyReporter / createFileReporter / FileReporterOptions / SetupConsolaOptions / withMaxLevel** — Node 진입점(서버·CLI)에서 consola 전역 로거의 콘솔/파일 출력 형식을 환경별로 1회 셋업하거나 reporter 를 커스텀할 때. 로깅 코드 자체는 `@simplysm/core-common` 의 `createLogger(tag)` 로 작성하고, 이 군은 진입점 셋업만 담당. 자세히: [consola.md](./consola.md)
- **Worker / createWorker / WorkerProxy / WorkerModule / PromisifyMethods / WorkerRequest / WorkerResponse** — worker_threads 를 타입 안전한 메서드 호출·이벤트·로그 전달 프록시로 쓸 때. 워커 측은 `createWorker`, 메인 측은 `Worker.create`. 자세히: [worker.md](./worker.md)

위 6개 군은 사용 시점·컨텍스트가 분리되고 시그니처 분량이 커 각각 별도 `.md` 로 분할됨. README 인라인 군 없음.
