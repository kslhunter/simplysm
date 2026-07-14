# @simplysm/core-node

Node 런타임에서 파일시스템·경로·자식 프로세스·파일 감시·consola reporter·worker_threads 프록시를 다룰 때 쓰는 기반 API. 거의 모든 파일시스템/프로세스 함수는 동기/비동기 짝으로 제공되고, fs 계열 오류는 경로를 담은 `SdError`로 다시 throw함.

## 사용 트리거 인덱스

- **cpx** — 외부 명령을 실행해 stdout/stderr 문자열과 exitCode로 받고, 스코어 콘솔 인코딩을 감지·디코딩할 때. 자세히: [cpx.md](./cpx.md)
- **fsx** — 파일/디렉토리 존재 확인·생성·삭제·복사·읽기/쓰기·JSON·stat·glob·부모 방향 탐색을 처리할 때. 자세히: [fsx.md](./fsx.md)
- **pathx** — 경로를 POSIX 슬래시로 정규화하거나 하위 경로 판정·디렉토리 치환·basename 추출·target 필터링을 할 때.
- **FsWatcher** — chokidar 기반 파일시스템 감시, 이벤트 병합, EPERM 자동 복구를 다룰 때. 자세히: [fs-watcher.md](./fs-watcher.md)
- **consola 설정/리포터** — Node 진입점에서 consola reporter를 환경별로 설정하거나 Pretty/File reporter를 직접 구성할 때. 사용법: [logging.md](../../manuals/logging.md), 자세히: [consola.md](./consola.md)
- **Worker / createWorker** — worker_threads를 타입 안전한 메서드 프록시·이벤트·stdout 전달 프로토콜로 감쌀 때. 자세히: [worker.md](./worker.md)

## pathx

POSIX 스타일 경로 정규화와 경로 관계 판정. 모든 함수는 경로를 `path.resolve()`로 정규화한 뒤 백슬래시를 슬래시로 변환해 처리함.

### 타입: PosixPath

- `PosixPath` — 문자열 브랜드 타입. POSIX 슬래시만 포함하는 절대 경로를 나타냄. `posix()` 또는 `posixResolve()`를 통해서만 생성 가능.

### 함수

- `posix(p: string): PosixPath` — 경로를 POSIX 슬래시로 변환 (백슬래시 → 슬래시). 절대·상대 경로를 구분하지 않음.
- `posixResolve(...args: string[]): PosixPath` — 절대 경로로 resolve한 뒤 POSIX 스타일로 변환.
- `changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string` — 파일 경로의 상위 디렉토리를 변경. `filePath`가 `fromDirectory` 내부에 없으면 `ArgumentError` throw.
- `basenameWithoutExt(filePath: string): string` — 파일명에서 확장자 제외 (예: `/path/file.ts` → `file`).
- `isChildPath(childPath: string, parentPath: string): boolean` — `childPath`가 `parentPath`의 하위 경로인지 판정. 동일 경로이면 false. 경로 비교는 정규화 뒤 POSIX 슬래시 기준.
- `filterByTargets(files: string[], targets: string[], cwd: string): string[]` — 파일 목록을 대상 경로 리스트로 필터링. `targets`가 비어있으면 `files` 그대로 반환. 각 파일은 `cwd` 기준 상대경로로 변환해 `targets` 항목과 매칭 (정확히 일치하거나 하위 경로만 포함).
