# CLI `check` 명령 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `sd check [targets..] [--type typecheck,lint,test]` 명령을 추가하여 typecheck, lint, test를 병렬 실행하고 결과를 통합 출력한다.

**Architecture:** `typecheck.ts`와 `lint.ts`에서 핵심 실행 로직을 `executeTypecheck()`/`executeLint()` 함수로 분리한다. `check.ts`에서 이들을 Worker/Promise.all로 병렬 실행하고, vitest는 subprocess로 실행한다. 결과를 `CheckResult` 타입으로 수집하여 섹션별로 출력한다.

**Tech Stack:** TypeScript, Worker threads (`@simplysm/core-node`), child_process (vitest), yargs (CLI)

---

### Task 1: `executeLint()` 추출 (lint.ts 리팩토링)

**Files:**
- Modify: `packages/sd-cli/src/commands/lint.ts`
- Test: `packages/sd-cli/tests/run-lint.spec.ts`

**Step 1: Write the failing test**

`packages/sd-cli/tests/run-lint.spec.ts`의 기존 테스트 파일 끝에 추가:

```typescript
describe("executeLint", () => {
  it("에러가 없으면 성공 결과를 반환", async () => {
    const { executeLint } = await import("../src/commands/lint");

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];
    vi.mocked(fsGlob).mockResolvedValue(["/project/packages/core-common/src/index.ts"]);
    vi.mocked(fsExists).mockResolvedValue(false); // stylelint 설정 없음

    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it("에러가 있으면 실패 결과를 반환", async () => {
    const { executeLint } = await import("../src/commands/lint");

    mockState.lintResults = [{ errorCount: 2, warningCount: 1 }];
    vi.mocked(fsGlob).mockResolvedValue(["/project/packages/core-common/src/index.ts"]);
    vi.mocked(fsExists).mockResolvedValue(false);

    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/run-lint.spec.ts --project=node --run`
Expected: FAIL — `executeLint` is not exported

**Step 3: Write minimal implementation**

`lint.ts`에서 `runLint()` 로직을 분리:

1. `LintResult` 인터페이스 추가 (Types region):
```typescript
export interface LintResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}
```

2. `executeLint()` 함수 추출 (Main region):
- `runLint()`의 ESLint/Stylelint 실행 + 결과 집계 로직을 그대로 가져옴
- stdout 출력 대신 `formattedOutput` 문자열로 결과를 모아서 반환
- `process.exitCode` 설정하지 않음 (호출자가 판단)
- consola 로깅은 유지 (Worker thread에서 실행될 때 stderr로 가므로 문제없음)

3. `runLint()`를 `executeLint()` 호출 + stdout 출력 + exitCode 설정 래퍼로 변환

핵심 변경 — `executeLint()`:
```typescript
export async function executeLint(options: LintOptions): Promise<LintResult> {
  // ... (기존 runLint의 ESLint/Stylelint 실행 로직 그대로)
  // 마지막에 formattedOutput 조립하여 LintResult 반환
}
```

핵심 변경 — `runLint()` 래퍼:
```typescript
export async function runLint(options: LintOptions): Promise<void> {
  const result = await executeLint(options);
  if (result.formattedOutput) {
    process.stdout.write(result.formattedOutput);
  }
  if (!result.success) {
    process.exitCode = 1;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/run-lint.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/commands/lint.ts packages/sd-cli/tests/run-lint.spec.ts
git commit -m "refactor(sd-cli): extract executeLint from runLint"
```

---

### Task 2: `executeTypecheck()` 추출 (typecheck.ts 리팩토링)

**Files:**
- Modify: `packages/sd-cli/src/commands/typecheck.ts`
- Test: `packages/sd-cli/tests/run-typecheck.spec.ts`

**Step 1: Write the failing test**

`packages/sd-cli/tests/run-typecheck.spec.ts`의 기존 테스트 파일 끝에 추가:

```typescript
describe("executeTypecheck", () => {
  it("에러가 없으면 성공 결과를 반환", async () => {
    const { executeTypecheck } = await import("../src/commands/typecheck");

    // 기존 테스트의 mock setup 패턴 재사용
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: { compilerOptions: {} } });
    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      fileNames: [path.resolve(cwd, "packages/core-common/src/index.ts")],
      options: {},
      errors: [],
    } as never);

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/run-typecheck.spec.ts --project=node --run`
Expected: FAIL — `executeTypecheck` is not exported

**Step 3: Write minimal implementation**

`typecheck.ts`에서 `runTypecheck()` 로직을 분리:

1. `TypecheckResult` 인터페이스 추가 (Types region):
```typescript
export interface TypecheckResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}
```

2. `executeTypecheck()` 함수 추출 (Main region):
- `runTypecheck()`의 tsconfig 로드 → 패키지 추출 → Worker 실행 → 결과 수집 로직을 그대로 가져옴
- `ts.formatDiagnosticsWithColorAndContext()` 결과를 `formattedOutput`에 저장
- `process.exitCode` 설정하지 않음
- consola 로깅은 유지

3. `runTypecheck()`를 `executeTypecheck()` 호출 + stdout 출력 + exitCode 설정 래퍼로 변환

핵심 변경 — `executeTypecheck()`:
```typescript
export async function executeTypecheck(options: TypecheckOptions): Promise<TypecheckResult> {
  // ... (기존 runTypecheck의 Worker 기반 실행 로직 그대로)
  // 마지막에 formattedOutput 조립하여 TypecheckResult 반환
}
```

핵심 변경 — `runTypecheck()` 래퍼:
```typescript
export async function runTypecheck(options: TypecheckOptions): Promise<void> {
  const result = await executeTypecheck(options);
  if (result.formattedOutput) {
    process.stdout.write(result.formattedOutput);
  }
  if (!result.success) {
    process.exitCode = 1;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/run-typecheck.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/commands/typecheck.ts packages/sd-cli/tests/run-typecheck.spec.ts
git commit -m "refactor(sd-cli): extract executeTypecheck from runTypecheck"
```

---

### Task 3: lint.worker.ts 업데이트

**Files:**
- Modify: `packages/sd-cli/src/workers/lint.worker.ts`

**Step 1: Write the failing test**

lint.worker는 Worker thread로 실행되므로 직접 유닛테스트 불가. Task 5의 통합 테스트에서 검증.

**Step 2: Skip (no standalone test)**

**Step 3: Write minimal implementation**

`lint.worker.ts`를 `executeLint()`를 사용하도록 수정:

```typescript
import { createWorker } from "@simplysm/core-node";
import { executeLint, type LintOptions, type LintResult } from "../commands/lint";

//#region Worker

/**
 * Lint worker.
 * check 명령과 BuildOrchestrator에서 lint를 별도 스레드로 실행하기 위한 워커.
 */
async function lint(options: LintOptions): Promise<LintResult> {
  return await executeLint(options);
}

export default createWorker({ lint });

//#endregion
```

**주의:** `lint()` 반환 타입이 `boolean` → `LintResult`로 변경됨. `BuildOrchestrator.ts`에서 사용하는 부분도 업데이트 필요.

`packages/sd-cli/src/orchestrators/BuildOrchestrator.ts:450-456` 수정:
```typescript
const lintTask = async (): Promise<void> => {
  try {
    const result = await lintWorker.lint(lintOptions);
    if (!result.success) state.hasError = true;
  } finally {
    await lintWorker.terminate();
  }
};
```

**Step 4: Run existing tests**

Run: `pnpm vitest packages/sd-cli/tests/ --project=node --run`
Expected: PASS (기존 테스트 모두 통과)

**Step 5: Commit**

```bash
git add packages/sd-cli/src/workers/lint.worker.ts packages/sd-cli/src/orchestrators/BuildOrchestrator.ts
git commit -m "refactor(sd-cli): update lint worker to return LintResult"
```

---

### Task 4: `check.ts` 명령 생성 + CLI 등록

**Files:**
- Create: `packages/sd-cli/src/commands/check.ts`
- Modify: `packages/sd-cli/src/sd-cli-entry.ts`
- Modify: `package.json` (root)
- Test: `packages/sd-cli/tests/sd-cli.spec.ts`

**Step 1: Write the failing test**

`packages/sd-cli/tests/sd-cli.spec.ts`에 추가 — mock 등록과 테스트:

파일 상단 mock 추가:
```typescript
vi.mock("../src/commands/check", () => ({
  runCheck: vi.fn(),
}));
```

import 추가:
```typescript
import { runCheck } from "../src/commands/check";
```

beforeEach에 추가:
```typescript
vi.mocked(runCheck).mockResolvedValue(undefined);
```

테스트 추가:
```typescript
describe("check 명령어", () => {
  it("check 명령어가 올바른 옵션으로 runCheck를 호출", async () => {
    await createCliParser(["check", "packages/core-common", "--type", "typecheck,lint"]).parse();

    expect(runCheck).toHaveBeenCalledWith({
      targets: ["packages/core-common"],
      types: ["typecheck", "lint"],
    });
  });

  it("check 명령어에 targets 없이 실행 가능", async () => {
    await createCliParser(["check"]).parse();

    expect(runCheck).toHaveBeenCalledWith({
      targets: [],
      types: ["typecheck", "lint", "test"],
    });
  });

  it("check 명령어의 --type 옵션으로 단일 타입 지정", async () => {
    await createCliParser(["check", "--type", "test"]).parse();

    expect(runCheck).toHaveBeenCalledWith({
      targets: [],
      types: ["test"],
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/sd-cli.spec.ts --project=node --run`
Expected: FAIL — `check` 명령이 없으므로 "Unknown argument" 에러

**Step 3: Write minimal implementation**

**A. `packages/sd-cli/src/commands/check.ts` 생성:**

```typescript
import { spawn as cpSpawn } from "child_process";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import { executeTypecheck, type TypecheckResult } from "./typecheck";
import type { LintResult } from "./lint";
import type * as LintWorkerModule from "../workers/lint.worker";
import { consola } from "consola";

//#region Types

export type CheckType = "typecheck" | "lint" | "test";

export interface CheckOptions {
  targets: string[];
  types: CheckType[];
}

interface CheckResult {
  name: string;
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}

//#endregion

//#region Utilities

function spawnVitest(targets: string[]): Promise<CheckResult> {
  return new Promise((resolve) => {
    const args = ["vitest", ...targets, "--run"];
    const child = cpSpawn("pnpm", args, {
      cwd: process.cwd(),
      shell: true,
      stdio: "pipe",
    });

    const chunks: Buffer[] = [];
    child.stdout?.on("data", (d: Buffer) => chunks.push(d));
    child.stderr?.on("data", (d: Buffer) => chunks.push(d));

    child.on("close", (code) => {
      const output = Buffer.concat(chunks).toString("utf8");
      const testCountMatch =
        output.match(/(\d+)\s+tests?\s+passed/i) ??
        output.match(/Tests\s+(\d+)\s+passed/i) ??
        output.match(/(\d+)\s+pass/i);
      const testCount = testCountMatch ? Number(testCountMatch[1]) : 0;
      const failMatch =
        output.match(/(\d+)\s+tests?\s+failed/i) ??
        output.match(/Tests\s+(\d+)\s+failed/i) ??
        output.match(/(\d+)\s+fail/i);
      const failCount = failMatch ? Number(failMatch[1]) : 0;

      resolve({
        name: "TEST",
        success: code === 0,
        errorCount: failCount,
        warningCount: 0,
        formattedOutput: code === 0 ? "" : output,
      });
    });

    child.on("error", (err) => {
      resolve({
        name: "TEST",
        success: false,
        errorCount: 1,
        warningCount: 0,
        formattedOutput: err.message,
      });
    });
  });
}

function formatSection(result: CheckResult): string {
  const header = `\n${"=".repeat(6)} ${result.name} ${"=".repeat(6)}`;
  const icon = result.success ? "✔" : "✖";

  let summary: string;
  if (result.name === "TEST") {
    const testCount = result.errorCount > 0
      ? `${result.errorCount} failed`
      : "";
    summary = result.success
      ? `${icon} passed`
      : `${icon} ${testCount}`;
  } else {
    summary = `${icon} ${result.errorCount} errors, ${result.warningCount} warnings`;
  }

  const detail = !result.success && result.formattedOutput
    ? `\n${result.formattedOutput}`
    : "";

  return `${header}\n${summary}${detail}`;
}

//#endregion

//#region Main

export async function runCheck(options: CheckOptions): Promise<void> {
  const { targets, types } = options;
  const logger = consola.withTag("sd:cli:check");

  logger.debug("check 시작", { targets, types });

  const tasks: Promise<CheckResult>[] = [];

  // Typecheck
  if (types.includes("typecheck")) {
    tasks.push(
      executeTypecheck({ targets, options: [] }).then(
        (r: TypecheckResult): CheckResult => ({
          name: "TYPECHECK",
          success: r.success,
          errorCount: r.errorCount,
          warningCount: r.warningCount,
          formattedOutput: r.formattedOutput,
        }),
      ),
    );
  }

  // Lint (Worker thread)
  if (types.includes("lint")) {
    const lintWorkerPath = import.meta.resolve("../workers/lint.worker");
    const lintWorker: WorkerProxy<typeof LintWorkerModule> =
      Worker.create<typeof LintWorkerModule>(lintWorkerPath);

    tasks.push(
      lintWorker
        .lint({ targets, fix: true, timing: false })
        .then(
          (r: LintResult): CheckResult => ({
            name: "LINT",
            success: r.success,
            errorCount: r.errorCount,
            warningCount: r.warningCount,
            formattedOutput: r.formattedOutput,
          }),
        )
        .finally(() => lintWorker.terminate()),
    );
  }

  // Test (subprocess)
  if (types.includes("test")) {
    tasks.push(spawnVitest(targets));
  }

  logger.start(`check 실행 중... (${types.join(", ")})`);
  const results = await Promise.allSettled(tasks);
  logger.success("check 실행 완료");

  // 결과 수집
  const checkResults: CheckResult[] = results.map((r) => {
    if (r.status === "fulfilled") return r.value;
    return {
      name: "UNKNOWN",
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  // 섹션별 출력 (typecheck → lint → test 순서 보장)
  const order = ["TYPECHECK", "LINT", "TEST"];
  checkResults.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  for (const result of checkResults) {
    process.stdout.write(formatSection(result));
  }

  // SUMMARY
  const failed = checkResults.filter((r) => !r.success);
  const totalErrors = checkResults.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = checkResults.reduce((sum, r) => sum + r.warningCount, 0);

  process.stdout.write(`\n\n${"=".repeat(6)} SUMMARY ${"=".repeat(6)}\n`);

  if (failed.length === 0) {
    process.stdout.write(`✔ ALL PASSED\n`);
  } else {
    const failedNames = failed.map((r) => r.name.toLowerCase()).join(", ");
    process.stdout.write(`✖ ${failed.length}/${checkResults.length} FAILED (${failedNames})\n`);
  }
  process.stdout.write(`Total: ${totalErrors} errors, ${totalWarnings} warnings\n`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

//#endregion
```

**B. `packages/sd-cli/src/sd-cli-entry.ts` 수정:**

상단 import 추가:
```typescript
import { runCheck } from "./commands/check";
```

`.demandCommand(1, ...)` 직전에 check 명령 추가:
```typescript
    .command(
      "check [targets..]",
      "Typecheck, Lint, Test를 병렬로 실행한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "체크할 경로 (예: packages/core-common, tests/orm)",
            default: [],
          })
          .options({
            type: {
              type: "string",
              describe: "실행할 체크 타입 (쉼표 구분: typecheck,lint,test)",
              default: "typecheck,lint,test",
            },
          }),
      async (args) => {
        await runCheck({
          targets: args.targets,
          types: args.type.split(",").map((t) => t.trim()) as CheckType[],
        });
      },
    )
```

상단 import에 `CheckType` 추가:
```typescript
import { runCheck, type CheckType } from "./commands/check";
```

**C. `package.json` (root) scripts에 추가:**

```json
"check": "pnpm _sd-cli_ check",
```

`"lint"` 스크립트 바로 뒤에 추가.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/sd-cli.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/commands/check.ts packages/sd-cli/src/sd-cli-entry.ts package.json
git commit -m "feat(sd-cli): add check command for parallel typecheck+lint+test"
```

---

### Task 5: sd-check 스킬 업데이트

**Files:**
- Modify: `.claude/skills/sd-check/SKILL.md`
- Modify: `.claude/skills/sd-check/run-checks.mjs`

**Step 1: No test needed** (스킬 문서/스크립트 변경)

**Step 2: Skip**

**Step 3: Write implementation**

`SKILL.md`의 Step 1에서 `run-checks.mjs` 대신 `pnpm check` 사용:
- `node .claude/skills/sd-check/run-checks.mjs [path] [type]` → `pnpm check [path] [--type type]`
- `run-checks.mjs`는 당분간 유지 (하위호환)

`SKILL.md` allowed-tools 업데이트:
```yaml
allowed-tools: Bash(pnpm check), Bash(pnpm typecheck), Bash(pnpm lint --fix), Bash(pnpm vitest)
```

**Step 4: 수동 확인**

`pnpm check` 명령을 직접 실행하여 출력 형식 확인.

**Step 5: Commit**

```bash
git add .claude/skills/sd-check/SKILL.md
git commit -m "docs(sd-check): update skill to use pnpm check command"
```
