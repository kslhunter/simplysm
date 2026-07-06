import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildOutputStyleContext } from "../shared/output-style-context.ts";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function registerAppendSystem(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    const styleContext = await buildOutputStyleContext({ pluginRoot: PLUGIN_ROOT });
    if (!styleContext || event.systemPrompt.includes(styleContext)) return;

    return {
      systemPrompt: `${event.systemPrompt}\n\n${styleContext}`,
    };
  });
}
