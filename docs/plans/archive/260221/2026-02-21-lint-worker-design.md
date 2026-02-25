# Lint Worker Design

## Problem

`BuildOrchestrator`에서 lint와 build를 `Promise.allSettled`로 병렬 실행하지만,
lint(`runLint()`)는 메인 스레드에서 직접 실행되어 CPU-bound ESLint 작업이 메인 스레드를 점유한다.
빌드 worker들은 `worker_threads`로 별도 코어에서 실행되지만, lint는 진정한 병렬이 아님.

## Solution

기존 빌드 worker 패턴을 그대로 따라 `lint.worker.ts`를 생성하고,
`BuildOrchestrator`에서만 worker를 통해 lint를 실행한다.

### Scope

- `BuildOrchestrator`에서만 worker 사용
- `sd lint` 단독 CLI 실행은 현재처럼 메인 스레드 유지

### Changes

**1. New: `packages/sd-cli/src/workers/lint.worker.ts`**

```typescript
import { createWorker } from "@simplysm/core-node";
import { runLint, type LintOptions } from "../commands/lint";

export default createWorker({
  lint: async (options: LintOptions): Promise<boolean> => {
    await runLint(options);
    return process.exitCode === 1;
  },
});
```

**2. Modify: `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts`**

```typescript
// Before
const lintTask = async (): Promise<void> => {
  await runLint(lintOptions);
  if (process.exitCode === 1) { state.hasError = true; }
};

// After
const lintWorker = Worker.create<typeof LintWorkerModule>(lintWorkerPath);
const lintTask = async (): Promise<void> => {
  const hasError = await lintWorker.lint(lintOptions);
  if (hasError) state.hasError = true;
  await lintWorker.terminate();
};
```

### Notes

- `runLint()` 자체는 수정 불필요
- `process.exitCode`는 worker 스레드 내에서만 유효 → 반환값(`boolean`)으로 변환
- stdout/stderr는 `WorkerInternal`이 메인 프로세스로 pipe 중이므로 출력 그대로 동작
