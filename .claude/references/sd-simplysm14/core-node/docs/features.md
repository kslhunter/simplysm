# Features

파일 시스템 감시와 consola 로깅 설정 기능을 제공한다.

---

## `FsWatcherEvent`

지원되는 파일 변경 이벤트 타입.

```typescript
export type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";
```

| Value | Description |
|-------|-------------|
| `"add"` | 파일 추가 |
| `"addDir"` | 디렉토리 추가 |
| `"change"` | 파일 수정 |
| `"unlink"` | 파일 삭제 |
| `"unlinkDir"` | 디렉토리 삭제 |

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
| `event` | `FsWatcherEvent` | 변경 이벤트 타입 |
| `path` | `PosixPath` | 변경된 파일/디렉토리 경로 (정규화됨) |

---

## `FsWatcher`

Chokidar 기반 파일 시스템 감시 래퍼. 짧은 시간 내에 발생하는 이벤트를 병합하여 콜백을 한 번만 호출한다. EPERM 에러 발생 시 최대 3회 watcher를 자동 재시작한다.

**주의**: chokidar의 `ignoreInitial` 옵션은 내부적으로 항상 `true`로 설정된다.

```typescript
export class FsWatcher {
  static async watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>;
  onChange(opt: { delay?: number }, cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>): this;
  async close(): Promise<void>;
}
```

### `FsWatcher.watch` (static)

파일 감시를 시작한다 (비동기). ready 이벤트가 발생할 때까지 대기한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `paths` | `string[]` | 감시할 파일/디렉토리 경로 또는 glob 패턴 배열 |
| `options` | `chokidar.ChokidarOptions` | chokidar 옵션 |

### `onChange`

파일 변경 이벤트 핸들러를 등록한다. 지정된 지연 시간 동안 이벤트를 수집하여 콜백을 한 번 호출한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.delay` | `number` | 이벤트 병합 대기 시간 (ms) |
| `cb` | `(changeInfos: FsWatcherChangeInfo[]) => void \| Promise<void>` | 변경 이벤트 콜백 |

**반환**: `this` (메서드 체이닝 가능)

이벤트 병합 전략:
- `add` + `change` → `add` (생성 직후 수정은 생성으로 간주)
- `add` + `unlink` → 변경 없음 (생성 직후 삭제는 변경 없음으로 간주)
- `unlink` + `add` → `add` (삭제 후 재생성은 생성으로 간주)

### `close`

파일 감시자를 종료한다.

```typescript
import { FsWatcher } from "@simplysm/core-node";

const watcher = await FsWatcher.watch(["src/**/*.ts"]);

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { event, path } of changes) {
    // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
    // path: PosixPath
  }
});

await watcher.close();
```

---

## `PrettyReporter`

터미널 출력용 consola reporter. 이벤트 타입별 아이콘과 색상을 적용하고, Error 객체의 스택 트레이스를 포맷팅한다.

```typescript
export class PrettyReporter implements ConsolaReporter {
  log(logObj: LogObject, ctx: { options: ConsolaOptions }): void;
}
```

- error/fatal 레벨은 `process.stderr`로 출력
- 그 외는 `process.stdout`으로 출력
- 터미널 색상 지원 여부를 자동 감지 (`NO_COLOR`, `FORCE_COLOR`, `isTTY`, Windows 감지)

---

## `FileReporterOptions`

`createFileReporter()`의 옵션.

```typescript
export interface FileReporterOptions {
  maxSize?: number;
  maxDays?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `maxSize` | `number` | 단일 로그 파일 최대 크기 (bytes). 기본값 20MB (20 \* 1024 \* 1024) |
| `maxDays` | `number` | 보관할 로그 파일 최대 일수. 기본값 14일 |

---

## `createFileReporter`

파일 기반 consola reporter를 생성한다. `.logs/` 디렉토리에 `app.YYYY-MM-DD.log` 형식으로 JSON 라인을 기록한다.

```typescript
export function createFileReporter(options?: FileReporterOptions): ConsolaReporter
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `FileReporterOptions` | 로그 파일 옵션 |

**동작 방식**:
- 날짜가 바뀌면 새 파일로 로테이션
- 파일 크기가 `maxSize`를 초과하면 `app.YYYY-MM-DD.1.log`, `app.YYYY-MM-DD.2.log` 형식으로 순번 추가
- `maxDays`보다 오래된 파일은 자동 삭제
- 각 로그 항목은 `{ time, level, tag?, msg?, err? }` JSON 형식

---

## `withMaxLevel`

consola reporter를 지정된 로그 레벨 이하로 제한하는 래퍼를 반환한다.

```typescript
export function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `reporter` | `ConsolaReporter` | 감쌀 reporter |
| `maxLevel` | `number` | 이 값보다 높은 레벨의 로그는 전달하지 않는다 |

consola의 로그 레벨: `0=fatal`, `1=error`, `2=warn`, `3=log`, `4=info`, `5=success`, `999=debug`

---

## `SetupConsolaOptions`

`setupConsola()`의 옵션.

```typescript
export interface SetupConsolaOptions {
  cli?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cli` | `boolean` | true이면 CLI 모드. 항상 PrettyReporter를 사용하고 FileReporter를 사용하지 않는다 |

---

## `setupConsola`

환경에 따라 consola reporter를 자동 구성한다.

```typescript
export function setupConsola(opts?: SetupConsolaOptions): void
```

환경별 동작:

| 환경 | 동작 |
|------|------|
| 프로덕션 (`DEV` 환경변수 없음) | `FileReporter`만 사용, debug 레벨까지 파일 기록 |
| 개발 + `SD_DEBUG=true` | `PrettyReporter`만 사용, debug 레벨까지 터미널 출력 |
| 개발 (일반) | `FileReporter` + `PrettyReporter`(info 이하만), debug는 파일에만 기록 |
| `cli: true` | `PrettyReporter`만 사용 (환경 무관) |

```typescript
import { setupConsola } from "@simplysm/core-node";

// 환경별 자동 구성
setupConsola();

// CLI 모드 (항상 PrettyReporter 사용)
setupConsola({ cli: true });
```
