# Utilities — cpx

`cpx`는 `@simplysm/core-node`에서 네임스페이스로 re-export되는 자식 프로세스 실행 유틸리티 모음이다.

```typescript
import { cpx } from "@simplysm/core-node";
```

---

## `SpawnResult`

프로세스 실행 결과.

```typescript
export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stdout` | `string` | 표준 출력 문자열. stdio가 "inherit"이면 빈 문자열 |
| `stderr` | `string` | 표준 에러 문자열. stdio가 "inherit"이면 빈 문자열 |
| `exitCode` | `number` | 프로세스 종료 코드 |

---

## `SpawnProcess`

`spawn()`의 반환 타입. `PromiseLike<SpawnResult>`를 구현하여 `await`로 결과를 기다리거나, `kill()`로 프로세스를 종료할 수 있다.

```typescript
export class SpawnProcess implements PromiseLike<SpawnResult> {
  get pid(): number | undefined;
  then(onfulfilled?, onrejected?): Promise<...>;
  catch(onrejected?): Promise<...>;
  kill(signal?: NodeJS.Signals | number): boolean;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `pid` | `number \| undefined` | 프로세스 ID |
| `then` | method | PromiseLike 구현 |
| `catch` | method | PromiseLike 구현 |
| `kill` | method | 프로세스에 시그널 전송. 성공 여부 반환 |

---

## `spawn`

비동기 자식 프로세스를 실행한다. `SpawnProcess`를 반환하므로 `await`로 결과를 기다리거나 `kill()`로 종료할 수 있다.

기본적으로 `exitCode !== 0`이면 reject된다. `options.reject: false`를 지정하면 항상 resolve된다.

```typescript
export function spawn(
  cmd: string,
  args: string[],
  options?: SpawnOptions & { reject?: boolean },
): SpawnProcess
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | `string` | 실행할 명령어 |
| `args` | `string[]` | 명령어 인수 |
| `options` | `SpawnOptions & { reject?: boolean }` | Node.js `child_process.spawn` 옵션 + `reject` 플래그 |
| `options.reject` | `boolean` | false이면 exitCode != 0이어도 resolve. 기본값 true |

```typescript
// 기본 사용
const result = await cpx.spawn("git", ["status"], { cwd: "/project" });

// 종료 가능한 프로세스
const proc = cpx.spawn("long-running-cmd", []);
proc.kill();

// 출력 직접 표시, 오류 무시
await cpx.spawn("make", ["build"], { stdio: "inherit", reject: false });
```

---

## `spawnSync`

동기 자식 프로세스를 실행한다. `SpawnResult`를 직접 반환한다.

기본적으로 `exitCode !== 0`이면 throw된다. `options.reject: false`를 지정하면 항상 반환된다.

```typescript
export function spawnSync(
  cmd: string,
  args: string[],
  options?: SpawnSyncOptions & { reject?: boolean },
): SpawnResult
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | `string` | 실행할 명령어 |
| `args` | `string[]` | 명령어 인수 |
| `options` | `SpawnSyncOptions & { reject?: boolean }` | Node.js `child_process.spawnSync` 옵션 + `reject` 플래그 |
| `options.reject` | `boolean` | false이면 exitCode != 0이어도 반환. 기본값 true |

---

## `getSystemEncoding`

시스템 인코딩을 감지한다. 결과는 캐시된다.

- Windows: `chcp` 명령으로 코드 페이지 번호를 읽어 인코딩 이름으로 변환
- Linux/macOS: `LANG` 또는 `LC_ALL` 환경변수에서 추출
- 감지 실패 시 `"utf-8"` 반환

```typescript
export function getSystemEncoding(): string
```

---

## `codePageToEncoding`

Windows 코드 페이지 번호를 인코딩 이름으로 변환한다.

```typescript
export function codePageToEncoding(codePage: number): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `codePage` | `number` | Windows 코드 페이지 번호 (예: 65001, 949) |

**반환**: 인코딩 이름 (예: `"utf-8"`, `"euc-kr"`). 알 수 없는 코드 페이지는 `"utf-8"` 반환.

지원하는 코드 페이지:

| Code Page | Encoding |
|-----------|----------|
| 65001 | utf-8 |
| 949 | euc-kr |
| 932 | shift-jis |
| 936 | gbk |
| 950 | big5 |
| 1252 | windows-1252 |
| 1251 | windows-1251 |
| 1250 | windows-1250 |
| 874 | windows-874 |

---

## `resetEncodingCache`

`getSystemEncoding()`이 캐시한 인코딩 값을 초기화한다. 다음 호출 시 재감지한다.

```typescript
export function resetEncodingCache(): void
```

---

## `decodeBytes`

`Uint8Array`를 시스템 인코딩으로 문자열로 디코딩한다. UTF-8로 먼저 시도하고 실패 시 시스템 인코딩을 사용한다.

```typescript
export function decodeBytes(raw: Uint8Array, systemEncoding?: string): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `raw` | `Uint8Array` | 디코딩할 바이트 배열 |
| `systemEncoding` | `string` | 사용할 인코딩. 생략 시 `getSystemEncoding()` 결과 사용 |

---

## `resolveStdioPipe`

Node.js `stdio` 옵션에서 stdout/stderr가 pipe인지 여부를 추출한다.

```typescript
export function resolveStdioPipe(
  stdio: SpawnOptions["stdio"],
): { stdout: boolean; stderr: boolean }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `stdio` | `SpawnOptions["stdio"]` | Node.js spawn의 stdio 옵션 |

**반환**: `{ stdout: boolean, stderr: boolean }`. `stdio`가 `"pipe"` 또는 `null`/`undefined`이면 둘 다 `true`.
