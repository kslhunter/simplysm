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

  const sdConfig = await loadSdConfig({ cwd, dev: false, options: opts.options });

  if (sdConfig.replaceDeps == null) {
    consola.warn("sd.config.ts에 replaceDeps 설정이 없습니다.");
    return;
  }

  await setupReplaceDeps(cwd, sdConfig.replaceDeps);
}
