import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface WikiCoreModule {
  readonly WikiAuthError: typeof Error;
  readonly WikiAuthExpired: typeof Error;
  readonly getToken: (allowBrowser?: boolean) => Promise<string | null>;
  readonly callService: (method: string, params: unknown[], token: string) => Promise<unknown>;
}

export async function importWikiCore(pluginRoot: string): Promise<WikiCoreModule> {
  const coreUrl = pathToFileURL(join(pluginRoot, "scripts", "wiki_core.ts")).href;
  return (await import(coreUrl)) as WikiCoreModule;
}
