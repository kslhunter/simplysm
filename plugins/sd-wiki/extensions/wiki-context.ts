import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { importWikiCore } from "../shared/wiki-core.ts";
import { triggerWikiBackgroundLogin } from "../shared/wiki-login.ts";
import { formatRootmapItems } from "../shared/wiki-rootmap.ts";
import { loadWikiRulesContext } from "../shared/wiki-rules.ts";

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(EXTENSION_DIR, "..");
const EXTENSION_ENTRY_URL = new URL("./index.ts", import.meta.url).href;
const WIKI_COMMAND_ROOT = PLUGIN_ROOT.replaceAll("\\", "/");
const LOGIN_WORKER_ARG = "--wiki-login-worker";
const LOGIN_PLUGIN_ROOT_ENV = "SD_WIKI_PLUGIN_ROOT";
const LOGIN_DATA_DIR_ENV_NAMES = ["SD_WIKI_DATA_DIR"] as const;

const WIKI_REMINDER =
  "[위키] 종료 전, 다음에 비슷한 상황에서 다시 열어 시간을 아낄 " +
  "비자명·반복 지식을 새로 확인했다면 wiki.md 규칙대로 위키에 반영한다. " +
  "작업 기록·이번 변경 요약·1회성 결정·단순 문서 요약·과거 기록물은 제외하고, " +
  "애매하면 쓰지 않는다.";

export function registerWikiContext(pi: ExtensionAPI): void {
  let rulesContextPromise: Promise<string | undefined> | undefined;
  let rootmapContext: string | undefined;
  let rootmapDisabled = false;

  pi.on("session_start", () => {
    rootmapContext = undefined;
    rootmapDisabled = false;
  });

  pi.on("before_agent_start", async (event) => {
    const contexts = [
      await getRulesContext(),
      await getRootmapContext(),
      WIKI_REMINDER,
    ];
    const systemPrompt = appendSystemContexts(event.systemPrompt, contexts);
    return systemPrompt === event.systemPrompt ? undefined : { systemPrompt };
  });

  async function getRulesContext(): Promise<string | undefined> {
    rulesContextPromise ??= loadWikiRulesContext(PLUGIN_ROOT, WIKI_COMMAND_ROOT).catch(() => undefined);
    return await rulesContextPromise;
  }

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

export const wikiLoginWorkerConfig = {
  workerArg: LOGIN_WORKER_ARG,
  pluginRootEnvName: LOGIN_PLUGIN_ROOT_ENV,
} as const;

async function fetchRootmapContext(): Promise<string | undefined> {
  const wikiCore = await importWikiCore(PLUGIN_ROOT);

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

function appendSystemContexts(systemPrompt: string, contexts: readonly (string | undefined)[]): string {
  let nextSystemPrompt = systemPrompt;

  for (const context of contexts) {
    const trimmedContext = context?.trim();
    if (!trimmedContext || nextSystemPrompt.includes(trimmedContext)) continue;
    nextSystemPrompt = `${nextSystemPrompt}\n\n${trimmedContext}`;
  }

  return nextSystemPrompt;
}
