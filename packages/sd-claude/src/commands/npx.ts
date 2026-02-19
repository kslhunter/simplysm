/**
 * 크로스플랫폼 npx 래퍼.
 * Windows에서는 npx.cmd, 그 외에서는 npx를 실행한다.
 */
import { spawn } from "child_process";

export function runNpx(args: string[]): void {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";

  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}
