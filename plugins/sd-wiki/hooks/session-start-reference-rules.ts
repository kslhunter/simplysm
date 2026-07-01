import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRulesReferenceContext } from "../shared/reference-rules.ts";
import { readStdinJsonRecord } from "../shared/wiki-util.ts";

async function main(): Promise<void> {
  try {
    const data = await readStdinJsonRecord();
    const pluginRoot = resolvePluginRoot(data);
    const context = await buildRulesReferenceContext({ pluginRoot });
    if (context) process.stdout.write(context);
  } catch {
    // SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
  }
}

function resolvePluginRoot(data: Record<string, unknown> | undefined): string {
  const envPluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
  if (envPluginRoot) return envPluginRoot;

  const inputPluginRoot = data?.["plugin_root"] ?? data?.["pluginRoot"];
  if (typeof inputPluginRoot === "string" && inputPluginRoot) return inputPluginRoot;

  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

await main();
