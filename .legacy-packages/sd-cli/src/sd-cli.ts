#!/usr/bin/env node

import { exec, spawn } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// CLI 경로 확인
const cliPath = import.meta.resolve("./sd-cli-entry");

if (path.extname(cliPath) === ".ts") {
  // .ts 바로실행 (개발)

  // 현재 프로세스에 affinity 적용
  configureProcessorAffinityAndPriority(process.pid);

  await import(cliPath);
} else {
  // .js 번들 실행 (배포본)

  // 로컬 업데이트
  // if (process.argv.slice(2).includes("watch") && !process.argv.slice(2).includes("--noEmit")) {
  if (!process.argv.slice(2).includes("local-update")) {
    await spawnWaitAsync(`node`, [
      "--import=specifier-resolution-node/register",
      fileURLToPath(cliPath),
      "local-update",
    ]);
  }
  // }

  // 프로세스 실행
  const child = spawn(
    "node",
    [
      "--import=specifier-resolution-node/register",
      "--max-old-space-size=8192",
      // "--initial-old-space-size=2048",
      "--max-semi-space-size=16", //128
      // "--stack-size=16384",
      fileURLToPath(cliPath),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );

  // 실행된 프로세스에 Affinity 적용
  child.on("spawn", () => {
    if (child.pid == null) return;
    configureProcessorAffinityAndPriority(child.pid);
  });
}

function configureProcessorAffinityAndPriority(pid: number) {
  const cpuCount = os.cpus().length;
  const affinityMask = calculateAffinityMask(cpuCount);

  const commands = [
    `$p = Get-Process -Id ${pid}`,
    `$p.ProcessorAffinity = ${affinityMask}`,
    `$p.PriorityClass = 'BelowNormal'`,
  ].join("; ");

  const command = `powershell -Command "${commands}"`;

  exec(command, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("Affinity 또는 우선순위 설정 실패:", err.message);
    }
  });
}

// ProcessorAffinity 마스크 계산 (앞 코어 빼기)
function calculateAffinityMask(cpuCount: number): string {
  const exclude = cpuCount <= 1 ? 0 : Math.ceil(cpuCount / 4); // 예: 4개당 1개 제외
  const usableStart = exclude;
  const usableEnd = cpuCount;

  if (usableEnd - usableStart <= 0) {
    throw new Error(`CPU 사용 가능 개수가 0 이하입니다 (총: ${cpuCount}, 제외: ${exclude})`);
  }

  let mask = 0n;

  for (let i = usableStart; i < usableEnd; i++) {
    mask |= 1n << BigInt(i);
  }

  return "0x" + mask.toString(16).toUpperCase();
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
