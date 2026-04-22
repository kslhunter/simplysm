# FsWatcher

Chokidar 기반 파일 시스템 감시 래퍼. 짧은 시간 내에 발생하는 이벤트를 병합하여 콜백을 한 번만 호출한다.
EPERM 에러 발생 시 최대 3회까지 watcher를 자동 재시작한다.

```typescript
export class FsWatcher {
  static async watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>
  onChange(opt: { delay?: number }, cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>): this
  async close(): Promise<void>
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `watch` | static method | `(paths: string[], options?: ChokidarOptions) => Promise<FsWatcher>` | 파일 감시 시작. `ready` 이벤트까지 대기 후 반환 |
| `onChange` | method | `(opt: { delay?: number }, cb: ...) => this` | 파일 변경 이벤트 핸들러 등록 |
| `close` | method | `() => Promise<void>` | 파일 감시자 종료 |

## `ignoreInitial` 주의

chokidar의 `ignoreInitial` 옵션은 내부적으로 항상 `true`로 설정된다.
`options.ignoreInitial: false`를 전달하면 첫 번째 `onChange` 호출 시 빈 배열로 콜백이 호출되지만, 실제 초기 파일 목록은 포함되지 않는다. 이는 이벤트 병합 로직과의 충돌을 방지하기 위한 의도적인 동작이다.

## Related Types

### `FsWatcherEvent`

```typescript
export type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";
```

지원되는 파일 변경 이벤트 타입.

### `FsWatcherChangeInfo`

```typescript
export interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: PosixPath;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `event` | `FsWatcherEvent` | 변경 이벤트 타입 |
| `path` | [`PosixPath`](../utils/pathx.md#posixpath) | 변경된 파일/디렉토리 경로 (정규화됨) |

## 이벤트 병합 전략

같은 파일에 대해 `delay` 시간 내에 여러 이벤트가 발생하면 최종 상태만 전달된다:

| 이전 이벤트 | 신규 이벤트 | 결과 |
|------------|------------|------|
| `add` | `change` | `add` (생성 직후 수정 → 생성) |
| `add` | `unlink` | 제거 (생성 직후 삭제 → 변경 없음) |
| `addDir` | `unlinkDir` | 제거 (생성 직후 삭제 → 변경 없음) |
| `unlink` | `add` | `add` (삭제 후 재생성 → 생성) |
| `unlink` | `change` | `change` |
| `unlinkDir` | `addDir` | `addDir` (디렉토리 재생성) |
| 그 외 | — | 최신 이벤트로 덮어쓰기 |

## Glob 패턴 처리

glob 패턴이 포함된 경로(`*`, `?`, `{`, `[`, `]`)는 glob base 디렉토리를 감시하고, Minimatch로 이벤트를 필터링한다.

## Usage

```typescript
import { FsWatcher } from "@simplysm/core-node";

const watcher = await FsWatcher.watch(["src/**/*.ts"]);

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { event, path } of changes) {
    // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
    // path: PosixPath
  }
});

// 종료
await watcher.close();
```
