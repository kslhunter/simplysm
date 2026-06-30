import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { asRecord, readStdinJson } from "../shared/hook-io.ts";
import { buildSimplysmReferenceContext } from "../shared/reference-simplysm.ts";

async function main(): Promise<void> {
  try {
    const data = await readStdinJson();
    const context = await buildSimplysmReferenceContext({
      projectDir: resolveProjectDir(data),
      pluginRoot: resolvePluginRoot(data),
    });
    if (context) process.stdout.write(context);
  } catch {
    // SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
  }
}

function resolvePluginRoot(data: unknown): string {
  const envPluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
  if (envPluginRoot) return envPluginRoot;

  const inputPluginRoot = asRecord(data)?.["plugin_root"] ?? asRecord(data)?.["pluginRoot"];
  if (typeof inputPluginRoot === "string" && inputPluginRoot) return inputPluginRoot;

  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function resolveProjectDir(data: unknown): string {
  const envProjectDir = process.env["CLAUDE_PROJECT_DIR"];
  if (envProjectDir) return envProjectDir;

  const cwd = asRecord(data)?.["cwd"];
  return typeof cwd === "string" && cwd ? cwd : process.cwd();
}

await main();
