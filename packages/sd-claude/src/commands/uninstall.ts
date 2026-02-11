import path from "path";
import { consola } from "consola";
import { fsGlob, fsExists, fsRm, fsReadJson, fsWriteJson } from "@simplysm/core-node";

//#region Types

/**
 * Uninstall 명령 옵션
 */
export interface UninstallOptions {}

//#endregion

//#region Main

/**
 * 현재 프로젝트의 `.claude/`에서 sd-* 스킬/에이전트를 제거한다.
 */
export async function runUninstall(_options: UninstallOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:claude:uninstall");

  const targetDir = path.join(cwd, ".claude");

  if (!(await fsExists(targetDir))) {
    logger.warn(".claude 디렉토리가 없습니다.");
    return;
  }

  const [rootEntries, subEntries] = await Promise.all([
    fsGlob(path.join(targetDir, "sd-*")),
    fsGlob(path.join(targetDir, "*/sd-*")),
  ]);
  const entries = [...rootEntries, ...subEntries];

  if (entries.length === 0) {
    logger.warn("삭제할 sd-* 항목이 없습니다.");
    return;
  }

  for (const entry of entries) {
    await fsRm(entry);
    logger.info(`삭제: .claude/${path.relative(targetDir, entry)}`);
  }

  // settings.json에서 statusLine 제거
  const settingsPath = path.join(targetDir, "settings.json");
  if (await fsExists(settingsPath)) {
    const settings = await fsReadJson<Record<string, unknown>>(settingsPath);
    const currentCommand = (settings["statusLine"] as Record<string, unknown> | undefined)?.["command"];
    if (currentCommand === "node .claude/sd-statusline.js") {
      delete settings["statusLine"];
      await fsWriteJson(settingsPath, settings, { space: 2 });
      logger.info("settings.json에서 statusLine 설정 제거");
    }
  }

  logger.info(`${entries.length}개의 sd-* 항목을 제거했습니다.`);
}

//#endregion
