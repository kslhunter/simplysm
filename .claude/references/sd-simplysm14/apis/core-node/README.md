## @simplysm/core-node

Node.js 전용 유틸·기능 묶음. 파일 IO/glob, 경로 변환, 자식 프로세스 spawn, 파일 시스템 감시, consola 리포터 셋업, worker_threads 타입 안전 래퍼.

## 사용 트리거 인덱스

- **`fsx` 네임스페이스** — 파일/디렉토리 존재 확인·생성·복사·삭제·읽기·쓰기·JSON·glob·재귀 유틸. 자세히: [fsx.md](./fsx.md)
- **`pathx` 네임스페이스** — POSIX 경로 변환, 하위 경로 판정, 디렉토리 치환, target 필터링. 자세히: [pathx.md](./pathx.md)
- **`cpx` 네임스페이스** — 시스템 인코딩 감지 + 자식 프로세스 spawn/spawnSync (인코딩 자동 디코딩, exitCode 기반 reject). 자세히: [cpx.md](./cpx.md)
- **`FsWatcher`** — chokidar 기반 디바운스/이벤트 병합 + Windows EPERM 자동 복구 파일 감시. 자세히: [fs-watcher.md](./fs-watcher.md)
- **consola 셋업** — Node 앱 진입점에서 로깅 환경(콘솔/파일) 구성. 자세히: [consola.md](./consola.md)
  - **`setupConsola`** — 진입점 1회 호출. dev/prod·`SD_DEBUG`·`cli` 조합으로 리포터 자동 구성.
  - **`PrettyReporter`** — 색상·아이콘·tag·stack/cause 정리 포함 콘솔 출력 리포터.
  - **`createFileReporter`** — `<cwd>/.logs/app.<날짜>.log` JSON 회전 + 보존 기간 정리.
  - **`withMaxLevel`** — 기존 리포터에 level 상한 필터 씌우기 (dev 콘솔에서 debug 가리기 등).
- **Worker 래퍼** — worker_threads 위 타입 안전 RPC (메서드 호출 + 이벤트 + 워커 stdout 메인 전달). 자세히: [worker.md](./worker.md)
  - **`Worker.create`** — 메인 측. 워커 파일을 띄우고 메서드 직접 호출 가능한 Proxy 반환.
  - **`createWorker`** — 워커 측. `methods` 등록 + `send(event, data)` 로 이벤트 발행. `export default` 필수.
  - **`WorkerProxy<TModule>`** — `Worker.create` 반환 타입. 워커 모듈 타입 추론에 사용.
  - **`WorkerModule`** — 워커 default export 의 구조 인터페이스 (`__methods`/`__events`). 직접 구현 불필요.
  - **`PromisifyMethods<T>`** — 메서드 반환을 `Promise<Awaited<R>>` 로 감싸는 매핑 타입. `WorkerProxy` 내부 사용.
