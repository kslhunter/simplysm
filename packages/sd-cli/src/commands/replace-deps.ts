import { consola } from "consola";
import { loadSdConfig } from "../utils/sd-config";
import { setupReplaceDeps } from "../utils/replace-deps";

/**
 * replace-deps 명령 옵션
 */
export interface ReplaceDepsOptions {
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

/**
 * sd.config.ts의 replaceDeps 설정에 따라 node_modules 패키지를 로컬 소스로 symlink 교체한다.
 */
export async function runReplaceDeps(opts: ReplaceDepsOptions): Promise<void> {
  const cwd = process.cwd();

  const sdConfig = await loadSdConfig({ cwd, dev: false, opt: opts.options });

  if (sdConfig.replaceDeps == null) {
    consola.warn("sd.config.ts에 replaceDeps 설정이 없습니다.");
    return;
  }

  await setupReplaceDeps(cwd, sdConfig.replaceDeps);
}
