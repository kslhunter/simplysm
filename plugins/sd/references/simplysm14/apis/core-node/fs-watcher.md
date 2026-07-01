# @simplysm/core-node — FsWatcher

`features/fs-watcher.ts`. chokidar 감시를 감싸 대상 glob 재필터링·이벤트 병합·디바운스 콜백·Windows EPERM 자동 재시작을 함께 처리할 때 읽는 군.

## FsWatcherEvent

`type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir"`

- chokidar `all` 이벤트명 중 처리 대상이 되는 5개 literal. 그 외 이벤트명은 무시된다.

## FsWatcherChangeInfo

`interface FsWatcherChangeInfo { event: FsWatcherEvent; path: PosixPath }`

- `event: FsWatcherEvent` — 병합 뒤 남은 이벤트 literal.
- `path: PosixPath` — `posix(filePath)` 로 변환된 변경 경로.

## FsWatcher.watch

`static watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>`

- `paths: string[]` — 감시할 경로/glob 배열. 각 값에서 glob 메타문자(`* ? { [ ]`) 앞까지를 base 디렉토리로 추출해 실제 chokidar 감시 대상으로 쓰고, 이벤트 수신 뒤 원본 패턴 매칭에도 쓴다.
- `options?: chokidar.ChokidarOptions` — chokidar 옵션. 내부 chokidar 생성 시 `persistent: true` 가 기본, `ignoreInitial: true` 가 강제 적용된다(원본 옵션은 별도 보관).
- 반환 `Promise<FsWatcher>` — `ready` 까지 기다린 인스턴스. ready 전 error 가 나면 `close()` 를 시도한 뒤 그 error 를 throw.

## onChange

`onChange(opt: { delay?: number }, cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>): this`

- `opt.delay?: number` — `DebounceQueue` 지연값. 같은 큐에 모인 변경을 한 번의 콜백으로 flush 한다.
- `cb` — 병합된 변경 목록을 받는 콜백. 반환 Promise 는 내부 async 실행에서 await 된다.
- 반환 `this` — 같은 watcher 에 핸들러를 추가 체이닝 등록할 수 있다.
- 초기 콜백 — `watch` 에 넘긴 원본 `options.ignoreInitial` 이 `false` 이면 등록 시 `cb([])` 를 한 번 예약한다(실제 초기 파일 목록은 담지 않음 — 이벤트 병합 충돌 방지).
- 이벤트 필터 — chokidar `all` 이벤트 중 `FsWatcherEvent` literal 에 든 값만 처리.
- 경로 필터 — `minimatch(posixFilePath, posix(p), { dot: true })` 또는 `minimatch(posixFilePath, posix(path.join(p, "**")), { dot: true })` 에 맞는 원본 path 만 통과.
- 병합 규칙 — 같은 파일 기준 `add+change`→`add`, `add+unlink`→제거, `addDir+unlinkDir`→제거, `unlink+add`→`add`, `unlink+change`→`change`, `unlinkDir+addDir`→`addDir`; 그 외 조합은 현재 이벤트로 덮어쓴다.

## close

`close(): Promise<void>`

- 등록된 `DebounceQueue` 를 모두 `dispose()` 하고 배열을 비운 뒤, 내부 chokidar watcher 의 `close()` 를 await 한다.

## 모듈 로드 부작용

- import 시 native `node:fs` 의 `FSWatcher.prototype.emit` 에 guard flag `Symbol.for("@simplysm/core-node/fs-watcher/error-guard")` 가 없으면 한 번만 래핑한다.
- 래핑 동작 — event 가 `"error"` 이고 해당 인스턴스의 error listener 수가 0이면 `false` 를 반환해 orphan error emit 을 삼킨다(Windows 에서 watched 디렉토리 소실 시 EPERM uncaughtException 으로 프로세스가 죽는 것을 방지). 그 외에는 원래 emit 호출.

## EPERM 복구 동작

- chokidar error 는 `sd-fs-watcher` logger 로 출력한다(creation stack 포함).
- 복구 조건 — error 가 `Error` 이고 `code === "EPERM"` 이며 이미 복구 중이 아니면 `_handleEperm()` 실행.
- 재시도 — 최대 3회, 각 시도 사이 1000ms 대기. 매 시도마다 기존 watcher 를 close 하고 새 chokidar watcher 를 만들어 저장된 모든 `all` 핸들러를 다시 붙인 뒤 ready 를 기다린다.
- 실패 종료 — 3회 초과 시 error 로그를 남기고 복구 플래그를 해제한다.
