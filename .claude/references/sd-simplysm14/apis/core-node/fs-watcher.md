# @simplysm/core-node — FsWatcher

chokidar 기반 파일 감시 래퍼. 짧은 시간 내 다발한 이벤트를 디바운스+병합해 콜백을 한 번만 호출하고, Windows EPERM 발생 시 watcher 를 자동 재시작한다. glob 패턴 watch 를 지원한다.

## API

- `FsWatcher.watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>` — 정적 팩토리. ready 까지 대기 후 인스턴스 반환. ready 전 에러가 나면 close 하고 throw. `paths` 는 glob 패턴 허용(메타문자 이전 base 디렉토리를 추출해 chokidar 에 등록하고, 실제 매칭은 minimatch 로 수행).
  - `options` — chokidar `ChokidarOptions`. 내부에서 `ignoreInitial` 은 항상 `true` 로 강제(초기 스캔 이벤트 무시).
  - `options.ignoreInitial: false` — 호출자가 명시하면 onChange 콜백이 **빈 배열로 1회 선호출**됨(실제 초기 파일 목록은 전달하지 않음 — 이벤트 병합 충돌 방지). 초기 1회 전체 빌드 트리거 용도.
- `onChange(opt: { delay?: number }, cb): this` — 변경 콜백 등록(체이닝 가능).
  - `opt.delay?: number` — 디바운스 ms. 마지막 이벤트 후 이 시간만큼 잠잠하면 누적 변경을 한 번에 전달.
  - `cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>` — 병합된 변경 목록으로 호출.
- `close(): Promise<void>` — 디바운스 큐를 dispose 한 뒤 chokidar 종료.

## 타입

- `FsWatcherChangeInfo` — `{ event: FsWatcherEvent; path: PosixPath }`. path 는 POSIX 슬래시.
- `FsWatcherEvent` — `"add" | "addDir" | "change" | "unlink" | "unlinkDir"`. 파일/디렉토리의 생성("add"/"addDir")·변경("change")·삭제("unlink"/"unlinkDir") 구분.

## 이벤트 병합 규칙

같은 경로의 연속 이벤트는 디바운스 윈도 안에서 병합된다: `add+change`→`add`, `add+unlink`→제거(상쇄), `addDir+unlinkDir`→제거, `unlink+add`→`add`, `unlink+change`→`change`, `unlinkDir+addDir`→`addDir`. 그 외 조합은 최신 이벤트로 덮어씀. 생성 직후 삭제 등 상쇄된 변경은 콜백에 나타나지 않음.

## 사용 예

```ts
const watcher = await FsWatcher.watch(["src/**/*.ts"], { ignoreInitial: false });
watcher.onChange({ delay: 300 }, async (changes) => {
  for (const { event, path } of changes) console.log(`${event}: ${path}`);
});
await watcher.close();
```

## 주의사항

- `ignoreInitial` 을 다른 값으로 줘도 chokidar 에는 `true` 로 강제됨 — 초기 목록이 필요하면 `false` 로 빈 배열 선호출 신호를 받아 호출자가 직접 스캔.
- EPERM 자동 재시작은 최대 3회(1초 간격). 초과 시 error 로그 후 중단하므로 이후 변경이 감지되지 않을 수 있음.
- 모듈 로드 시 native `fs.FSWatcher.prototype.emit` 에 가드를 설치해, listener 없는 orphan `error` 이벤트로 인한 프로세스 종료를 방지함(부수효과 — import 만으로 1회 적용).
