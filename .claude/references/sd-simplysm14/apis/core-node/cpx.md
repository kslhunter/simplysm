# @simplysm/core-node — cpx

`export * as cpx` 네임스페이스 (`packages/core-node/src/utils/cp.ts`). 자식 프로세스 실행 + 출력 OS 인코딩 디코딩. `cpx.spawn(...)` 형태로 호출. 출력은 OS 콘솔 인코딩(Windows `chcp` 코드페이지, POSIX `LANG`/`LC_ALL`)을 감지해 디코딩하므로 한글 등 비-UTF8 콘솔 출력도 깨지지 않는다.

## spawn / spawnSync

- `spawn(cmd, args, options?): SpawnProcess` — 자식 프로세스를 비동기 실행. 반환값은 `await` 가능하며(`PromiseLike<SpawnResult>`) 동시에 `pid`/`kill` 접근 가능.
- `spawnSync(cmd, args, options?): SpawnResult` — 동기 실행. 즉시 결과 반환.
  - `cmd: string` — 실행 명령.
  - `args: string[]` — 인자 배열.
  - `options` — Node `SpawnOptions`(spawn) / `SpawnSyncOptions`(spawnSync) + `reject?: boolean`.
    - `env` — 전달 env. 항상 `process.env` 와 병합되며 전달분이 덮어쓴다.
    - `stdio` — 기본 `"pipe"`. pipe 인 스트림만 캡처되어 결과 문자열에 담긴다. `"inherit"` 등이면 해당 스트림은 빈 문자열.
    - `reject?: boolean` — exitCode 가 0 이 아닐 때 동작. 기본(미지정/`true`): 실패 메시지로 reject(spawn) 또는 throw(spawnSync). `false`: 0 이 아니어도 정상 반환(직접 `exitCode` 를 검사하려는 경우).

실패 메시지 형식: `Command failed (exit <code>): <cmd> <args>` 뒤에 stderr(없으면 stdout) 마지막 4000자.

```ts
import { cpx } from "@simplysm/core-node";

const { stdout, exitCode } = await cpx.spawn("git", ["status", "--short"]);
const r = cpx.spawnSync("node", ["-v"], { reject: false });
if (r.exitCode !== 0) { /* 직접 처리 */ }
```

## SpawnResult

- `interface SpawnResult { stdout: string; stderr: string; exitCode: number }` — 실행 결과.
  - `stdout` / `stderr` — pipe 로 캡처된 출력(OS 인코딩 디코딩 적용). 비-pipe 스트림이면 `""`.
  - `exitCode` — 종료 코드. 코드 없이 시그널로 종료됐으면 1, 정상이면 0.

## SpawnProcess

`spawn` 반환 타입(`implements PromiseLike<SpawnResult>`). Promise 처럼 쓰면서 프로세스 제어를 함께 제공.

- `pid: number | undefined` — 자식 프로세스 PID(생성 전이면 undefined).
- `then(onfulfilled?, onrejected?)` / `catch(onrejected?)` — `SpawnResult` 로 resolve 되는 thenable(그래서 `await` 가능).
- `kill(signal?: NodeJS.Signals | number): boolean` — 프로세스에 시그널 전송. 타임아웃·취소 시 사용.

```ts
const proc = cpx.spawn("long-task", []);
setTimeout(() => proc.kill("SIGTERM"), 5000);
const result = await proc;
```

## 인코딩 유틸

- `getSystemEncoding(): string` — OS 콘솔 인코딩 감지(결과 캐시됨). Windows 는 `chcp` 코드페이지, POSIX 는 `LANG`/`LC_ALL` 의 `.` 뒤 인코딩(`utf8`→`utf-8` 정규화). 감지 실패 시 `"utf-8"` fallback. spawn 출력 디코딩에 내부 사용.
- `resetEncodingCache(): void` — `getSystemEncoding` 캐시 초기화. 런타임 중 코드페이지가 바뀐 경우 재감지를 강제.
- `codePageToEncoding(codePage: number): string` — Windows 코드페이지 숫자 → 인코딩명. 매핑: 65001→utf-8, 949→euc-kr, 932→shift-jis, 936→gbk, 950→big5, 1252→windows-1252, 1251→windows-1251, 1250→windows-1250, 874→windows-874. 미등록 코드페이지는 `"utf-8"`.
- `resolveStdioPipe(stdio): { stdout: boolean; stderr: boolean }` — stdio 옵션에서 stdout/stderr 가 pipe 인지 판정. 배열이면 index 1/2 가 `"pipe"` 인지, 단일값이면 `"pipe"` 또는 미지정(null)일 때 둘 다 pipe. 캡처 여부 사전 판단용.
  - `stdio: SpawnOptions["stdio"]` — 판정할 stdio 설정.
- `decodeBytes(raw: Uint8Array, systemEncoding?: string): string` — 바이트열을 인코딩으로 디코딩.
  - `raw: Uint8Array` — 디코딩할 바이트열.
  - `systemEncoding?: string` — 인코딩명. 미지정 시 `getSystemEncoding()` 사용. 인코딩이 utf-8 이 아니어도 먼저 UTF-8(fatal) 디코딩을 시도해 성공하면 UTF-8 로, 실패 시 지정 인코딩으로 디코딩(UTF-8/레거시 혼재 출력 대응).
