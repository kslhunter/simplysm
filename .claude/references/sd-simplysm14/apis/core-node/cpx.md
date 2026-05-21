## @simplysm/core-node — cpx

`import { cpx } from "@simplysm/core-node"`. 자식 프로세스 spawn 래퍼. stdout/stderr 를 시스템 인코딩으로 자동 디코딩, 실패 시 stderr 포함 에러 throw.

### 인코딩 감지

- `getSystemEncoding(): string` — Windows 는 `chcp` 결과 코드 페이지를, POSIX 는 `LANG`/`LC_ALL` 의 `.<enc>` 부분을 파싱. 실패 시 `"utf-8"`. **결과는 모듈 캐시**.
- `resetEncodingCache(): void` — 캐시 초기화. 환경 변경 후 강제 재감지 시.
- `codePageToEncoding(codePage): string` — Windows 코드 페이지 번호→IANA 인코딩명(65001/949/932/936/950/1252/1251/1250/874 지원, 그 외 `"utf-8"`).
- `decodeBytes(raw: Uint8Array, systemEncoding?: string): string` — UTF-8 fatal decode 시도 → 실패 시 지정 인코딩으로 fallback.

### spawn

```ts
spawn(cmd, args, options?): SpawnProcess
spawnSync(cmd, args, options?): SpawnResult
```

- `options`: Node `SpawnOptions`/`SpawnSyncOptions` + `reject?: boolean`.
  - `stdio` 기본 `"pipe"`. pipe 인 스트림만 캡처되며 비-pipe 스트림은 결과 문자열이 빈 문자열.
  - `env`: `process.env` 와 병합되어 자식에 전달.
  - `reject` (기본 `true`): exitCode≠0 일 때 `false` 면 결과 객체 반환, `true` 면 throw. 에러 메시지는 `Command failed (exit N): <cmd> <args>` + stderr/stdout 마지막 4000자.
- `SpawnResult`: `{ stdout: string; stderr: string; exitCode: number }`. 종료 코드가 없고 시그널만 있으면 exitCode=1.

### SpawnProcess

`spawn()` 반환값. `PromiseLike<SpawnResult>`.

- `pid: number | undefined` — 자식 PID.
- `then / catch` — `SpawnResult` resolve 또는 에러 reject.
- `kill(signal?): boolean` — 자식 프로세스에 시그널 전송.

### resolveStdioPipe

- `resolveStdioPipe(stdio): { stdout: boolean; stderr: boolean }` — `SpawnOptions["stdio"]` 가 각 스트림에 대해 pipe 인지 판정. 배열·`"pipe"`·`undefined` 모두 처리.

### 예

```ts
import { cpx } from "@simplysm/core-node";
const { stdout } = await cpx.spawn("git", ["rev-parse", "HEAD"]);
const proc = cpx.spawn("node", ["server.js"], { reject: false });
proc.kill("SIGTERM");
```
