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

    let output = "";
    child.stdout.on("data", (d: Uint8Array) => {
      output += new TextDecoder().decode(d);
    });
    child.stderr.on("data", (d: Uint8Array) => {
      output += new TextDecoder().decode(d);
    });

    child.on("close", (code) => {
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
    const testCount = result.errorCount > 0 ? `${result.errorCount} failed` : "";
    summary = result.success ? `${icon} passed` : `${icon} ${testCount}`;
  } else {
    summary = `${icon} ${result.errorCount} errors, ${result.warningCount} warnings`;
  }

  const detail = !result.success && result.formattedOutput ? `\n${result.formattedOutput}` : "";

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
