import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SD_REMINDER } from "../../shared/sd-reminder.ts";

export function registerReminderHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", (event) => {
    if (event.systemPrompt.includes(SD_REMINDER)) return undefined;
    return { systemPrompt: `${event.systemPrompt}\n\n${SD_REMINDER}` };
  });
}
