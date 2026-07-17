import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRuleFileContext } from "../shared/reference-rules.ts";
import { readStdinJsonRecord } from "../shared/wiki-util.ts";

// rules 파일 1개를 인자로 받아 그 파일만 출력한다. 훅 stdout 1개당 주입 1건이고 출력이 크면
// 잘려 파일로 밀려나므로, hooks.json 에 파일별 훅을 등록해 나눠 주입한다.
// rules 파일 목록과 hooks.json 등록 목록의 일치, 파일별 크기 상한은 tests/rules-injection.spec.ts 가 검증한다.
async function main(): Promise<void> {
  try {
    const fileName = process.argv[2];
    if (fileName == null) return;

    const data = await readStdinJsonRecord();
    const pluginRoot = resolvePluginRoot(data);
    const context = await buildRuleFileContext({ pluginRoot, fileName });
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
