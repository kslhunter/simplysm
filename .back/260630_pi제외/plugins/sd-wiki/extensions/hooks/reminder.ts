import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { WIKI_REMINDER } from "../../shared/wiki-reminder.ts";

export function registerWikiReminderHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", (event) => {
    if (event.systemPrompt.includes(WIKI_REMINDER)) return undefined;
    return { systemPrompt: `${event.systemPrompt}\n\n${WIKI_REMINDER}` };
  });
}
