# CLI 코드 리뷰 이슈 수정 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** code-reviewer 에이전트가 발견한 7가지 이슈를 수정하여 packages/cli 패키지의 코드 품질 향상

**Architecture:** 각 이슈를 독립적으로 수정하고, 수정 후 타입체크로 검증. 테스트 코드가 없는 리팩토링이므로 타입체크가 주요 검증 수단.

**Tech Stack:** TypeScript, consola, Node.js Worker threads

---

## Task 1: SdConfigFn 타입 정의 수정

**Files:**

- Modify: `packages/cli/src/sd-config.types.ts:197-210`

**Step 1: SdConfigParams 인터페이스 추가 및 SdConfigFn 타입 수정**

`sd-config.types.ts` 파일의 마지막 부분 (197-210행)을 수정:

````typescript
/**
 * sd.config.ts 함수에 전달되는 파라미터
 */
export interface SdConfigParams {
  /** 현재 작업 디렉토리 */
  cwd: string;
  /** 개발 모드 여부 */
  dev: boolean;
  /** 추가 옵션 (CLI의 -o 플래그) */
  opt: string[];
}

/**
 * sd.config.ts는 다음과 같은 형태의 함수를 default export해야 한다:
 *
 * ```typescript
 * import type { SdConfig, SdConfigFn, SdConfigParams } from "@simplysm/cli";
 *
 * const config: SdConfigFn = (params: SdConfigParams) => ({
 *   packages: {
 *     "core-common": { target: "neutral" },
 *     "core-node": { target: "node" },
 *   },
 * });
 *
 * export default config;
 * ```
 */
export type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
````

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 3: 커밋**

```bash
git add packages/cli/src/sd-config.types.ts
git commit -m "fix(cli): SdConfigFn 타입에 params 추가

- SdConfigParams 인터페이스 추가
- SdConfigFn이 params를 받고 Promise 반환도 허용하도록 수정
- JSDoc 예제 업데이트

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: index.ts export 추가

**Files:**

- Modify: `packages/cli/src/index.ts:1-5`

**Step 1: 누락된 export 추가**

```typescript
export * from "./sd-config.types";
export { runLint, type LintOptions } from "./commands/lint";
export { runTypecheck, type TypecheckOptions } from "./commands/typecheck";
export { runWatch, type WatchOptions } from "./commands/watch";
export { runDev, type DevOptions } from "./commands/dev";
export { runBuild, type BuildOptions } from "./commands/build";
export { runPublish, type PublishOptions } from "./commands/publish";
export { runDevice, type DeviceOptions } from "./commands/device";
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 3: 커밋**

```bash
git add packages/cli/src/index.ts
git commit -m "fix(cli): index.ts에서 누락된 명령어 export 추가

- runBuild, BuildOptions export 추가
- runPublish, PublishOptions export 추가
- runDevice, DeviceOptions export 추가

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: publish.ts 중복 spawnAsync 제거

**Files:**

- Modify: `packages/cli/src/commands/publish.ts`

**Step 1: import 수정 및 spawnAsync 제거**

파일 상단의 import를 수정:

```typescript
// 기존
import { spawn } from "child_process";

// 변경
import { spawn } from "../utils/spawn";
```

그리고 55-93행의 `spawnAsync` 함수 정의를 삭제.

**Step 2: spawnAsync 호출을 spawn으로 변경**

파일 전체에서 `spawnAsync` → `spawn`으로 변경 (15곳):

- 212행, 346행, 368행, 384행, 449행, 475행, 477행, 482행, 483행, 484행, 485행, 486행, 492행, 579행

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 4: 커밋**

```bash
git add packages/cli/src/commands/publish.ts
git commit -m "fix(cli): publish.ts 중복 spawnAsync 제거

- shell: true 보안 취약점 해결
- utils/spawn.ts의 spawn 함수 재사용

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 에러 출력을 consola로 통일

**Files:**

- Modify: `packages/cli/src/commands/build.ts`
- Modify: `packages/cli/src/commands/dev.ts`
- Modify: `packages/cli/src/commands/device.ts`
- Modify: `packages/cli/src/commands/publish.ts`
- Modify: `packages/cli/src/commands/typecheck.ts`
- Modify: `packages/cli/src/commands/watch.ts`

**Step 1: build.ts 수정 (2곳)**

143행:

```typescript
// 기존
process.stderr.write(`✖ sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}\n`);
// 변경
consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
```

173행:

```typescript
// 기존
process.stderr.write(`✖ ${err instanceof Error ? err.message : err}\n`);
// 변경
consola.error(err instanceof Error ? err.message : err);
```

**Step 2: dev.ts 수정 (1곳)**

78행:

```typescript
// 기존
process.stderr.write(`✖ sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}\n`);
// 변경
consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
```

**Step 3: device.ts 수정 (5곳)**

50행, 59행, 66행, 75행, 96행, 117행 모두 동일 패턴:

```typescript
// 기존
process.stderr.write(`✖ 메시지\n`);
// 변경
consola.error(`메시지`);
```

**Step 4: publish.ts 수정 (7곳)**

282행, 353-357행, 398행, 453-457행, 496-501행, 504행, 544-549행, 553행 모두 동일 패턴.

**Step 5: typecheck.ts 수정 (1곳)**

256행:

```typescript
// 기존
process.stderr.write(`✖ ${err instanceof Error ? err.message : err}\n`);
// 변경
consola.error(err instanceof Error ? err.message : err);
```

**Step 6: watch.ts 수정 (1곳)**

78행:

```typescript
// 기존
process.stderr.write(`✖ sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}\n`);
// 변경
consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
```

**Step 7: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 8: 커밋**

```bash
git add packages/cli/src/commands/build.ts packages/cli/src/commands/dev.ts packages/cli/src/commands/device.ts packages/cli/src/commands/publish.ts packages/cli/src/commands/typecheck.ts packages/cli/src/commands/watch.ts
git commit -m "refactor(cli): 에러 출력을 consola.error로 통일

- process.stderr.write 대신 consola.error 사용
- 일관된 로깅 API로 통일

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: device.ts server 타입 가드 추가

**Files:**

- Modify: `packages/cli/src/commands/device.ts:80-86`

**Step 1: 타입 가드 추가**

80-86행을 수정:

```typescript
// 개발 서버 URL 결정
let serverUrl = url;
if (serverUrl == null) {
  if (typeof clientConfig.server === "number") {
    serverUrl = `http://localhost:${clientConfig.server}/${packageName}/capacitor/`;
  } else {
    consola.error(`--url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: ${clientConfig.server}`);
    process.exitCode = 1;
    return;
  }
} else if (!serverUrl.endsWith("/")) {
  serverUrl = `${serverUrl}/${packageName}/capacitor/`;
}
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 3: 커밋**

```bash
git add packages/cli/src/commands/device.ts
git commit -m "fix(cli): device.ts에서 server 타입 가드 추가

- server가 string(패키지명)인 경우 --url 옵션 필수로 요구
- 타입 안정성 향상

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Worker 종료 시 리소스 정리 개선

**Files:**

- Modify: `packages/cli/src/commands/watch.ts:280-289`
- Modify: `packages/cli/src/workers/watch.worker.ts:270-276`

**Step 1: watch.worker.ts에 shutdown 메시지 핸들러 추가**

`watch.worker.ts` 파일의 worker 정의 부분(270-276행) 앞에 shutdown 핸들러 추가:

```typescript
// shutdown 메시지 처리
import { parentPort } from "worker_threads";

parentPort?.on("message", async (msg: unknown) => {
  if (msg != null && typeof msg === "object" && "type" in msg && msg.type === "shutdown") {
    await cleanup();
    parentPort?.postMessage({ type: "shutdown-complete" });
  }
});
```

**Step 2: watch.ts의 Worker 종료 로직 수정**

280-289행을 수정:

```typescript
// Worker 종료 (graceful shutdown)
process.stdout.write("⏳ 종료 중...\n");

const shutdownTimeout = 3000; // 3초 타임아웃
const allWorkers = [...esbuildWorkers, ...dtsWorkers];

// 모든 워커에 shutdown 메시지 전송
for (const { worker } of allWorkers) {
  worker.postMessage({ type: "shutdown" });
}

// shutdown-complete 응답 대기 또는 타임아웃 후 terminate
await Promise.all(
  allWorkers.map(({ worker }) =>
    Promise.race([
      new Promise<void>((resolve) => {
        worker.on("message", (msg: unknown) => {
          if (msg != null && typeof msg === "object" && "type" in msg && msg.type === "shutdown-complete") {
            resolve();
          }
        });
      }),
      new Promise<void>((resolve) => setTimeout(resolve, shutdownTimeout)),
    ]).then(() => worker.terminate()),
  ),
);

process.stdout.write("✔ 완료\n");
```

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 4: 커밋**

```bash
git add packages/cli/src/commands/watch.ts packages/cli/src/workers/watch.worker.ts
git commit -m "fix(cli): Worker 종료 시 리소스 정리 개선

- shutdown 메시지 프로토콜 추가
- 워커가 cleanup 완료 후 응답하거나 3초 타임아웃 후 terminate
- esbuild context, Vite server 리소스 누수 방지

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: --options 플래그 문서화

**Files:**

- Modify: `packages/cli/src/sd-cli.ts`

**Step 1: 모든 options 설명 수정**

90행, 119행, 148행, 177행, 211행, 251행의 `description: "옵션"`을 모두 수정:

```typescript
description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 3: 커밋**

```bash
git add packages/cli/src/sd-cli.ts
git commit -m "docs(cli): --options 플래그 설명 개선

- 모든 명령어의 -o 옵션 설명을 구체적으로 변경
- 사용 예제 추가

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: 최종 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: PASS (0 errors)

**Step 2: 린트 확인**

Run: `pnpm lint packages/cli`
Expected: PASS (0 errors)

**Step 3: 모든 변경사항 확인**

Run: `git log --oneline -10`
Expected: 7개의 커밋 확인
