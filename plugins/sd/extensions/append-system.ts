import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const appendSystemPath = join(dirname(fileURLToPath(import.meta.url)), "../output-styles/sd.md");

export function registerAppendSystem(pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => {
    const appendSystemPrompt = readFileSync(appendSystemPath, "utf8").trim();
    if (!appendSystemPrompt || event.systemPrompt.includes(appendSystemPrompt)) return;

    return {
      systemPrompt: `${event.systemPrompt}\n\n${appendSystemPrompt}`,
    };
  });
}
