import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildOutputStyleContext } from "../shared/reference-output-style.ts";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function registerAppendSystem(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    const outputStyleContext = await buildOutputStyleContext({ pluginRoot: PLUGIN_ROOT });
    if (!outputStyleContext || event.systemPrompt.includes(outputStyleContext)) return;

    return {
      systemPrompt: `${event.systemPrompt}\n\n${outputStyleContext}`,
    };
  });
}
