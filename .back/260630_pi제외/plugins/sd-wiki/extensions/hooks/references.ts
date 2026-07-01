import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildWikiReferenceContext } from "../../shared/reference-wiki.ts";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function registerWikiReferencesHook(pi: ExtensionAPI): void {
  let referenceContextPromise: Promise<string | undefined> | undefined;

  pi.on("before_agent_start", async (event) => {
    referenceContextPromise ??= buildWikiReferenceContext({ pluginRoot: PLUGIN_ROOT }).catch(() => undefined);

    const referenceContext = await referenceContextPromise;
    if (!referenceContext || event.systemPrompt.includes(referenceContext)) return undefined;

    return { systemPrompt: `${event.systemPrompt}\n\n${referenceContext}` };
  });
}
