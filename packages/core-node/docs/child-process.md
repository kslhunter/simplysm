# Child Process (cpx)

## `spawn`

자식 프로세스를 실행한다 (비동기).

SpawnProcess를 반환하며, await로 결과를 기다리거나 kill()로 프로세스를 종료할 수 있다.

```typescript
export function spawn(
  cmd: string,
  args: string[],
  options?: SpawnOptions & { reject?: boolean },
): SpawnProcess
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | string | 실행할 명령어 |
| `args` | string[] | 명령어 인자 배열 |
| `options` | SpawnOptions & { reject?: boolean } (optional) | spawn 옵션. `reject: false`를 지정하면 exitCode !== 0일 때도 reject되지 않음 (기본값: true) |

**Return**: SpawnProcess (PromiseLike + kill() 메서드)

**Note**: 기본적으로 `exitCode !== 0`이면 reject된다. `options.reject: false`를 지정하면 항상 resolve된다.

---

## `spawnSync`

자식 프로세스를 동기로 실행한다.

```typescript
export function spawnSync(
  cmd: string,
  args: string[],
  options?: SpawnSyncOptions & { reject?: boolean },
): SpawnResult
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | string | 실행할 명령어 |
| `args` | string[] | 명령어 인자 배열 |
| `options` | SpawnSyncOptions & { reject?: boolean } (optional) | spawn 옵션. `reject: false`를 지정하면 exitCode !== 0일 때도 throw되지 않음 (기본값: true) |

**Return**: SpawnResult

**Note**: 기본적으로 `exitCode !== 0`이면 throw된다. `options.reject: false`를 지정하면 항상 반환된다.

---

## `SpawnProcess`

spawn() 반환 타입. PromiseLike를 구현하므로 await로 사용 가능하며, kill() 메서드로 프로세스를 종료할 수 있다.

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

### Properties

| Name | Type | Description |
|------|------|-------------|
| `pid` | number \| undefined | 자식 프로세스의 PID |

### Methods

| Name | Signature | Description |
|------|-----------|-------------|
| `then` | `<TResult1, TResult2>(onfulfilled?, onrejected?): Promise` | Promise의 then 메서드 |
| `catch` | `<TResult>(onrejected?): Promise` | Promise의 catch 메서드 |
| `kill` | `(signal?): boolean` | 프로세스에 신호를 보낸다 (기본값: SIGTERM) |

---

## `SpawnResult`

spawn/spawnSync 결과.

```typescript
export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stdout` | string | 표준 출력 내용 |
| `stderr` | string | 표준 에러 내용 |
| `exitCode` | number | 프로세스 종료 코드 |

---

## `getSystemEncoding`

시스템의 기본 인코딩을 감지한다.

```typescript
export function getSystemEncoding(): string
```

**Return**: 시스템 인코딩 (예: "utf-8", "euc-kr")

**Note**: 결과는 캐시되므로 반복 호출은 빠르다. 캐시를 초기화하려면 resetEncodingCache()를 호출한다.

---

## `codePageToEncoding`

Windows 코드 페이지 번호를 인코딩 이름으로 변환한다.

```typescript
export function codePageToEncoding(codePage: number): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `codePage` | number | Windows 코드 페이지 번호 (예: 65001 = UTF-8, 949 = EUC-KR) |

**Return**: 인코딩 이름 (예: "utf-8"). 미지의 코드 페이지는 "utf-8"으로 폴백된다.

---

## `resetEncodingCache`

캐시된 시스템 인코딩을 초기화한다.

```typescript
export function resetEncodingCache(): void
```

---

## `decodeBytes`

Uint8Array를 문자열로 디코딩한다.

```typescript
export function decodeBytes(raw: Uint8Array, systemEncoding?: string): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `raw` | Uint8Array | 디코딩할 바이트 배열 |
| `systemEncoding` | string (optional) | 인코딩 이름. 생략하면 getSystemEncoding()의 결과를 사용한다. |

**Return**: 디코딩된 문자열

**Note**: UTF-8이 아닌 인코딩인 경우, 먼저 UTF-8로 디코딩을 시도하고 실패하면 지정된 인코딩으로 시도한다.

---

## `resolveStdioPipe`

stdio 옵션에서 stdout/stderr의 pipe 여부를 추출한다.

```typescript
export function resolveStdioPipe(
  stdio: SpawnOptions["stdio"],
): { stdout: boolean; stderr: boolean }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `stdio` | SpawnOptions["stdio"] | spawn 옵션의 stdio 설정 |

**Return**: `{ stdout: boolean, stderr: boolean }` - 각 스트림이 pipe인지 여부

**Note**: stdio가 배열이 아니면, "pipe"(또는 undefined)일 때 true, 그 외엔 false를 반환한다.
