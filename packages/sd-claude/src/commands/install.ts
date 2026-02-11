import path from "path";
import fs from "fs";
import { consola } from "consola";
import { fsGlob, fsExists, fsCopy, fsRm, fsMkdir, fsReadJson, fsWriteJson } from "@simplysm/core-node";

//#region Types

/**
 * Install 명령 옵션
 */
export interface InstallOptions {}

//#endregion

//#region Utilities

/**
 * import.meta.dirname에서 상위로 올라가며 package.json을 찾아 패키지 루트를 반환한다.
 */
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json을 찾을 수 없습니다.");
    dir = parent;
  }
  return dir;
}

/**
 * sd-* 패턴에 매칭되는 파일/폴더를 탐색한다.
 */
async function findSdEntries(baseDir: string): Promise<string[]> {
  const [rootEntries, subEntries] = await Promise.all([
    fsGlob(path.join(baseDir, "sd-*")),
    fsGlob(path.join(baseDir, "*/sd-*")),
  ]);
  return [...rootEntries, ...subEntries];
}

//#endregion

//#region Main

/**
 * Claude Code 스킬/에이전트를 현재 프로젝트에 설치한다.
 *
 * 패키지의 `claude/` 디렉토리에서 sd-* 에셋을 읽어
 * 현재 프로젝트의 `.claude/`에 복사한다.
 * 기존 sd-* 항목은 전체 삭제 후 새로 복사한다.
 */
export async function runInstall(_options: InstallOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:claude:install");

  // 패키지의 claude/ 디렉토리
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const sourceDir = path.join(pkgRoot, "claude");

  if (!(await fsExists(sourceDir))) {
    consola.error(`에셋 디렉토리를 찾을 수 없습니다: ${sourceDir}`);
    process.exitCode = 1;
    return;
  }

  // 소스에서 sd-* 항목 탐색
  const sourceEntries = await findSdEntries(sourceDir);
  if (sourceEntries.length === 0) {
    logger.warn("설치할 sd-* 에셋이 없습니다.");
    return;
  }

  // 대상 .claude/ 디렉토리
  const targetDir = path.join(cwd, ".claude");

  // 기존 sd-* 삭제
  if (await fsExists(targetDir)) {
    const existingEntries = await findSdEntries(targetDir);
    for (const entry of existingEntries) {
      await fsRm(entry);
      logger.debug(`삭제: ${path.relative(cwd, entry)}`);
    }
  }

  // 복사
  await fsMkdir(targetDir);
  for (const entry of sourceEntries) {
    const relativePath = path.relative(sourceDir, entry);
    const targetPath = path.join(targetDir, relativePath);
    await fsCopy(entry, targetPath);
    logger.info(`설치: .claude/${relativePath}`);
  }

  // settings.json에 statusLine 설정
  const settingsPath = path.join(targetDir, "settings.json");
  const sdStatusLineCommand = "node .claude/sd-statusline.js";
  const settings = (await fsExists(settingsPath)) ? await fsReadJson<Record<string, unknown>>(settingsPath) : {};

  if (settings["statusLine"] == null) {
    settings["statusLine"] = { type: "command", command: sdStatusLineCommand };
    await fsWriteJson(settingsPath, settings, { space: 2 });
    logger.info("settings.json에 statusLine 설정 추가");
  }

  logger.info(`${sourceEntries.length}개의 sd-* 항목을 설치했습니다.`);
}

//#endregion
