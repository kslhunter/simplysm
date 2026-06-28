import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerClaudeSkillsHook } from "./claude-skills.ts";
import { registerReferencesHook } from "./references.ts";
import { registerShellHook } from "./shell.ts";
import { registerWriteHashHook } from "./write-hash.ts";

export function registerHooks(pi: ExtensionAPI) {
  registerShellHook(pi);
  registerWriteHashHook(pi);
  registerReferencesHook(pi);
  registerClaudeSkillsHook(pi);
}
