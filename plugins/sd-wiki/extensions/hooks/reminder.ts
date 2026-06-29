import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const WIKI_REMINDER =
  "[위키] 종료 전, 다음에 비슷한 상황에서 다시 열어 시간을 아낄 " +
  "비자명·반복 지식을 새로 확인했다면 wiki.md 규칙대로 위키에 반영한다. " +
  "작업 기록·이번 변경 요약·1회성 결정·단순 문서 요약·과거 기록물은 제외하고, " +
  "애매하면 쓰지 않는다.";

export function registerWikiReminderHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", (event) => {
    if (event.systemPrompt.includes(WIKI_REMINDER)) return undefined;
    return { systemPrompt: `${event.systemPrompt}\n\n${WIKI_REMINDER}` };
  });
}
