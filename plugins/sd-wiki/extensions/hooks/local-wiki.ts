import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildLocalWikiRootmap } from "../../shared/local-wiki.ts";

/** 로컬 프로젝트 위키(.wiki/) ROOT MAP 을 시스템 프롬프트에 주입. 없으면 무주입(정상). */
export function registerLocalWikiHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event) => {
    let context: string | undefined;
    try {
      context = await buildLocalWikiRootmap(process.cwd());
    } catch {
      return undefined; // 주입 실패는 세션 진행을 막지 않는다.
    }

    if (!context || event.systemPrompt.includes(context)) return undefined;
    return { systemPrompt: `${event.systemPrompt}\n\n${context}` };
  });
}
