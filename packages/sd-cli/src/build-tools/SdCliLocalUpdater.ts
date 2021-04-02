import * as path from "path";
import { FsUtil, Logger } from "@simplysm/sd-core-node";

export class SdCliLocalUpdater {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "local-update"]);

  public constructor(private readonly _configObj: Record<string, string>) {
  }

  public async runAsync(): Promise<void> {
    const updatePaths = await this._getUpdatePathsAsync();
    await updatePaths.parallelAsync(async (updatePath) => {
      if (!FsUtil.exists(updatePath.source)) {
        this._logger.warn(`소스경로를 찾을 수 없어 무시됩니다(${updatePath.source})`);
        return;
      }

      // 소스경로에서 대상경로로 파일 복사
      await FsUtil.copyAsync(updatePath.source, updatePath.target, (src) => {
        return !src.includes("node_modules") && !src.endsWith("package.json");
      });
    });
  }

  public async watchAsync(): Promise<void> {
    const updatePaths = await this._getUpdatePathsAsync();

    await updatePaths.parallelAsync(async (updatePath) => {
      await FsUtil.watchAsync(
        path.resolve(updatePath.source, "**", "*"),
        async (changedInfos) => {
          await changedInfos.parallelAsync(async (changeInfo) => {
            if (changeInfo.filePath.includes("node_modules") || changeInfo.filePath.endsWith("package.json")) {
              return;
            }

            const targetFilePath = path.resolve(updatePath.target, path.relative(updatePath.source, changeInfo.filePath));

            if (changeInfo.type === "unlink") {
              this._logger.debug(`변경파일감지(삭제): ${changeInfo.filePath}`);
              await FsUtil.removeAsync(targetFilePath);
            }
            else {
              this._logger.debug(`변경파일감지(복사): ${changeInfo.filePath}`);
              await FsUtil.copyAsync(changeInfo.filePath, targetFilePath);
            }
          });

          this._logger.info(`변경파일감지 및 복사 완료`);
        },
        (err) => {
          this._logger.error(`'${updatePath.target}'의 변경사항을 처리하는 중에 오류가 발생하였습니다.`, err);
        },
        {
          aggregateTimeout: 300
        }
      );
    });
  }

  private async _getUpdatePathsAsync(): Promise<{ source: string; target: string }[]> {
    return (
      await Object.keys(this._configObj).parallelAsync(async (packageGlobPath) => {
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
            const sourcePath = path.resolve(this._configObj[packageGlobPath].replace(/\*/g, targetName));
            return { source: sourcePath, target: targetPath };
          })
          .filterExists();
      })
    ).mapMany();
  }
}