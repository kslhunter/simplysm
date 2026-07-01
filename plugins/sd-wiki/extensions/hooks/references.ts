import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildRulesReferenceContext } from "../../shared/reference-rules.ts";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function registerWikiReferencesHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event) => {
    const referenceContext = await buildRulesReferenceContext({ pluginRoot: PLUGIN_ROOT });
    if (!referenceContext || event.systemPrompt.includes(referenceContext)) return undefined;

    return { systemPrompt: `${event.systemPrompt}\n\n${referenceContext}` };
  });
}
