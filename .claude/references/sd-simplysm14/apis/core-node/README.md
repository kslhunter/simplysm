## @simplysm/core-node

Node.js 환경 전용 파일시스템·자식 프로세스·경로·파일감시·로깅·Worker 유틸 묶음.

## 사용 트리거 인덱스

- **`fsx`** — 파일/디렉토리 존재확인·생성·복사·삭제·읽기/쓰기(텍스트/바이너리/JSON)·glob·부모 디렉토리 탐색이 필요할 때. 자세히: [fsx.md](./fsx.md)
- **`pathx`** — POSIX 슬래시 경로 변환, 부모-자식 경로 판정, cwd 기준 타겟 필터링이 필요할 때. 자세히: [pathx.md](./pathx.md)
- **`cpx`** — 자식 프로세스 spawn(비동기/동기), 시스템 인코딩 자동 디코딩, 실패 시 reject 옵션. 자세히: [cpx.md](./cpx.md)
- **`FsWatcher`** — 디렉토리/glob 변경 감시 + 디바운싱 + 이벤트 병합 + EPERM 자동 재시작. 자세히: [fs-watcher.md](./fs-watcher.md)
- **`setupConsola` / `PrettyReporter` / `createFileReporter`** — CLI/서버 로깅 일괄 설정, 컬러 콘솔 + JSONL 파일 회전. 자세히: [consola.md](./consola.md)
- **`Worker` / `createWorker`** — 타입 안전 worker_threads 래퍼. 메인에서 `Worker.create()`, 워커에서 `createWorker()`. 자세히: [worker.md](./worker.md)
