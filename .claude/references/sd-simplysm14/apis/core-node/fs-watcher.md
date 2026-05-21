## @simplysm/core-node — FsWatcher

Chokidar 기반 디렉토리/글로브 변경 감시. 짧은 시간 내 이벤트를 병합하여 콜백 1회로 묶고, Windows EPERM 시 자동 재시작.

### 타입

- `FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir"` — chokidar 원본 이벤트 그대로. 디렉토리/파일 add·unlink 구분.
- `FsWatcherChangeInfo = { event: FsWatcherEvent; path: PosixPath }` — 콜백 인자 1건. `path` 는 POSIX 슬래시 정규화.

### 생성

```ts
FsWatcher.watch(paths: string[], options?: ChokidarOptions): Promise<FsWatcher>
```

- `paths`: 감시 대상. 디렉토리 절대 경로 또는 glob 패턴 혼용 가능. glob 메타문자 이전까지를 실제 감시 base 로 추출 후 chokidar 에 전달.
- `options`: chokidar `ChokidarOptions`. `ignoreInitial` 은 내부적으로 항상 `true` 로 override 되지만, 사용자가 `false` 로 명시한 경우 첫 `onChange` 콜백을 **빈 배열**로 1회 호출(초기 트리거 신호용, 실제 초기 목록은 X).
- `ready` 대기 후 resolve. 초기화 에러 시 close 후 reject.

### 메서드

- `onChange(opt: { delay?: number }, cb: (changes: FsWatcherChangeInfo[]) => void | Promise<void>): this`
  - `opt.delay`: 디바운스 ms. 마지막 이벤트로부터 이 시간 후 콜백 1회.
  - 같은 파일에 대한 연속 이벤트 자동 병합: `add+change=add`, `add+unlink`=상쇄(제외), `addDir+unlinkDir`=상쇄, `unlink+add=add`, `unlink+change=change`, `unlinkDir+addDir=addDir`. 룩업 미스는 현재 이벤트로 덮어쓰기.
  - 콜백은 감시 base 가 아닌 **`paths` 원본 glob 에 매칭되는 경로만** 통과 (minimatch, dot 포함).
  - 다중 호출 가능. 각 호출마다 독립 debounce 큐 + handler 등록.
- `close(): Promise<void>` — debounce 큐 dispose + chokidar close.

### 자동 복구

- 감시 디렉토리 소실로 EPERM 발생 시 최대 3회 / 1초 간격으로 watcher 재생성·핸들러 재등록. 성공 시 retry count 리셋, 초과 시 중단(error 로그).
- native `fs.FSWatcher.prototype.emit` 를 모듈 로드 시 1회 패치: listener 0 + `error` 이벤트는 swallow (orphan error 로 인한 프로세스 종료 방지).

### 예

```ts
const w = await FsWatcher.watch(["src/**/*.ts"]);
w.onChange({ delay: 300 }, async (changes) => {
  for (const { path, event } of changes) console.log(event, path);
});
// await w.close();
```
