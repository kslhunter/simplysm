#!/usr/bin/env node
import { spawn } from "node:child_process";
import { env } from "@simplysm/core-common";
import { buildClaudeInvocation, buildCommandProcessorSpawn } from "./invocation";

const invocation = buildClaudeInvocation(process.argv.slice(2));

// 자식 프로세스는 현재 프로세스의 환경 변수를 그대로 물려받는다.
for (const [key, value] of Object.entries(invocation.env)) {
  env(key, value);
}

// claude 는 대화형 TUI 이므로 표준 입출력을 그대로 물려준다.
const spawnSpec = buildCommandProcessorSpawn("claude", invocation.args);
const child = spawn(spawnSpec.command, spawnSpec.args, {
  ...spawnSpec.options,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
