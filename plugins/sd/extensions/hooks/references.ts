import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildSimplysmReferenceContext } from "../../shared/reference-simplysm.ts";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function registerReferencesHook(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, ctx) => {
    const references = [
      await buildSimplysmReferenceContext({ projectDir: ctx.cwd, pluginRoot: PLUGIN_ROOT }),
    ].filter((item): item is string => Boolean(item));

    if (references.length === 0) return undefined;

    let systemPrompt = event.systemPrompt;
    for (const reference of references) {
      if (systemPrompt.includes(reference)) continue;
      systemPrompt = `${systemPrompt}\n\n${reference}`;
    }

    return systemPrompt === event.systemPrompt ? undefined : { systemPrompt };
  });
}
