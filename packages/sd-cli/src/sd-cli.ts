#!/usr/bin/env node

import { exec, spawn } from "child_process";
import { fileURLToPath } from "node:url";
import os from "os";
import path from "path";

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

// 논리 CPU 수 기반 affinity mask 계산 (전체 - 1)
const cpuCount = os.cpus().length;
const affinityMask = calculateAffinityMask(cpuCount);

// CLI 경로 확인
const cliPath = import.meta.resolve("./sd-cli-entry");

if (path.extname(cliPath) === ".ts") {
  // 현재 프로세스에 affinity 적용
  const pid = process.pid;
  const command = `powershell -Command "$p = Get-Process -Id ${pid}; $p.ProcessorAffinity = ${affinityMask}"`;

  exec(command, (err) => {
    if (err) {
      console.error("Affinity 설정 실패:", err.message);
    }
  });

  await import(cliPath);
}
else {
  // .js 등의 번들 실행
  const child = spawn(
    "node",
    [
      "--import=specifier-resolution-node/register",
      fileURLToPath(cliPath),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );

  child.on("spawn", () => {
    const pid = child.pid;
    const command = `powershell -Command "$p = Get-Process -Id ${pid}; $p.ProcessorAffinity = ${affinityMask}"`;

    exec(command, (err) => {
      if (err) {
        console.error("Affinity 설정 실패:", err.message);
      }
    });
  });
}