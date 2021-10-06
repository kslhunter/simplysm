import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import { SdProjectConfigUtil } from "../utils/SdProjectConfigUtil";
import * as path from "path";

export class SdCliLocalUpdater {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public constructor(private readonly _rootPath: string) {
  }

  public async localUpdateAsync(watch: boolean, opt?: { config?: string }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdProjectConfigUtil.loadConfigAsync(this._rootPath, watch, undefined, opt?.config);

    if (config.localUpdates) {
      const updatePathInfos = await this._getUpdatePathInfosAsync(config.localUpdates);

      if (watch) {
        const watchPaths = (await updatePathInfos.mapManyAsync(async (item) => await this._getWatchPathsAsync(item.source))).distinct();

        const watcher = new SdFsWatcher();
        watcher
          .onChange(async (changedInfos) => {
            this._logger.log("로컬 라이브러리 변경감지...");

            const watchPaths2 = (await updatePathInfos.mapManyAsync(async (item) => await this._getWatchPathsAsync(item.source))).distinct();
            watcher.replaceWatchPaths(watchPaths2);

            const changedFilePaths = changedInfos.map((item) => item.filePath).distinct();
            for (const changedFilePath of changedFilePaths) {
              if (changedFilePath.includes("node_modules") || changedFilePath.endsWith("package.json")) {
                continue;
              }

              const currentUpdatePathInfos = updatePathInfos.filter((item) => PathUtil.isChildPath(changedFilePath, item.source));
              const targetFilePaths = currentUpdatePathInfos.map((item) => path.resolve(item.target, path.relative(item.source, changedFilePath)));

              if (FsUtil.exists(changedFilePath)) {
                this._logger.debug(`변경파일감지(복사): ${changedFilePath}`);
                for (const targetFilePath of targetFilePaths) {
                  await FsUtil.copyAsync(changedFilePath, targetFilePath);
                }
              }
              /*else {
                this._logger.debug(`변경파일감지(삭제): ${changedFilePath}`);
                for (const targetFilePath of targetFilePaths) {
                  await FsUtil.removeAsync(targetFilePath);
                }
              }*/
            }

            this._logger.info("로컬 라이브러리 변경감지 및 복사 완료");
          })
          .watch(watchPaths);
      }
      else {
        this._logger.log("로컬 라이브러리 업데이트 시작...");
        for (const updatePathInfo of updatePathInfos) {
          await this._runAsync(updatePathInfo);
        }
        this._logger.info("로컬 라이브러리 업데이트 완료");
      }
    }
  }

  private async _runAsync(updatePath: { source: string; target: string }): Promise<void> {
    if (!FsUtil.exists(updatePath.source)) {
      this._logger.warn(`소스경로를 찾을 수 없어 무시됩니다(${updatePath.source})`);
      return;
    }

    // 소스경로에서 대상경로로 파일 복사
    await FsUtil.copyAsync(updatePath.source, updatePath.target, (src) => {
      return !src.includes("node_modules") && !src.endsWith("package.json");
    });
  }

  protected async _getWatchPathsAsync(updateSourcePath: string): Promise<string[]> {
    return (await FsUtil.globAsync(path.resolve(updateSourcePath, "**")))
      .filter((item) => (
        !item.includes("node_modules")
        && FsUtil.exists(item)
        && FsUtil.isDirectory(item)
      ));
  }

  private async _getUpdatePathInfosAsync(record: Record<string, string>): Promise<{ source: string; target: string }[]> {
    return (
      await Object.keys(record).parallelAsync(async (packageGlobPath) => {
        // "node_modules'에서 로컬업데이트 설정에 맞는 패키지를 "glob"하여 대상 패키지경로 목록 가져오기
        const targetPaths = await FsUtil.globAsync(path.resolve(process.cwd(), "node_modules", packageGlobPath));

        return targetPaths
          .map((targetPath) => {
            // 대상의 명칭 추출
            const regexpText = packageGlobPath.replace(/[\\/.*]/g, (item) => (
              item === "/" ? "[\\\\\\/]"
                : item === "." ? "\\."
                  : item === "*" ? "(.*)"
                    : item
            ));
            const targetNameMatch = new RegExp(regexpText).exec(targetPath);
            if (!targetNameMatch || typeof targetNameMatch[1] === "undefined") return undefined;
            const targetName = targetNameMatch[1];

            // 가져올 소스 경로 추출
            const sourcePath = path.resolve(record[packageGlobPath].replace(/\*/g, targetName));
            return { source: sourcePath, target: targetPath };
          })
          .filterExists();
      })
    ).mapMany();
  }
}
