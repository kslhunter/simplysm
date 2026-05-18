## @simplysm/core-node

Node.js 전용 유틸·기능 묶음. 파일 IO/glob, 경로 변환, 자식 프로세스 spawn, 파일 시스템 감시, consola 리포터 셋업, worker_threads 타입 안전 래퍼.

## 사용 트리거 인덱스

- **`fsx` 네임스페이스** — 파일/디렉토리 존재 확인·생성·복사·삭제·읽기·쓰기·JSON·glob·재귀 유틸. 자세히: [fsx.md](./fsx.md)
- **`pathx` 네임스페이스** — POSIX 경로 변환, 하위 경로 판정, 디렉토리 치환, target 필터링. 자세히: [pathx.md](./pathx.md)
- **`cpx` 네임스페이스** — 시스템 인코딩 감지 + 자식 프로세스 spawn/spawnSync (인코딩 자동 디코딩, exitCode 기반 reject). 자세히: [cpx.md](./cpx.md)
- **`FsWatcher`** — chokidar 기반 디바운스/이벤트 병합 + Windows EPERM 자동 복구 파일 감시. 자세히: [fs-watcher.md](./fs-watcher.md)
- **`setupConsola` / `PrettyReporter` / `createFileReporter` / `withMaxLevel`** — Node 앱 consola 셋업, 컬러 콘솔/JSON 파일 회전 리포터. 자세히: [consola.md](./consola.md)
- **`Worker` / `createWorker` / `WorkerProxy` / `WorkerModule` / `PromisifyMethods`** — worker_threads 위 타입 안전 RPC 래퍼 (메서드 호출 + 이벤트 send/on). 자세히: [worker.md](./worker.md)
