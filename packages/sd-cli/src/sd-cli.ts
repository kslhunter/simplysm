#!/usr/bin/env node

/**
 * CLI Launcher
 *
 * .ts 실행 (개발): CPU affinity 적용 후 sd-cli-entry 직접 import
 * .js 실행 (배포): replaceDeps 실행 후 새 프로세스로 sd-cli-entry spawn
 */

import { exec, spawn } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = path.extname(__filename) === ".ts";

if (isDev) {
  // 개발 모드 (.ts): affinity 적용 후 직접 실행
  // import만으로는 메인 모듈 감지가 실패하므로 (process.argv[1] ≠ sd-cli-entry)
  // createCliParser를 명시적으로 호출한다.
  configureAffinityAndPriority(process.pid);
  const { createCliParser } = await import("./sd-cli-entry.js");
  await createCliParser(process.argv.slice(2)).parse();
} else {
  // 배포 모드 (.js): 2단계 실행

  // Phase 1: replaceDeps (inline — 설치된 버전으로 복사)
  try {
    const { loadSdConfig } = await import("./utils/sd-config.js");
    const { setupReplaceDeps } = await import("./utils/replace-deps.js");
    const sdConfig = await loadSdConfig({ cwd: process.cwd(), dev: false, opt: [] });
    if (sdConfig.replaceDeps != null) {
      await setupReplaceDeps(process.cwd(), sdConfig.replaceDeps);
    }
  } catch {
    // sd.config.ts 없거나 replaceDeps 미설정 시 스킵
  }

  // Phase 2: 새 프로세스로 실제 CLI 실행 (모듈 캐시 초기화)
  const cliEntryFilePath = path.join(__dirname, "sd-cli-entry.js");
  const child = spawn(
    "node",
    [
      "--max-old-space-size=8192",
      "--max-semi-space-size=16",
      cliEntryFilePath,
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  child.on("spawn", () => {
    if (child.pid != null) configureAffinityAndPriority(child.pid);
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

/**
 * CPU affinity mask 계산 (앞쪽 코어 제외)
 *
 * CPU 4개당 1개를 제외하고, 나머지 코어의 비트를 ON으로 설정한다.
 * 예: 8코어 → 2개 제외 → 0xFC (코어 2~7)
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
 * Cross-platform CPU affinity + priority 설정
 *
 * - Windows: PowerShell ProcessorAffinity + PriorityClass
 * - Linux/WSL: taskset + renice
 *
 * 실패해도 경고만 출력하고 CLI 동작에는 영향 없음.
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

  exec(command, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.warn("CPU affinity/priority 설정 실패:", err.message);
    }
  });
}
