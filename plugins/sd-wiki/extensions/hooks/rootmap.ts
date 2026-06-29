import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as wikiCore from "../../shared/wiki-service.ts";
import { triggerWikiBackgroundLogin } from "../../shared/wiki-login.ts";
import { formatRootmapItems } from "../../shared/wiki-rootmap.ts";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXTENSION_ENTRY_URL = new URL("../index.ts", import.meta.url).href;
const LOGIN_WORKER_ARG = "--wiki-login-worker";
const LOGIN_PLUGIN_ROOT_ENV = "SD_WIKI_PLUGIN_ROOT";
const LOGIN_DATA_DIR_ENV_NAMES = ["SD_WIKI_DATA_DIR"] as const;

export const wikiLoginWorkerConfig = {
  workerArg: LOGIN_WORKER_ARG,
  pluginRootEnvName: LOGIN_PLUGIN_ROOT_ENV,
} as const;

export function registerWikiRootmapHook(pi: ExtensionAPI): void {
  let rootmapContext: string | undefined;
  let rootmapDisabled = false;

  pi.on("session_start", () => {
    rootmapContext = undefined;
    rootmapDisabled = false;
  });

  pi.on("before_agent_start", async (event) => {
    const context = await getRootmapContext();
    if (!context || event.systemPrompt.includes(context)) return undefined;

    return { systemPrompt: `${event.systemPrompt}\n\n${context}` };
  });

  async function getRootmapContext(): Promise<string | undefined> {
    if (rootmapDisabled) return undefined;
    if (rootmapContext !== undefined) return rootmapContext;

    try {
      const fetchedContext = await fetchRootmapContext();
      if (fetchedContext === undefined) rootmapDisabled = true;
      else rootmapContext = fetchedContext;
      return fetchedContext;
    } catch {
      rootmapDisabled = true;
      return undefined;
    }
  }
}

async function fetchRootmapContext(): Promise<string | undefined> {
  function deferLogin(): void {
    triggerWikiBackgroundLogin({
      pluginRoot: PLUGIN_ROOT,
      workerScriptUrl: EXTENSION_ENTRY_URL,
      workerArg: LOGIN_WORKER_ARG,
      pluginRootEnvName: LOGIN_PLUGIN_ROOT_ENV,
      dataDirEnvNames: LOGIN_DATA_DIR_ENV_NAMES,
    });
  }

  let token: string | null;
  try {
    token = await wikiCore.getToken(false);
  } catch (error) {
    if (error instanceof wikiCore.WikiAuthExpired) {
      deferLogin();
      return undefined;
    }
    if (error instanceof wikiCore.WikiAuthError) return undefined;
    throw error;
  }

  if (token === null) {
    deferLogin();
    return undefined;
  }

  let rootmap: unknown;
  try {
    rootmap = await wikiCore.callService("rootMap", [], token);
  } catch (error) {
    if (error instanceof wikiCore.WikiAuthExpired) deferLogin();
    return undefined;
  }

  const rootmapItems = formatRootmapItems(rootmap);
  return `## 원격 공용 위키 ROOT MAP (최상위)\n\n${rootmapItems || "ROOT MAP 항목 없음"}`;
}
