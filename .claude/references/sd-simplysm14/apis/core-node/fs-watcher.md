# @simplysm/core-node — FsWatcher

chokidar 기반 파일 감시 래퍼. watch 빌드처럼 "여러 변경을 모아 한 번에 처리"해야 할 때 사용. 짧은 시간 내 이벤트를 디바운스+병합해 콜백을 한 번만 호출하고, Windows 의 EPERM(감시 디렉토리 소실) 발생 시 watcher 를 자동 재시작한다. 모듈 로드 시 native FSWatcher prototype 의 orphan `error` emit 를 swallow 하는 가드를 1회 설치(프로세스 종료 방지).

## FsWatcher.watch (정적 진입점)

- `static watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>` — 감시 시작. ready 될 때까지 대기 후 인스턴스 반환. ready 전 에러 시 watcher 를 close 하고 throw.
  - `paths: string[]` — 감시할 경로/glob 패턴 배열. 내부적으로 각 패턴의 glob 메타문자 이전 base 디렉토리를 추출해 chokidar 에 등록하고, 콜백 단계에서 원본 패턴으로 minimatch 재필터.
  - `options?: ChokidarOptions` — chokidar 옵션. `persistent` 기본 true. `ignoreInitial` 은 내부적으로 항상 true 로 강제(초기 스캔 이벤트 무시).
  - `options.ignoreInitial: false` 지정 시 → `onChange` 의 첫 콜백이 **빈 배열 `[]`** 로 1회 호출됨(실제 초기 파일 목록은 담기지 않음 — 이벤트 병합과의 충돌 방지). "초기 1회 전체 빌드 후 변경 감시" 패턴 트리거용.

```ts
const watcher = await FsWatcher.watch(["src/**/*.ts"]);
```

## onChange

- `onChange(opt, cb): this` — 디바운스된 변경 콜백 등록. 체이닝 가능(this 반환). 여러 번 호출해 핸들러 다중 등록 가능.
  - `opt.delay?: number` — 디바운스 지연(ms). 이 시간 내 들어온 이벤트를 모아 한 번 호출(`DebounceQueue` 사용).
  - `cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>` — 병합된 변경 목록 콜백. async 가능.
  - 이벤트 병합: 같은 파일에 대해 `add+change→add`, `add+unlink→삭제(상쇄)`, `addDir+unlinkDir→상쇄`, `unlink+add→add`, `unlink+change→change`, `unlinkDir+addDir→addDir`. 그 외 조합은 최신 이벤트로 덮어씀. → 생성 직후 삭제된 임시파일 등은 콜백에 안 나타남.

```ts
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) console.log(`${event}: ${path}`);
});
```

## close

- `close(): Promise<void>` — 디바운스 큐 dispose 후 chokidar watcher 종료. 감시 해제 시 반드시 호출.

## FsWatcherChangeInfo / FsWatcherEvent

- `interface FsWatcherChangeInfo { event: FsWatcherEvent; path: PosixPath }` — 변경 1건. `path` 는 슬래시 정규화된 PosixPath.
- `type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir"` — 변경 종류.
  - `add` — 파일 생성. `addDir` — 디렉토리 생성. `change` — 파일 내용 변경. `unlink` — 파일 삭제. `unlinkDir` — 디렉토리 삭제.

## EPERM 자동 복구 동작

EPERM 감지 시 최대 3회(1000ms 간격) watcher 재생성을 시도하며 기존 핸들러를 다시 부착한다. 성공 시 `success` 로그, 한도 초과 시 `error` 로그 후 중단. 로거 태그는 `sd-fs-watcher`(consola). 재시도는 자동 복구이므로 호출측에서 별도 처리 불필요.
