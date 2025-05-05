#!/usr/bin/env node

// import { spawn } from "node:child_process";
// import { fileURLToPath } from "node:url";
// import { dirname, join } from "node:path";
//
// const __dirname = dirname(fileURLToPath(import.meta.url));
// const cliPath = join(__dirname, "../dist/sd-cli.js");
//
// spawn("node", ["--import=specifier-resolution-node/register", cliPath, ...process.argv.slice(2)], {
//   stdio: "inherit"
// });

import { ChildProcess, exec, spawn } from "child_process";
import { fileURLToPath } from "node:url";
import os from "os";
import path from "path";


const cpuCount = os.cpus().length; // 논리 CPU 수
const affinityMaskDecimal = Math.pow(2, cpuCount) - 2; // 전체 - 1
const affinityMask = "0x" + affinityMaskDecimal.toString(16).toUpperCase();

// console.log(`Logical CPU Count: ${cpuCount}`);
// console.log(`Affinity Mask (전체 - 1): ${affinityMask}`);

// CLI 실행
let child: ChildProcess;

const cliPath = fileURLToPath(import.meta.resolve("./sd-cli-entry"));

if (path.extname(cliPath) === ".ts") {
  child = spawn(
    "yarn",
    ["tsx", cliPath, ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env },
    },
  );
}
else {
  child = spawn(
    "node",
    ["--import=specifier-resolution-node/register", cliPath, ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
}


child.on("spawn", () => {
  const pid = child.pid;

  const psCommand = `$p = Get-Process -Id ${pid}; $p.ProcessorAffinity = ${affinityMask}`;
  const command = `powershell -Command "${psCommand}"`;

  exec(command, (err) => {
    if (err) {
      console.error("Failed to set affinity:", err.message);
    }
    else {
      console.log(`Affinity set to ${affinityMask} for PID ${pid}`);
    }
  });
});

child.on("exit", (code) => {
  console.log(`CLI exited with code ${code}`);
});
