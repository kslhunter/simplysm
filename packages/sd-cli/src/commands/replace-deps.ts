import { consola } from "consola";
import { loadSdConfig } from "../utils/sd-config";
import { setupReplaceDeps } from "../utils/replace-deps";

/**
 * replace-deps command options
 */
export interface ReplaceDepsOptions {
  /** Additional options to pass to sd.config.ts */
  options: string[];
}

/**
 * Replace node_modules packages with symlinks to local source based on replaceDeps config in sd.config.ts.
 */
export async function runReplaceDeps(opts: ReplaceDepsOptions): Promise<void> {
  const cwd = process.cwd();

  const sdConfig = await loadSdConfig({ cwd, dev: false, opt: opts.options });

  if (sdConfig.replaceDeps == null) {
    consola.warn("No replaceDeps config found in sd.config.ts.");
    return;
  }

  await setupReplaceDeps(cwd, sdConfig.replaceDeps);
}
