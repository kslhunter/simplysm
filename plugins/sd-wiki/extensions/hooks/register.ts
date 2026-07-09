import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerLocalWikiHook } from "./local-wiki.ts";
import { registerWikiReferencesHook } from "./references.ts";
import { registerWikiReminderHook } from "./reminder.ts";
import { registerWikiRootmapHook } from "./rootmap.ts";

export function registerWikiHooks(pi: ExtensionAPI): void {
  registerWikiReferencesHook(pi);
  registerWikiRootmapHook(pi);
  registerLocalWikiHook(pi);
  registerWikiReminderHook(pi);
}
