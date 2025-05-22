#!/usr/bin/env node

/* eslint-disable no-console */

import { exec, spawn } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// CLI 경로 확인
const cliPath = import.meta.resolve("./sd-cli-entry");

if (path.extname(cliPath) === ".ts") {
  // .ts 바로실행 (개발)

  // 현재 프로세스에 affinity 적용
  configureProcessorAffinity(process.pid);

  await import(cliPath);
} else {
  // .js 번들 실행 (배포본)

  // 로컬 업데이트
  if (!process.argv.slice(2).includes("local-update")) {
    await spawnWaitAsync(`node`, [
      "--import=specifier-resolution-node/register",
      fileURLToPath(cliPath),
      "local-update",
    ]);
  }

  // 프로세스 실행
  const child = spawn(
    "node",
    [
      "--import=specifier-resolution-node/register",
      fileURLToPath(cliPath),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );

  // 실행된 프로세스에 Affinity 적용
  child.on("spawn", () => {
    if (child.pid == null) return;
    configureProcessorAffinity(child.pid);
  });
}

function configureProcessorAffinity(pid: number) {
  // 논리 CPU 수 기반 affinity mask 계산 (전체 - 1)
  const cpuCount = os.cpus().length;
  const affinityMask = calculateAffinityMask(cpuCount);

  const command = `powershell -Command "$p = Get-Process -Id ${pid}; $p.ProcessorAffinity = ${affinityMask}"`;

  exec(command, (err) => {
    if (err) {
      console.error("Affinity 설정 실패:", err.message);
    }
  });
}

// ProcessorAffinity 마스크 계산
function calculateAffinityMask(cpuCount: number): string {
  const exclude = cpuCount <= 1 ? 0 : Math.ceil(cpuCount / 12); // 12개당 1개씩 뺌
  const usable = cpuCount - exclude;

  if (usable <= 0) {
    throw new Error(`CPU 사용 가능 개수가 0 이하입니다 (총: ${cpuCount}, 제외: ${exclude})`);
  }

  const maskValue = (1 << usable) - 1;
  return "0x" + maskValue.toString(16).toUpperCase();
}

async function spawnWaitAsync(command: string, args: string[]) {
  await new Promise<void>((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "inherit",
    });

    child.on("close", () => {
      resolve();
    });
  });
}
