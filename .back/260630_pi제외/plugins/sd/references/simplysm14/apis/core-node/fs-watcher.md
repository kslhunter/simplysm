# @simplysm/core-node — FsWatcher

chokidar 감시를 감싸 대상 glob 재필터링, 이벤트 병합, 디바운스 콜백, Windows EPERM 재시작을 함께 처리할 때 읽는 군.

## FsWatcherEvent

`type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir"`

- `"add"` — chokidar `all` 이벤트명이 `add` 일 때 통과되는 이벤트 literal.
- `"addDir"` — chokidar `all` 이벤트명이 `addDir` 일 때 통과되는 이벤트 literal.
- `"change"` — chokidar `all` 이벤트명이 `change` 일 때 통과되는 이벤트 literal.
- `"unlink"` — chokidar `all` 이벤트명이 `unlink` 일 때 통과되는 이벤트 literal.
- `"unlinkDir"` — chokidar `all` 이벤트명이 `unlinkDir` 일 때 통과되는 이벤트 literal.

## FsWatcherChangeInfo

`interface FsWatcherChangeInfo { event: FsWatcherEvent; path: PosixPath }`

- `event: FsWatcherEvent` — 병합 뒤 남은 이벤트 literal.
- `path: PosixPath` — `posix(filePath)` 로 변환된 변경 경로.

## FsWatcher.watch

`static watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>`

- `paths: string[]` — 감시할 경로 또는 glob 배열. 각 값은 glob 메타문자(`* ? { [ ]`) 전까지의 base 디렉토리 추출에 쓰이고, 이벤트 수신 뒤 원본 패턴 매칭에도 쓰인다.
- `options?: chokidar.ChokidarOptions` — chokidar 옵션. `_options` 에 원본이 보관되며, 실제 chokidar 생성 시 `persistent: true` 와 `ignoreInitial: true` 가 적용된다.
- 반환 `Promise<FsWatcher>` — ready 이벤트까지 기다린 인스턴스. ready 전 error 가 나면 `close()` 를 시도한 뒤 해당 error 를 throw.

## onChange

`onChange(opt: { delay?: number }, cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>): this`

- `opt.delay?: number` — `DebounceQueue` 에 전달할 지연값. 같은 큐에 모인 변경을 한 번의 콜백으로 flush 한다.
- `cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>` — 병합된 변경 목록을 받는 콜백. 반환 Promise 는 내부 async 실행에서 await 된다.
- 반환 `this` — 같은 watcher 에 추가 핸들러를 체이닝 등록할 수 있다.
- 초기 콜백 — `FsWatcher.watch` 에 전달한 원본 `options.ignoreInitial` 이 `false` 이면, `onChange` 등록 시 `cb([])` 를 한 번 예약한다. 실제 초기 파일 목록은 담지 않는다.
- 이벤트 필터 — chokidar `all` 이벤트 중 `FsWatcherEvent` literal 에 포함된 값만 처리한다.
- 경로 필터 — `minimatch(posixFilePath, posix(p), { dot: true })` 또는 `minimatch(posixFilePath, posix(path.join(p, "**")), { dot: true })` 에 맞는 원본 path 만 통과한다.
- 병합 규칙 — 같은 파일 기준 `add+change` 는 `add`, `add+unlink` 는 제거, `addDir+unlinkDir` 는 제거, `unlink+add` 는 `add`, `unlink+change` 는 `change`, `unlinkDir+addDir` 는 `addDir`; 그 외 조합은 현재 이벤트로 덮어쓴다.

## close

`close(): Promise<void>`

- 동작 — 등록된 `DebounceQueue` 를 모두 `dispose()` 하고 배열을 비운 뒤, 내부 chokidar watcher 의 `close()` 를 await 한다.

## 모듈 로드 부작용

- native `node:fs` 의 `FSWatcher.prototype.emit` 에 guard flag `Symbol.for("@simplysm/core-node/fs-watcher/error-guard")` 가 없으면 한 번만 래핑한다.
- 래핑 동작 — event 가 `"error"` 이고 해당 인스턴스의 error listener 수가 0이면 `false` 를 반환해 orphan error emit 을 삼킨다. 그 외에는 원래 emit 을 호출한다.

## EPERM 복구 동작

- error listener — chokidar error 를 `sd-fs-watcher` logger 로 출력한다.
- 복구 조건 — error 가 `Error` 이고 `code === "EPERM"` 이며 이미 복구 중이 아니면 `_handleEperm()` 을 실행한다.
- 재시도 값 — 최대 3회, 각 시도 사이 1000ms 대기.
- 재시작 동작 — 기존 watcher 를 close 하고 새 chokidar watcher 를 만들며, `_allHandlers` 에 저장된 모든 `all` 핸들러를 다시 붙인 뒤 ready 를 기다린다.
- 실패 종료 — 3회를 초과하면 error 로그를 남기고 `_isRecovering` 을 false 로 되돌린다.
