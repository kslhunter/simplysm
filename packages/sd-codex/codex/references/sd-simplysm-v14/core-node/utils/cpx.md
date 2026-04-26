# `cpx`

> **읽어야 하는 상황**: 외부 명령어(git, npm, 빌드 도구 등)를 실행하고 결과를 받아야 할 때. CPU 집약적 작업을 별도 스레드로 분리하려면 [`Worker`](../worker/worker.md) 참조.

자식 프로세스 실행 및 인코딩 감지 유틸리티 네임스페이스.

```typescript
import { cpx } from "@simplysm/core-node";
```

## When to use

- ✅ 외부 명령어(git, npm, 빌드 도구 등)를 실행하고 결과를 받아야 할 때
- ✅ 자식 프로세스의 stdout/stderr를 Uint8Array로 수집하고 시스템 인코딩에 맞게 디코딩해야 할 때
- ❌ Worker thread로 CPU 작업 분리 → [`Worker`](../worker/worker.md) 사용

## Members

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `spawn` | function | `(cmd: string, args: string[], options?: SpawnOptions & { reject?: boolean }) => SpawnProcess` | 자식 프로세스 실행 (비동기). `SpawnProcess`를 반환한다 |
| `spawnSync` | function | `(cmd: string, args: string[], options?: SpawnSyncOptions & { reject?: boolean }) => SpawnResult` | 자식 프로세스 동기 실행 |
| `getSystemEncoding` | function | `() => string` | 시스템 기본 인코딩 감지. 결과는 캐시됨 |
| `codePageToEncoding` | function | `(codePage: number) => string` | Windows 코드 페이지 번호를 인코딩 이름으로 변환 |
| `resetEncodingCache` | function | `() => void` | 캐시된 시스템 인코딩 초기화 |
| `decodeBytes` | function | `(raw: Uint8Array, systemEncoding?: string) => string` | Uint8Array를 문자열로 디코딩 |
| `resolveStdioPipe` | function | `(stdio: SpawnOptions["stdio"]) => { stdout: boolean; stderr: boolean }` | stdio 옵션에서 pipe 여부 추출 |
| `SpawnProcess` | class | — | `spawn()` 반환 타입. PromiseLike 구현, kill() 지원 |
| `SpawnResult` | interface | — | `spawn`/`spawnSync` 결과 타입 |

## `SpawnProcess`

`spawn()`이 반환하는 클래스. `PromiseLike<SpawnResult>`를 구현하여 `await`로 사용 가능하다.

```typescript
export class SpawnProcess implements PromiseLike<SpawnResult> {
  get pid(): number | undefined
  then<TResult1 = SpawnResult, TResult2 = never>(
    onfulfilled?: ((value: SpawnResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<SpawnResult | TResult>
  kill(signal?: NodeJS.Signals | number): boolean
}
```

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `pid` | getter | `number \| undefined` | 자식 프로세스의 PID |
| `then` | method | `PromiseLike.then` | Promise then 메서드 |
| `catch` | method | `PromiseLike.catch` | Promise catch 메서드 |
| `kill` | method | `(signal?: NodeJS.Signals \| number) => boolean` | 프로세스에 신호를 보냄 (기본값: SIGTERM) |

## `SpawnResult`

```typescript
export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stdout` | `string` | 표준 출력 내용. stdio가 "pipe"가 아니면 빈 문자열 |
| `stderr` | `string` | 표준 에러 내용. stdio가 "pipe"가 아니면 빈 문자열 |
| `exitCode` | `number` | 프로세스 종료 코드 |

## reject 옵션

`spawn`/`spawnSync` 모두 기본적으로 `exitCode !== 0`이면 오류를 발생시킨다. `options.reject: false`를 지정하면 항상 정상 반환된다.

## getSystemEncoding 인코딩 감지 로직

- **Windows**: `chcp` 명령으로 코드 페이지를 얻어 `codePageToEncoding()`으로 변환
- **Linux/macOS**: `LANG` 또는 `LC_ALL` 환경 변수의 `.` 이후 부분 사용
- 감지 실패 시 `"utf-8"` 반환

## decodeBytes 디코딩 로직

- `systemEncoding`이 `"utf-8"`이면 UTF-8로 바로 디코딩
- 그렇지 않으면 먼저 UTF-8 strict 디코딩을 시도하고, 실패하면 `systemEncoding`으로 디코딩

## Usage

```typescript
import { cpx } from "@simplysm/core-node";

// 기본 실행 (결과 대기)
const result = await cpx.spawn("git", ["status"], { cwd: "/project" });
console.log(result.stdout);

// 실시간 출력 표시
await cpx.spawn("npm", ["run", "build"], { stdio: "inherit" });

// 오류 무시
const result2 = await cpx.spawn("cmd", ["nonexistent"], { reject: false });
// result2.exitCode가 0이 아니어도 throw되지 않음

// 프로세스 제어
const proc = cpx.spawn("long-running", []);
setTimeout(() => proc.kill(), 5000);
const r = await proc;

// 동기 실행
const syncResult = cpx.spawnSync("node", ["--version"]);

// 인코딩 감지
const encoding = cpx.getSystemEncoding(); // e.g. "utf-8", "euc-kr"
```

## 🚫 Anti-patterns

### reject: false 없이 실패 허용 프로세스 실행

```typescript
// ❌ exitCode !== 0이면 throw — 의도적으로 실패를 허용할 때 문제
const result = await cpx.spawn("grep", ["pattern", "file.txt"]);

// ✅ reject: false로 종료 코드를 직접 확인
const result = await cpx.spawn("grep", ["pattern", "file.txt"], { reject: false });
if (result.exitCode === 0) {
  // 매칭 있음
}
```

**근거**: `spawn`/`spawnSync`는 기본적으로 `exitCode !== 0`이면 오류를 발생시킨다. 실패가 정상 흐름인 경우 `reject: false` 필수.
