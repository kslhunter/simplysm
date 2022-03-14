import { SdCliConfigUtil } from "../utils/SdCliConfigUtil";
import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";

export class SdCliLocalUpdate {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public constructor(private readonly _rootPath: string) {
  }

  public async runAsync(opt: { confFileRelPath: string }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const conf = await SdCliConfigUtil.loadConfigAsync(path.resolve(this._rootPath, opt.confFileRelPath), false);
    if (!conf.localUpdates) return;

    const updatePathInfos = await this._getUpdatePathInfosAsync(conf.localUpdates);
    this._logger.debug("로컬 업데이트 구성");

    this._logger.log("로컬 라이브러리 업데이트 시작...");
    for (const updatePathInfo of updatePathInfos) {
      if (!FsUtil.exists(updatePathInfo.source)) {
        this._logger.warn(`소스경로를 찾을 수 없어 무시됩니다(${updatePathInfo.source})`);
        return;
      }

      // 소스경로에서 대상경로로 파일 복사
      await FsUtil.copyAsync(updatePathInfo.source, updatePathInfo.target, (src) => {
        return !src.includes("node_modules") && !src.endsWith("package.json");
      });
    }
    this._logger.info("로컬 라이브러리 업데이트 완료");
  }

  public async watchAsync(opt: { confFileRelPath: string }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const conf = await SdCliConfigUtil.loadConfigAsync(path.resolve(this._rootPath, opt.confFileRelPath), false);
    if (!conf.localUpdates) return;

    const updatePathInfos = await this._getUpdatePathInfosAsync(conf.localUpdates);
    this._logger.debug("로컬 업데이트 구성");

    const watchPaths = (await updatePathInfos.mapManyAsync(async (item) => await this._getWatchPathsAsync(item.source))).distinct();

    const watcher = SdFsWatcher.watch(watchPaths);
    watcher.onChange({ delay: 1000 }, async (changedInfos) => {
      const changeFilePaths = changedInfos.filter((item) => ["add", "change", "unlink"].includes(item.event)).map((item) => item.path);
      if (changeFilePaths.length === 0) return;

      this._logger.log("로컬 라이브러리 변경감지...");
      for (const changedFilePath of changeFilePaths) {
        if (!FsUtil.exists(changedFilePath)) continue;

        for (const updatePathInfo of updatePathInfos) {
          if (!PathUtil.isChildPath(changedFilePath, updatePathInfo.source)) continue;

          const sourceRelPath = path.relative(updatePathInfo.source, changedFilePath);
          if (sourceRelPath.includes("node_modules")) continue;
          if (sourceRelPath.includes("package.json")) continue;

          const targetFilePath = path.resolve(updatePathInfo.target, sourceRelPath);

          this._logger.debug(`변경파일감지(복사): ${changedFilePath} => ${targetFilePath}`);
          await FsUtil.copyAsync(changedFilePath, targetFilePath);
        }
      }

      const watchWatchPaths = (await updatePathInfos.mapManyAsync(async (item) => await this._getWatchPathsAsync(item.source))).distinct();
      watcher.add(watchWatchPaths);

      this._logger.info("로컬 라이브러리 복사 완료");
    });
  }

  private async _getUpdatePathInfosAsync(record: Record<string, string>): Promise<IUpdatePathInfo[]> {
    const result: IUpdatePathInfo[] = [];
    for (const pkgGlobPath of Object.keys(record)) {
      // "node_modules'에서 로컬업데이트 설정에 맞는 패키지를 "glob"하여 대상 패키지경로 목록 가져오기
      const targetPaths = [
        ...await FsUtil.globAsync(path.resolve(this._rootPath, "node_modules", pkgGlobPath)),
        ...await FsUtil.globAsync(path.resolve(this._rootPath, "packages", "*", "node_modules", pkgGlobPath))
      ];

      result.push(
        ...targetPaths
          .map((targetPath) => {
            // 대상의 명칭 추출
            const regexpText = pkgGlobPath.replace(/[\\/.*]/g, (item) => (
              item === "/" ? "[\\\\\\/]"
                : item === "." ? "\\."
                  : item === "*" ? "(.*)"
                    : item
            ));
            const targetNameMatch = new RegExp(regexpText).exec(targetPath);
            if (!targetNameMatch || typeof targetNameMatch[1] === "undefined") return undefined;
            const targetName = targetNameMatch[1];

            // 가져올 소스 경로 추출
            const sourcePath = path.resolve(record[pkgGlobPath].replace(/\*/g, targetName));
            return { source: sourcePath, target: targetPath };
          })
          .filterExists()
      );
    }

    return result;
  }

  protected async _getWatchPathsAsync(sourcePath: string): Promise<string[]> {
    return await FsUtil.globAsync(path.resolve(sourcePath, "**"), {
      ignore: [
        "**/node_modules/**",
        "**/package.json"
      ]
    });
  }
}

interface IUpdatePathInfo {
  source: string;
  target: string;
}
