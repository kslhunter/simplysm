# @simplysm/core-node — cpx

자식 프로세스 실행 및 시스템 콘솔 인코딩 감지.

- `spawn/spawnSync`는 stdout/stderr를 자동 수집해 문자열로 디코딩함.
- 종료 코드가 0이 아니면 오류를 throw함(설정으로 비활성화 가능).

## 타입, 인터페이스

### SpawnResult

- `stdout: string` — 명령 표준 출력. stdio가 pipe가 아니면 빈 문자열.
- `stderr: string` — 명령 표준 오류. stdio가 pipe가 아니면 빈 문자열.
- `exitCode: number` — 프로세스 종료 코드. 비동기 `spawn`에서는 `code ?? (signal != null ? 1 : 0)`, 동기 `spawnSync`에서는 `status ?? 0`.

### SpawnProcess

PromiseLike 구현.

- await 가능하면서 동시에 프로세스 실행 중 제어에 접근 가능.
  - 대상: pid, process, kill.

- `pid: number | undefined` — 자식 프로세스 ID. 시작 전이면 undefined.
- `process: ChildProcess` — 원본 Node `child_process.ChildProcess`. stdout/stderr 스트림 직접 접근 필요 시 사용.
- `then/catch(...)` — Promise 호환 메서드. `await cpx.spawn(...)`을 지원.
- `kill(signal?: NodeJS.Signals | number): boolean` — 프로세스에 신호 송신. 성공 여부 반환.

## 함수

### 콘솔 인코딩 감지

- `getSystemEncoding(): string`
  — 시스템 기본 콘솔 인코딩 감지. 결과 캐싱됨.
  - Windows는 `chcp` 명령으로 code page 조회 후 변환.
  - Unix는 `LANG`/`LC_ALL` 환경 변수에서 인코딩명 추출.
  - 감지 실패 시 기본값 "utf-8".
- `codePageToEncoding(codePage: number): string` — Windows code page → 인코딩명. 미지정 code page는 utf-8 반환.
  - 값: 65001=utf-8, 949=euc-kr, 932=shift-jis, 936=gbk, 950=big5, 1252=windows-1252, 1251=windows-1251, 1250=windows-1250, 874=windows-874.
- `resetEncodingCache(): void` — 캐싱된 시스템 인코딩 초기화. 테스트나 동적 환경 변경 시 재감지 필요한 경우 호출.

### 바이트 디코딩

- `decodeBytes(raw: Uint8Array, systemEncoding?: string): string`
  — 바이트를 문자열로 디코딩.
  - 기본 인코딩은 `getSystemEncoding()`.
  - UTF-8 시도 후 fatal 실패하면 지정된 인코딩으로 재시도.
- `resolveStdioPipe(stdio: SpawnOptions["stdio"]): { stdout: boolean; stderr: boolean }` — stdio 옵션에서 stdout/stderr가 pipe로 설정되었는지 판정.

### 프로세스 실행

- `spawn(cmd: string, args: string[], options?: SpawnOptions & { reject?: boolean }): SpawnProcess` — 명령을 자식 프로세스로 실행 (비동기).
  - `cmd` — 실행할 명령.
  - `args` — 명령 인자 배열.
  - `options.reject?: boolean` — true(기본값)이면 종료 코드 ≠ 0일 때 오류 throw. false면 결과 반환.
  - `options.shell?: boolean | string` — 활성화되고 args가 비어있지 않으면, cmd와 args를 공백으로 합친 뒤 args를 비워 DEP0190 경고 회피.
  - `options.env?: NodeJS.ProcessEnv` — 자식 프로세스 환경 변수. `process.env`에 병합됨.
  - 기본 `stdio: "pipe"`, stdout/stderr 자동 수집.
  - 반환: `SpawnProcess` (promise처럼 await 가능, 동시에 프로세스 제어 가능).

- `spawnSync(cmd: string, args: string[], options?: SpawnSyncOptions & { reject?: boolean }): SpawnResult` — 명령을 동기 실행.
  - 인자, 옵션은 `spawn`과 동일. shell 병합 처리도 동일.
  - `options.reject?: boolean` — true(기본값)이면 오류 throw, false면 결과 반환.
  - 반환: `SpawnResult` (진행 중이 아니므로 PromiseLike 아님).

### 오류 메시지 형식

명령 실패 시(exitCode ≠ 0, `reject !== false`) throw 오류 메시지:

```
Command failed (exit <코드>): <cmd> <args>
<stderr 또는 stdout 마지막 4000자>
```
