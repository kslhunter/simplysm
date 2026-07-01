import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { RESPONSE_REMINDER } from "../../shared/response-reminder.ts";

export function registerReminderHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", (event) => {
    if (event.systemPrompt.includes(RESPONSE_REMINDER)) return undefined;
    return { systemPrompt: `${event.systemPrompt}\n\n${RESPONSE_REMINDER}` };
  });
}
