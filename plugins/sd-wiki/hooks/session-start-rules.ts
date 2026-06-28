/** SessionStart hook (플러그인 sd-wiki) — 작성·활용 규칙 주입.
 *
 * rules/*.md 를 읽어 ${CLAUDE_PLUGIN_ROOT} 치환 후 stdout 주입. 네트워크·코어(wiki_core)
 * 의존이 전혀 없는 정적 주입 — 인증·네트워크에 의존하는 동적 ROOT MAP 주입
 * (session-start-rootmap.ts)과 별개 파일·별개 SessionStart command 로 분리돼 있다.
 *
 * 출력은 plain stdout 으로 그대로 컨텍스트에 주입되므로 진단·에러는 stderr 만.
 */

import { loadWikiRulesContext } from "../shared/wiki-rules.ts";

const PLUGIN_ROOT = process.env["CLAUDE_PLUGIN_ROOT"];

async function injectRules(): Promise<void> {
  if (!PLUGIN_ROOT) return;
  const context = await loadWikiRulesContext(PLUGIN_ROOT);
  if (context) process.stdout.write(context);
}

async function main(): Promise<number> {
  try {
    await injectRules();
  } catch {
    // SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
