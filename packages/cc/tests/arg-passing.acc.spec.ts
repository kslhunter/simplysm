import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildClaudeInvocation, buildCommandProcessorSpawn } from "../src/invocation";

/**
 * cc 가 claude 를 띄울 때와 같은 방식으로 자식 프로세스를 실행해,
 * 인자가 원래 값 그대로 도달하는지 왕복 확인한다.
 */
function spawnAndEchoArgs(args: string[]): Promise<string[]> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-args-"));
  const script = path.join(dir, "echo-args.mjs");
  fs.writeFileSync(script, "process.stdout.write(JSON.stringify(process.argv.slice(2)));");

  const spawnSpec = buildCommandProcessorSpawn(process.execPath, [script, ...args]);

  return new Promise((resolve, reject) => {
    const child = spawn(spawnSpec.command, spawnSpec.args, spawnSpec.options);

    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf-8")));
    child.on("error", reject);
    child.on("exit", () => {
      fs.rmSync(dir, { recursive: true, force: true });
      try {
        resolve(JSON.parse(stdout) as string[]);
      } catch (err) {
        reject(new Error(`자식 프로세스 출력 파싱 실패: ${stdout}`, { cause: err }));
      }
    });
  });
}

describe("command processor invocation", () => {
  it("does not hand arguments to a shell, so node raises no escaping deprecation", () => {
    const spawnSpec = buildCommandProcessorSpawn("claude", ["--tools", "Read,Edit"]);

    expect(spawnSpec.options.shell).toBeUndefined();
    expect(spawnSpec.options.windowsVerbatimArguments).toBe(true);
  });

  it("passes the whole command line as a single pre-quoted string", () => {
    const spawnSpec = buildCommandProcessorSpawn("claude", ['{"mcpServers":{}}']);

    expect(spawnSpec.args.slice(0, -1)).toEqual(["/d", "/s", "/c"]);
    expect(spawnSpec.args.at(-1)).toBe('""claude" "{\\"mcpServers\\":{}}""');
  });
});

describe("argument passing through the command processor", () => {
  it("delivers the mcp and settings JSON arguments intact", async () => {
    const { args } = buildClaudeInvocation([]);
    const received = await spawnAndEchoArgs(args);

    expect(received[received.indexOf("--mcp-config") + 1]).toBe('{"mcpServers":{}}');
    expect(received[received.indexOf("--settings") + 1]).toBe(
      '{"spinnerTipsEnabled":false,"terminalProgressBarEnabled":false}',
    );
  }, 30_000);

  it("delivers user arguments containing spaces and quotes intact", async () => {
    const userArgs = ["-p", '질문 내용 "인용" 포함'];
    const { args } = buildClaudeInvocation(userArgs);
    const received = await spawnAndEchoArgs(args);

    expect(received.slice(-2)).toEqual(userArgs);
  }, 30_000);

  it("delivers every fixed argument intact", async () => {
    const { args } = buildClaudeInvocation([]);
    const received = await spawnAndEchoArgs(args);

    expect(received).toEqual(args);
  }, 30_000);
});
