import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerClaudeSkillsHook } from "./claude-skills.ts";
import { registerPrettierHook } from "./prettier.ts";
import { registerReferencesHook } from "./references.ts";
import { registerReminderHook } from "./reminder.ts";
import { registerShellHook } from "./shell.ts";
import { registerWriteHashHook } from "./write-hash.ts";

export function registerHooks(pi: ExtensionAPI) {
  registerShellHook(pi);
  registerWriteHashHook(pi);
  registerPrettierHook(pi);
  registerReferencesHook(pi);
  registerClaudeSkillsHook(pi);
  registerReminderHook(pi);
}
