## @simplysm/core-node — FsWatcher

chokidar 래퍼. 짧은 시간 내 이벤트를 병합해서 콜백 1회만 호출하고, Windows 의 EPERM (감시 디렉토리 사라짐 등) 발생 시 watcher 자동 재시작. 모듈 로드 시 `fs.FSWatcher.prototype.emit` 을 한 번 패치해서, listener 없는 인스턴스의 orphan `error` 이벤트로 인한 uncaughtException 도 swallow.

### 시그니처

```ts
type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";

interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: PosixPath;          // 항상 슬래시 경로
}

class FsWatcher {
  static watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>;

  onChange(
    opt: { delay?: number },
    cb: (changes: FsWatcherChangeInfo[]) => void | Promise<void>,
  ): this;

  close(): Promise<void>;
}
```

### 동작 디테일

- `paths` 의 각 원소에서 glob 메타문자(`* ? { [ ]`) 이전 부분을 `chokidar.watch` 대상 디렉토리로 추출하고, 실제 변경 알림은 원래 패턴에 대해 `minimatch(path, p, { dot: true })` 또는 `minimatch(path, p + "/**")` 매칭만 통과.
- 항상 `ignoreInitial: true` 로 chokidar 호출. 사용자가 `options.ignoreInitial: false` 를 주면 첫 콜백을 빈 배열로 1회 호출 (실제 파일 목록은 포함하지 않음 — 이벤트 병합 모델과의 충돌 방지).
- `onChange` 의 `delay` 로 `DebounceQueue` 생성. 윈도우 내 같은 파일의 이벤트는 lookup 테이블로 병합:
  - `add+change` → `add`
  - `add+unlink` → 제거 (생성 직후 삭제 상쇄)
  - `addDir+unlinkDir` → 제거
  - `unlink+add` → `add`
  - `unlink+change` → `change`
  - `unlinkDir+addDir` → `addDir`
  - 미정의 조합은 뒤 이벤트로 덮어쓰기.
- `error` 의 code 가 `EPERM` 이면 watcher 종료 → 1초 대기 → 재생성 → 등록된 모든 핸들러 재부착 → ready 대기. 최대 3회 시도 후 포기 (에러 로그만).

### 사용 예

```ts
const watcher = await FsWatcher.watch(["src/**/*.ts", "tests/**/*.ts"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { event, path } of changes) {
    consola.info(`${event}: ${path}`);
  }
});

// 종료
await watcher.close();
```
