# @simplysm/core-node — FsWatcher

chokidar 기반 파일시스템 감시. 감시 대상 glob 재필터링, 짧은 시간의 다중 변경 병합, 디바운스 콜백, Windows EPERM 자동 복구를 함께 처리함.

## 타입

### FsWatcherEvent

`"add" | "addDir" | "change" | "unlink" | "unlinkDir"` — chokidar `all` 이벤트 중 처리 대상 5가지. 그 외 이벤트는 무시됨.

### FsWatcherChangeInfo

- `event: FsWatcherEvent` — 병합 후 남은 이벤트 종류.
- `path: PosixPath` — POSIX 슬래시로 변환된 파일 경로.

## 클래스

### FsWatcher.watch (정적 팩토리)

`static watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>`

- `paths: string[]` — 감시할 경로/glob 패턴 배열.
  - 각 패턴에서 glob 메타문자(`* ? { [ ]`) 이전까지를 base 디렉토리로 추출.
  - base들을 실제 chokidar 감시 대상으로 사용.
  - 이벤트 수신 후 원본 패턴과 매칭 (minimatch 사용).
  - Windows 8.3 단축경로는 자동으로 롱패스로 확장해 감시, 콜백에는 원본 형태 유지.
- `options?: chokidar.ChokidarOptions` — chokidar 옵션.
  - 내부 적용: `persistent: true`, `ignoreInitial: true` (강제).
  - 원본 options는 별도 보관해 watcher 재시작 시 재사용.
- 반환: Promise `<FsWatcher>` — `ready` 이벤트까지 대기 후 인스턴스 반환. ready 전 error 발생 시 `close()` 후 오류 throw.

### onChange

`onChange(opt: { delay?: number }, cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>): this`

- `opt.delay?: number` — DebounceQueue 디바운스 지연(ms). 지연 중 같은 파일의 다중 이벤트를 병합.
- `cb: (changeInfos: FsWatcherChangeInfo[]) => ...` — 병합된 변경 목록 받는 콜백. async 함수 반환값은 내부에서 await됨.
- 반환: `this` — 체이닝으로 여러 핸들러 등록 가능.
- 초기 콜백: 원본 `options.ignoreInitial === false`이면 콜백 등록 시 `cb([])` 한 번 예약. 실제 초기 파일 목록은 담지 않음(이벤트 병합 충돌 방지).
- 이벤트 필터: chokidar `all` 이벤트 중 `FsWatcherEvent` literal에 속한 것만 처리.
- 경로 필터: 변경된 파일 경로를 원본 patterns와 minimatch로 재매칭. 포함된 path만 통과.
- 이벤트 병합: 같은 파일 기준으로 연속 이벤트 병합 규칙 적용:
  - `add + change` → `add` (생성 직후 수정 = 단순 생성)
  - `add + unlink` → 제거 (생성 직후 삭제 = 상쇄)
  - `addDir + unlinkDir` → 제거 (디렉토리 생성 직후 삭제 = 상쇄)
  - `unlink + add` → `add` (삭제 직후 재생성 = 생성)
  - `unlink + change` → `change` (삭제 후 파일 변경)
  - `unlinkDir + addDir` → `addDir` (디렉토리 삭제 직후 재생성)
  - 그 외 조합은 현재 이벤트로 덮어쓰기.

### close

`close(): Promise<void>`

- 등록된 모든 DebounceQueue를 `dispose()` 후 배열 비우기.
- 내부 chokidar watcher의 `close()` 호출 및 await.

## 모듈 로드 부작용

import 시 Node native `fs.FSWatcher.prototype.emit`을 보호 flag로 래핑하는 **일회 작업** 수행.

- 래핑 목적: Windows에서 감시 디렉토리가 사라질 때 native FSWatcher가 EPERM을 emit하는데, listener가 없는 상태면 uncaughtException이 되어 프로세스 종료됨. 이를 방지.
- 래핑 동작: `event === "error"` 이고 인스턴스의 error listener 수 = 0이면 `false` 반환해 orphan error 삼킴. 그 외는 원래 emit 호출.

## EPERM 자동 복구

- 감지: chokidar error 이벤트 + `code === "EPERM"` + 이미 복구 중이 아님.
- 로깅: `sd-fs-watcher` logger로 오류·재시도 상황 출력(creation stack 포함).
- 재시도 조건: 최대 3회, 시도 간 1000ms 대기.
- 복구 절차 (매 시도마다):
  1. 기존 watcher close
  2. 새 chokidar watcher 생성
  3. 저장된 모든 `all` 이벤트 핸들러 재부착
  4. ready 이벤트 대기
- 성공: retryCount 초기화, 복구 플래그 해제, success 로그.
- 최대 재시도 초과: error 로그 후 복구 플래그 해제(watcher는 계속 실행 중이되 error 처리 불가 상태).
