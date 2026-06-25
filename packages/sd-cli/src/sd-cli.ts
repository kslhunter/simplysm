#!/usr/bin/env node

/**
 * CLI 런처
 *
 * .ts 실행 (개발): CPU affinity 적용 후 sd-cli-entry를 직접 import
 * .js 실행 (프로덕션): replaceDeps 실행 후 새 프로세스에서 sd-cli-entry 실행
 */

import { cpx, setupConsola } from "@simplysm/core-node";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger, err as errNs } from "@simplysm/core-common";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = path.extname(__filename) === ".ts";
const logger = createLogger("sd:cli");

if (isDev) {
  // 개발 모드 (.ts): affinity 적용 후 직접 실행
  // import만으로는 메인 모듈 판별이 실패하므로 (process.argv[1] ≠ sd-cli-entry)
  // createCliParser를 명시적으로 호출해야 한다.
  configureAffinityAndPriority(process.pid);
  const { createCliParser } = await import("./sd-cli-entry.js");
  await createCliParser(process.argv.slice(2)).parse();
} else {
  // Production mode (.js): two-stage execution
  setupConsola({ cli: true });

  // Phase 1: replaceDeps (인라인 — 설치된 버전으로 복사)
  // init 명령은 빈 디렉토리에서 실행되므로 sd.config.ts 사전 로드 자체를 건너뜀
  if (process.argv[2] !== "init") {
    try {
      const { loadSdConfig } = await import("./utils/sd-config.js");
      const { setupReplaceDeps } = await import("./deps/replace-deps/replace-deps.js");
      const sdConfig = await loadSdConfig({ cwd: process.cwd(), dev: false, opt: [] });
      if (process.argv[2] !== "replace-deps" && sdConfig.replaceDeps != null) {
        await setupReplaceDeps(process.cwd(), sdConfig.replaceDeps);
      }
    } catch (err: unknown) {
      // sd.config.ts가 없거나 replaceDeps가 설정되지 않으면 건너뜀
      const code = err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
      if (code !== "MODULE_NOT_FOUND" && code !== "ERR_MODULE_NOT_FOUND") {
        logger.warn("replaceDeps 사전 설정 실패:", errNs.message(err));
      }
    }
  }

  // Phase 2: 실제 CLI를 새 프로세스로 실행 (모듈 캐시 초기화)
  const cliEntryFilePath = path.join(__dirname, "sd-cli-entry.js");
  const subprocess = cpx.spawn(
    "node",
    [
      "--max-old-space-size=8192",
      "--max-semi-space-size=16",
      cliEntryFilePath,
      ...process.argv.slice(2),
    ],
    { stdio: "inherit", reject: false },
  );
  if (subprocess.pid != null) configureAffinityAndPriority(subprocess.pid);
  const result = await subprocess;
  process.exitCode = result.exitCode;
}

/**
 * CPU affinity 마스크 계산 (앞쪽 코어 제외)
 *
 * CPU 4개당 1개 코어를 제외하고, 나머지 코어의 비트를 ON으로 설정한다.
 * 예시: 8코어 → 2개 제외 → 0xFC (코어 2~7)
 */
function calculateAffinityMask(cpuCount: number): string {
  const exclude = cpuCount <= 1 ? 0 : Math.ceil(cpuCount / 4);
  let mask = 0n;
  for (let i = exclude; i < cpuCount; i++) {
    mask |= 1n << BigInt(i);
  }
  return "0x" + mask.toString(16).toUpperCase();
}

/**
 * CPU affinity 및 우선순위 설정 (크로스 플랫폼)
 *
 * - Windows: PowerShell ProcessorAffinity + PriorityClass
 * - Linux/WSL: taskset + renice
 *
 * 실패 시 경고만 출력하며, CLI 동작에는 영향을 주지 않는다.
 */
function configureAffinityAndPriority(pid: number): void {
  const cpuCount = os.cpus().length;
  const mask = calculateAffinityMask(cpuCount);

  let command: string;
  if (process.platform === "win32") {
    const commands = [
      `$p = Get-Process -Id ${pid}`,
      `$p.ProcessorAffinity = ${mask}`,
      `$p.PriorityClass = 'BelowNormal'`,
    ].join("; ");
    command = `powershell -Command "${commands}"`;
  } else {
    command = `taskset -p ${mask} ${pid} && renice +10 -p ${pid}`;
  }

  cpx.spawn(command, [], { shell: true }).catch((err: unknown) => {
    logger.warn(
      "CPU affinity/priority 설정 실패:",
      errNs.message(err),
    );
  });
}
