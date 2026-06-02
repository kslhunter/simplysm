# @simplysm/core-node

Node.js 환경 전용 유틸리티 모음 — 파일시스템·자식 프로세스·경로 조작, 파일 감시, consola 로깅 설정, worker_threads 래퍼.

엔트리는 `cpx`/`fsx`/`pathx` 세 개의 네임스페이스 객체(`export * as`)와 fs-watcher·consola·worker 심볼을 재노출한다. 네임스페이스는 `import { fsx } from "@simplysm/core-node"` 후 `fsx.read(...)` 형태로 호출한다.

## 사용 트리거 인덱스

- **fsx** — 파일/디렉토리 존재 확인·생성·삭제·복사·읽기·쓰기(JSON 포함)·glob 검색·부모 디렉토리 탐색이 필요할 때. 네임스페이스 `import { fsx }`. 자세히: [fsx.md](./fsx.md)
- **cpx** — 자식 프로세스를 spawn 해 stdout/stderr 를 시스템 인코딩으로 디코딩 수집하거나 OS 코드페이지 인코딩을 감지할 때. 네임스페이스 `import { cpx }`. 자세히: [cpx.md](./cpx.md)
- **pathx** — 경로를 POSIX 슬래시로 정규화·resolve, 하위 경로 판정, 디렉토리 치환, 대상 목록 기준 파일 필터링이 필요할 때. 네임스페이스 `import { pathx }`. 자세히: [pathx.md](./pathx.md)
- **FsWatcher** — chokidar 기반으로 파일 변경을 감시하며 짧은 시간 내 이벤트를 병합해 콜백을 한 번만 호출하고 싶을 때. 자세히: [fs-watcher.md](./fs-watcher.md)
- **consola 설정** — 앱/CLI 의 consola 전역 reporter(콘솔 pretty 출력·`.logs` 파일 로테이션)를 환경(dev/prod)에 맞춰 구성할 때. `setupConsola`·`PrettyReporter`·`createFileReporter`·`withMaxLevel`. 자세히: [consola.md](./consola.md)
- **Worker / createWorker** — worker_threads 를 타입 안전한 메서드 프록시 + 이벤트로 래핑해 별도 스레드에서 함수를 실행할 때. 자세히: [worker.md](./worker.md)
