import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";
import { pathToFileURL } from "url";
import { ISdProjectConfig } from "../types/sd-configs.type";

export class SdCliLocalUpdate {
  static async runAsync(opt: { confFileRelPath: string; optNames: string[] }): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliLocalUpdate", "runAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(
      true,
      opt.optNames,
    ) as ISdProjectConfig;
    if (!projConf.localUpdates) return;

    const updatePathInfos = this.#getUpdatePathInfos(projConf.localUpdates);
    logger.debug("로컬 업데이트 구성", updatePathInfos);

    logger.log("로컬 라이브러리 업데이트 시작...");
    for (const updatePathInfo of updatePathInfos) {
      if (!FsUtil.exists(updatePathInfo.source)) {
        logger.warn(`소스경로를 찾을 수 없어 무시됩니다(${updatePathInfo.source})`);
        return;
      }

      // 소스경로에서 대상경로로 파일 복사
      FsUtil.copy(updatePathInfo.source, updatePathInfo.target, (src) => {
        return !src.includes("node_modules") && !src.endsWith("package.json");
      });
    }
    logger.info("로컬 라이브러리 업데이트 완료");
  }

  static async watchAsync(opt: { confFileRelPath: string; optNames: string[] }): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliLocalUpdate", "watchAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(
      true,
      opt.optNames,
    ) as ISdProjectConfig;
    if (!projConf.localUpdates) return;

    const updatePathInfos = this.#getUpdatePathInfos(projConf.localUpdates);
    logger.debug("로컬 업데이트 구성");

    // const watchPaths = updatePathInfos.mapMany((item) => this.#getWatchPaths(item.source)).distinct();

    const watcher = SdFsWatcher.watch(updatePathInfos.map((item) => item.source));
    watcher.onChange({ delay: 500 }, (changedInfos) => {
      const changedFileInfos = changedInfos.filter((item) => ["add", "change", "unlink"].includes(item.event));
      if (changedFileInfos.length === 0) return;

      logger.log("로컬 라이브러리 변경감지...");

      for (const changedFileInfo of changedFileInfos) {
        for (const updatePathInfo of updatePathInfos) {
          if (!PathUtil.isChildPath(changedFileInfo.path, updatePathInfo.source)) continue;

          const sourceRelPath = path.relative(updatePathInfo.source, changedFileInfo.path);
          const targetFilePath = path.resolve(updatePathInfo.target, sourceRelPath);

          if (changedFileInfo.event === "unlink") {
            logger.debug(`변경파일감지(삭제): ${targetFilePath}`);
            FsUtil.remove(targetFilePath);
          } else {
            logger.debug(`변경파일감지(복사): ${changedFileInfo.path} => ${targetFilePath}`);
            FsUtil.copy(changedFileInfo.path, targetFilePath);
          }
        }
      }

      // const watchFileSet = new Set(updatePathInfos.mapMany((item) => this.#getWatchPaths(item.source)));
      //
      // watcher.replaceWatchPaths(watchFileSet);

      logger.info("로컬 라이브러리 복사 완료");
    });
  }

  static #getUpdatePathInfos(record: Record<string, string>): IUpdatePathInfo[] {
    const result: IUpdatePathInfo[] = [];
    for (const pkgGlobPath of Object.keys(record)) {
      // "node_modules'에서 로컬업데이트 설정에 맞는 패키지를 "glob"하여 대상 패키지경로 목록 가져오기
      const targetPaths = [
        ...FsUtil.glob(path.resolve(process.cwd(), "node_modules", pkgGlobPath)),
        ...FsUtil.glob(path.resolve(process.cwd(), "packages", "*", "node_modules", pkgGlobPath)),
      ];

      result.push(
        ...targetPaths
          .map((targetPath) => {
            // 대상의 명칭 추출
            const regexpText = pkgGlobPath.replace(/[\\/.*]/g, (item) =>
              item === "/" ? "[\\\\\\/]" : item === "." ? "\\." : item === "*" ? "(.*)" : item,
            );
            const targetNameMatch = new RegExp(regexpText).exec(targetPath);
            if (!targetNameMatch || typeof targetNameMatch[1] === "undefined") return undefined;
            const targetName = targetNameMatch[1];

            // 가져올 소스 경로 추출
            const sourcePath = path.resolve(record[pkgGlobPath].replace(/\*/g, targetName));
            return { source: sourcePath, target: targetPath };
          })
          .filterExists(),
      );
    }

    return result;
  }

  /*static #getWatchPaths(sourcePath: string): string[] {
    return FsUtil.glob(path.resolve(sourcePath, "**"));
  }*/
}

interface IUpdatePathInfo {
  source: string;
  target: string;
}
