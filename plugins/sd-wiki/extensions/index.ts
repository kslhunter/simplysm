import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { runWikiBackgroundLoginWorkerFromArgv } from "../shared/wiki-login.ts";
import { registerWikiContext, wikiLoginWorkerConfig } from "./wiki-context.ts";

export default function (pi: ExtensionAPI) {
  registerWikiContext(pi);
}

if (import.meta.main) {
  runWikiBackgroundLoginWorkerFromArgv(
    process.argv.slice(2),
    wikiLoginWorkerConfig.workerArg,
    wikiLoginWorkerConfig.pluginRootEnvName,
  ).then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}
