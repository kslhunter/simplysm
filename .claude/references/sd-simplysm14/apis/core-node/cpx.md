# @simplysm/core-node — cpx

`import { cpx } from "@simplysm/core-node"`. 자식 프로세스 실행 네임스페이스. stdout/stderr 를 OS 시스템 인코딩(Windows 코드페이지 / POSIX `LANG`)으로 디코딩 수집하고, 0 이 아닌 종료 코드는 기본적으로 에러로 throw 한다.

## spawn / spawnSync

- `spawn(cmd: string, args: string[], options?): SpawnProcess` — 비동기 실행. `await` 하면 `SpawnResult` 반환. 기본 `stdio: "pipe"`.
- `spawnSync(cmd: string, args: string[], options?): SpawnResult` — 동기 실행, 결과 즉시 반환.
  - `options` — Node `SpawnOptions`/`SpawnSyncOptions` + `reject?: boolean`.
  - `options.reject?: boolean` — `false` 면 0 이 아닌 종료 코드라도 throw 하지 않고 `SpawnResult` 를 반환(종료 코드를 호출자가 직접 검사할 때). 미지정/`true` 면 실패 시 cmd·args·exitCode·출력 일부(최대 4000자)를 담은 메시지로 throw.
  - `options.env` — `process.env` 위에 머지되어 자식에 전달(전체 교체 아님).
  - `options.stdio` — `"pipe"`(또는 미지정)일 때만 stdout/stderr 캡처. `"inherit"` 등이면 결과 문자열은 빈 값.

```ts
const { stdout } = await cpx.spawn("git", ["rev-parse", "HEAD"]);
const r = cpx.spawnSync("node", ["-v"], { reject: false });
if (r.exitCode !== 0) { /* 직접 처리 */ }
```

- `SpawnResult` — `{ stdout: string; stderr: string; exitCode: number }`. 시그널 종료 시 exitCode 는 1 로 채워짐.
- `SpawnProcess` — `spawn` 반환값. `PromiseLike<SpawnResult>`(then/catch 가능) + `get pid(): number | undefined` + `kill(signal?: NodeJS.Signals | number): boolean`. 완료 전 프로세스를 제어할 때 사용.

```ts
const proc = cpx.spawn("long-task", []);
proc.kill("SIGTERM");
```

## 인코딩

- `getSystemEncoding(): string` — OS 시스템 인코딩 감지(Windows: `chcp` 코드페이지, POSIX: `LANG`/`LC_ALL` 의 `.` 뒤 부분). 결과를 캐시. 감지 실패 시 `"utf-8"`. spawn 결과 디코딩에 내부적으로 사용.
- `resetEncodingCache(): void` — 위 캐시 무효화(코드페이지 변경 후 재감지 / 테스트 용).
- `codePageToEncoding(codePage: number): string` — Windows 코드페이지 번호 → 인코딩명(예: 65001→utf-8, 949→euc-kr, 932→shift-jis). 매핑 없으면 `"utf-8"`.
- `decodeBytes(raw: Uint8Array, systemEncoding?: string): string` — 바이트 디코딩. 인코딩이 utf-8 이면 그대로 디코딩, 아니면 utf-8(fatal) 시도 후 실패 시 시스템 인코딩으로 폴백. `systemEncoding` 미지정 시 `getSystemEncoding()` 사용.
- `resolveStdioPipe(stdio): { stdout: boolean; stderr: boolean }` — `stdio` 옵션에서 stdout/stderr 가 pipe 인지 판정. 배열이면 인덱스 1/2 가 `"pipe"` 인지 검사, 단일 값/`null` 이면 둘 다 동일 판정. 캡처 여부 결정에 사용.

## 주의사항

- 실패 시 throw 가 기본 — silent skip 금지 원칙과 일치. 종료 코드를 직접 다루려면 명시적으로 `reject: false`.
- 인코딩 디코딩 비용을 피하려면 `stdio: "inherit"` 로 캡처를 끄면 됨(단 결과 문자열은 빈 값).
