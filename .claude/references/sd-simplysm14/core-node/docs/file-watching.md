# File Watching (FsWatcher)

## `FsWatcher`

Chokidar 기반 파일 시스템 감시 래퍼.

짧은 시간 내에 발생하는 이벤트를 병합하여 콜백을 한 번만 호출한다.
EPERM 에러 발생 시 최대 3회까지 watcher를 자동 재시작한다.

```typescript
export class FsWatcher {
  static async watch(paths: string[], options?: ChokidarOptions): Promise<FsWatcher>
  onChange(opt: { delay?: number }, cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>): this
  async close(): Promise<void>
}
```

### Static Methods

#### `watch`

파일 또는 디렉토리의 변경을 감시하는 FsWatcher 인스턴스를 생성한다.

```typescript
static async watch(
  paths: string[],
  options?: chokidar.ChokidarOptions,
): Promise<FsWatcher>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `paths` | string[] | 감시할 파일/디렉토리 경로 또는 glob 패턴 배열 |
| `options` | ChokidarOptions (optional) | Chokidar 옵션. `ignoreInitial: false`를 지정해도 첫 번째 onChange 호출 시 빈 배열이 콜백된다. 이는 이벤트 병합 로직과의 충돌을 방지하기 위한 의도적인 동작이다. |

**Return**: FsWatcher 인스턴스

**Example**:
```typescript
const watcher = await FsWatcher.watch(["src/**/*.ts", "tests/**/*.ts"]);
```

### Instance Methods

#### `onChange`

파일 변경 이벤트를 감시한다.

```typescript
onChange(
  opt: { delay?: number },
  cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>,
): this
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt` | { delay?: number } | 이벤트 병합 설정. delay: 연속 이벤트를 병합하는 시간(ms). 생략 가능. |
| `cb` | function | 변경 이벤트 핸들러. 파일 변경 정보 배열이 전달된다. |

**Note**: delay 시간 내 발생한 여러 이벤트는 하나로 병합되어 한 번의 콜백만 호출된다.

**Example**:
```typescript
watcher.onChange({ delay: 300 }, (changeInfos) => {
  for (const { event, path } of changeInfos) {
    console.log(`${event}: ${path}`);
  }
});
```

#### `close`

파일 감시를 종료한다.

```typescript
async close(): Promise<void>
```

**Example**:
```typescript
await watcher.close();
```

---

## `FsWatcherEvent`

파일 변경 이벤트 타입.

```typescript
export type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir"
```

| Event | Description |
|-------|-------------|
| `"add"` | 새 파일이 추가됨 |
| `"addDir"` | 새 디렉토리가 추가됨 |
| `"change"` | 파일 내용이 변경됨 |
| `"unlink"` | 파일이 삭제됨 |
| `"unlinkDir"` | 디렉토리가 삭제됨 |

---

## `FsWatcherChangeInfo`

파일 변경 정보.

```typescript
export interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: PosixPath;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `event` | FsWatcherEvent | 변경 이벤트 타입 |
| `path` | PosixPath | 변경된 파일/디렉토리 경로 (정규화됨, POSIX 슬래시) |

---

## Event Merging

연속적으로 발생하는 파일 변경 이벤트는 자동으로 병합된다.

예를 들어, 파일을 생성하면 "add" 이벤트가 먼저 발생하고 그 직후 "change" 이벤트가 발생할 수 있지만, 지정된 delay 시간 내에 발생하면 다음과 같이 병합된다:

- `add` + `change` → `add` (마지막 change는 생략)
- `add` + `unlink` → `unlink` (파일이 최종적으로 삭제됨)
- `change` + `change` → `change` (중복 제거)

---

## Auto Recovery

EPERM(권한 거부) 에러가 발생하면 최대 3회까지 watcher를 자동으로 재시작한다.

각 재시도 간격은 1000ms이다.
