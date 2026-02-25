#!/usr/bin/env node

/**
 * CLI Launcher
 *
 * .ts execution (dev): apply CPU affinity then directly import sd-cli-entry
 * .js execution (production): run replaceDeps then spawn sd-cli-entry in new process
 */

import { execa } from "execa";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = path.extname(__filename) === ".ts";

if (isDev) {
  // Dev mode (.ts): apply affinity then run directly
  // Main module detection fails with import only (process.argv[1] ≠ sd-cli-entry)
  // so createCliParser must be called explicitly.
  configureAffinityAndPriority(process.pid);
  const { createCliParser } = await import("./sd-cli-entry.js");
  await createCliParser(process.argv.slice(2)).parse();
} else {
  // Production mode (.js): two-stage execution

  // Phase 1: replaceDeps (inline — copy to installed version)
  try {
    const { loadSdConfig } = await import("./utils/sd-config.js");
    const { setupReplaceDeps } = await import("./utils/replace-deps.js");
    const sdConfig = await loadSdConfig({ cwd: process.cwd(), dev: false, opt: [] });
    if (sdConfig.replaceDeps != null) {
      await setupReplaceDeps(process.cwd(), sdConfig.replaceDeps);
    }
  } catch {
    // Skip if sd.config.ts is missing or replaceDeps is not configured
  }

  // Phase 2: Run actual CLI in new process (reset module cache)
  const cliEntryFilePath = path.join(__dirname, "sd-cli-entry.js");
  const subprocess = execa(
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
  process.exitCode = result.exitCode ?? 0;
}

/**
 * Calculate CPU affinity mask (exclude front cores)
 *
 * Exclude 1 core per 4 CPUs, then set bits ON for remaining cores.
 * Example: 8 cores → exclude 2 → 0xFC (cores 2~7)
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
 * Configure CPU affinity and priority (cross-platform)
 *
 * - Windows: PowerShell ProcessorAffinity + PriorityClass
 * - Linux/WSL: taskset + renice
 *
 * Only print warning on failure; does not affect CLI operation.
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

  execa({ shell: true })`${command}`.catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.warn("Failed to configure CPU affinity/priority:", err.message);
  });
}
