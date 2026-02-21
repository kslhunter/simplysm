# Lint Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** lint를 별도 worker 스레드에서 실행하여 빌드와 진정한 CPU 코어 병렬 실행 달성

**Architecture:** 기존 빌드 worker 패턴(`createWorker` + `Worker.create`)을 그대로 따라 `lint.worker.ts`를 생성하고, `BuildOrchestrator`에서 메인 스레드 직접 호출 대신 worker를 통해 lint를 실행한다.

**Tech Stack:** `@simplysm/core-node` Worker (Node.js `worker_threads`), ESLint

---

### Task 1: lint.worker.ts 생성

**Files:**
- Create: `packages/sd-cli/src/workers/lint.worker.ts`

**Step 1: Worker 파일 생성**

기존 worker 패턴(예: `dts.worker.ts`)을 따르되, lint는 이벤트 없는 단순 worker이므로 최소한으로 작성.

```typescript
import { createWorker } from "@simplysm/core-node";
import { runLint, type LintOptions } from "../commands/lint";

//#region Worker

/**
 * Lint worker.
 * BuildOrchestrator에서 lint를 별도 스레드로 실행하기 위한 워커.
 */
async function lint(options: LintOptions): Promise<boolean> {
  await runLint(options);
  return process.exitCode === 1;
}

export default createWorker({ lint });

//#endregion
```

핵심:
- `runLint()`는 수정 없이 그대로 호출
- `process.exitCode`는 worker 스레드 내에서만 유효 → `boolean`으로 변환하여 반환
- stdout/stderr는 `createWorker` 내부에서 `process.stdout.write`를 가로채 메인 스레드로 전달하므로 출력 정상 동작

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

---

### Task 2: BuildOrchestrator에서 lint worker 사용

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts`

**Step 1: import 변경**

기존 `runLint` 직접 import를 worker type import로 교체.

```typescript
// 삭제:
import { runLint, type LintOptions } from "../commands/lint";

// 추가:
import type { LintOptions } from "../commands/lint";
import type * as LintWorkerModule from "../workers/lint.worker";
```

**Step 2: lintTask를 worker로 변경**

`BuildOrchestrator.start()` 메서드 내의 lint 관련 코드 수정.

Worker 경로 추가 (line ~222, 기존 worker 경로 선언부 근처):
```typescript
const lintWorkerPath = import.meta.resolve("../workers/lint.worker");
```

lintTask 변경 (line ~452-459):
```typescript
// 기존:
const lintTask = async (): Promise<void> => {
  await runLint(lintOptions);
  // lint 에러가 있으면 process.exitCode가 1로 설정됨
  if (process.exitCode === 1) {
    state.hasError = true;
  }
};

// 변경:
const lintWorker = Worker.create<typeof LintWorkerModule>(lintWorkerPath);
const lintTask = async (): Promise<void> => {
  try {
    const hasError = await lintWorker.lint(lintOptions);
    if (hasError) state.hasError = true;
  } finally {
    await lintWorker.terminate();
  }
};
```

**Step 3: typecheck 확인**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 4: lint 확인**

Run: `pnpm lint packages/sd-cli`
Expected: PASS (unused import `runLint` 제거 확인)

---

### Task 3: 빌드 동작 검증

**Step 1: sd-cli 패키지 빌드**

Run: `pnpm build sd-cli`
Expected: PASS — lint와 빌드가 병렬로 실행되며 정상 완료

**Step 2: 커밋**

```bash
git add packages/sd-cli/src/workers/lint.worker.ts packages/sd-cli/src/orchestrators/BuildOrchestrator.ts
git commit -m "feat(sd-cli): run lint in worker thread for true parallel execution"
```
