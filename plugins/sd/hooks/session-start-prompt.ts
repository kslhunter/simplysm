import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  try {
    const pluginRoot = resolvePluginRoot();
    if (!pluginRoot) return;

    const promptPath = join(pluginRoot, "output-styles", "sd.md");
    if (!existsSync(promptPath)) return;

    const prompt = (await readFile(promptPath, "utf8")).trim();
    if (prompt) process.stdout.write(prompt);
  } catch {
    // SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
  }
}

function resolvePluginRoot(): string | undefined {
  const envPluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
  if (envPluginRoot) return envPluginRoot;

  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

if ((import.meta as { main?: boolean }).main) {
  await main();
}
