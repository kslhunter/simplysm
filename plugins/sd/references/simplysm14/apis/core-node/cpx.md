# @simplysm/core-node — cpx

`export * as cpx` 네임스페이스 (`utils/cp.ts`). 자식 프로세스 실행, stdout/stderr 캡처, OS 콘솔 인코딩 감지·디코딩을 함께 다룰 때 읽는 군.

## SpawnResult

`interface SpawnResult { stdout: string; stderr: string; exitCode: number }`

- `stdout: string` — stdout 이 pipe 일 때 캡처·디코딩된 문자열. pipe 가 아니면 빈 문자열.
- `stderr: string` — stderr 가 pipe 일 때 캡처·디코딩된 문자열. pipe 가 아니면 빈 문자열.
- `exitCode: number` — 종료 코드. 비동기 `spawn` 에서는 `code ?? (signal != null ? 1 : 0)`, 동기 `spawnSync` 에서는 `status ?? 0`.

## spawn

`function spawn(cmd: string, args: string[], options?: SpawnOptions & { reject?: boolean }): SpawnProcess`

- `cmd: string` — 실행할 명령.
- `args: string[]` — 명령 인자 배열.
- `options?: SpawnOptions & { reject?: boolean }` — Node `SpawnOptions` 에 `reject` 를 더한 값. 내부 기본 `stdio` 는 `"pipe"`, `env` 는 `{ ...process.env, ...options.env }` 로 병합된다.
- `options.reject?: boolean` — exitCode 가 0 이 아닐 때 처리. `false` 이면 `SpawnResult` 로 resolve, 그 외(미지정 포함)에는 실패 메시지 Error 로 reject.
- `options.shell?: boolean | string` — null/undefined 도 false 도 아니고 `args` 가 비어있지 않으면 `[cmd, ...args].join(" ")` 로 cmd 에 미리 합치고 args 를 비운다 (DEP0190 경고 회피).
- 반환 `SpawnProcess` — await 가능한 프로세스 래퍼. 프로세스 `error` 이벤트는 reject, `close` 이벤트에서 결과가 확정된다.

## spawnSync

`function spawnSync(cmd: string, args: string[], options?: SpawnSyncOptions & { reject?: boolean }): SpawnResult`

- `cmd: string` — 실행할 명령.
- `args: string[]` — 명령 인자 배열.
- `options?: SpawnSyncOptions & { reject?: boolean }` — Node `SpawnSyncOptions` 에 `reject` 를 더한 값. 기본 `stdio` 는 `"pipe"`, `env` 는 `process.env` 와 병합된다. `shell` 병합 처리는 `spawn` 과 동일하다.
- `options.reject?: boolean` — exitCode 가 0 이 아닐 때 처리. `false` 이면 `SpawnResult` 반환, 그 외에는 실패 메시지 Error 로 throw.
- 반환 `SpawnResult` — stdout/stderr 는 `decodeBytes` 로 디코딩.

실패 메시지는 `Command failed (exit <exitCode>): <cmd> <args...>` 뒤에 stderr trim(없으면 stdout trim) 의 마지막 4000자를 붙인 형태다.

## SpawnProcess

`class SpawnProcess implements PromiseLike<SpawnResult>`

- `pid: number | undefined` — 내부 `ChildProcess.pid`.
- `process: ChildProcess` — 내부 `ChildProcess` 인스턴스.
- `then(onfulfilled?, onrejected?)` — 내부 Promise 의 then. `await cpx.spawn(...)` 를 가능하게 한다.
- `catch(onrejected?)` — 내부 Promise 의 catch. spawn 실패나 reject 처리된 종료를 받을 때 쓴다.
- `kill(signal?: NodeJS.Signals | number): boolean` — 내부 프로세스에 signal 을 보내고 `ChildProcess.kill` 결과를 반환한다.

## codePageToEncoding

`function codePageToEncoding(codePage: number): string`

- `codePage: number` — Windows 코드페이지 숫자.
- 반환 `string` — 65001=`utf-8`, 949=`euc-kr`, 932=`shift-jis`, 936=`gbk`, 950=`big5`, 1252=`windows-1252`, 1251=`windows-1251`, 1250=`windows-1250`, 874=`windows-874`; 매핑 없으면 `utf-8`.

## getSystemEncoding / resetEncodingCache

`function getSystemEncoding(): string`

- 반환 `string` — 캐시 값이 있으면 즉시 반환. Windows 는 `chcp` 출력의 숫자를 `codePageToEncoding` 으로 변환, 그 외는 `env("LANG") ?? env("LC_ALL")` 의 `.` 뒤(그리고 `@` 앞) 문자열을 소문자로 읽고 `utf8` 은 `utf-8` 로 보정. 감지 실패 시 `utf-8`. 결과는 내부 캐시에 저장된다.

`function resetEncodingCache(): void`

- 내부 캐시를 `undefined` 로 되돌린다. 다음 `getSystemEncoding` 에서 다시 감지한다.

## resolveStdioPipe

`function resolveStdioPipe(stdio: SpawnOptions["stdio"]): { stdout: boolean; stderr: boolean }`

- `stdio: SpawnOptions["stdio"]` — Node stdio 옵션.
- 반환 `stdout` — 배열이면 index 1 이 `"pipe"` 인지, 단일값이면 `"pipe"` 또는 null/undefined 인지.
- 반환 `stderr` — 배열이면 index 2 가 `"pipe"` 인지, 단일값이면 `"pipe"` 또는 null/undefined 인지.

## decodeBytes

`function decodeBytes(raw: Uint8Array, systemEncoding?: string): string`

- `raw: Uint8Array` — 디코딩할 바이트 배열.
- `systemEncoding?: string` — 사용할 인코딩. 생략하면 `getSystemEncoding()` 결과를 쓴다.
- 반환 `string` — 인코딩이 `utf-8` 이면 바로 UTF-8 디코딩. 그 외에는 먼저 UTF-8 fatal 디코딩을 시도하고, 실패하면 `systemEncoding` 으로 디코딩한다.
