import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildRulesReferenceContext } from "../shared/reference-rules.ts";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function registerAppendSystem(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    const rulesContext = await buildRulesReferenceContext({ pluginRoot: PLUGIN_ROOT });
    if (!rulesContext || event.systemPrompt.includes(rulesContext)) return;

    return {
      systemPrompt: `${event.systemPrompt}\n\n${rulesContext}`,
    };
  });
}
