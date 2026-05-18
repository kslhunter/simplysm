## @simplysm/core-node — cpx

`import { cpx } from "@simplysm/core-node"` — 자식 프로세스 spawn + 시스템 인코딩 감지. Windows `chcp` 코드 페이지 또는 POSIX `LANG/LC_ALL` 의 charset 부분을 보고 stdout/stderr 를 적절히 디코딩.

### 인코딩 감지

```ts
cpx.getSystemEncoding(): string                   // 최초 1회 감지 후 모듈 캐시
cpx.resetEncodingCache(): void
cpx.codePageToEncoding(codePage: number): string  // 65001→utf-8, 949→euc-kr, 932→shift-jis, 936→gbk, 950→big5, 1252/1251/1250/874→windows-* / 그 외 utf-8
```

감지 실패 시 `utf-8` fallback.

### 디코딩

```ts
cpx.decodeBytes(raw: Uint8Array, systemEncoding?: string): string
// utf-8 이면 바로 디코딩.
// 그 외 인코딩이면 먼저 utf-8 strict 시도 → 실패 시 systemEncoding 으로 fallback.
```

### spawn / spawnSync

```ts
interface SpawnResult { stdout: string; stderr: string; exitCode: number; }

cpx.spawn(cmd, args, opts?: SpawnOptions & { reject?: boolean }): SpawnProcess
cpx.spawnSync(cmd, args, opts?: SpawnSyncOptions & { reject?: boolean }): SpawnResult
```

- 기본 `stdio: "pipe"`. `process.env` 와 `opts.env` 머지해 자식에 전달.
- stdout/stderr 가 pipe 면 모아서 `decodeBytes` 로 문자열화.
- `exitCode !== 0` 이고 `reject !== false` 면 throw (`Command failed: <cmd> <args>`).
- `cpx.spawn` 은 `SpawnProcess` 반환 (PromiseLike + `pid` + `kill(signal?)`).

```ts
const r = await cpx.spawn("git", ["status", "--porcelain"]);
console.log(r.stdout);

const proc = cpx.spawn("pnpm", ["watch"], { reject: false });
process.on("SIGINT", () => proc.kill());
const { exitCode } = await proc;
```

### resolveStdioPipe

```ts
cpx.resolveStdioPipe(stdio): { stdout: boolean; stderr: boolean }
```

stdio 값(`"pipe"`, `"inherit"`, 배열, `undefined`)에서 stdout/stderr 각각 pipe 여부 판정. spawn 자체가 내부 사용하므로 사용자 호출 거의 없음.
