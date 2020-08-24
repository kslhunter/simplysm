import * as path from "path";
import { SdProjectConfigUtils } from "../SdProjectConfigUtils";
import { FsUtils, FsWatcher, Logger } from "@simplysm/sd-core-node";
import { ISdProjectConfig } from "../commons";

export class SdCliLocalUpdate {
  public static async runAsync(config: ISdProjectConfig): Promise<void>;
  public static async runAsync(argv: { options: string[] }): Promise<void>;
  public static async runAsync(arg: ISdProjectConfig | { config?: string; options: string[] }): Promise<void> {
    if (arg["options"] instanceof Array) {
      const argv = arg as { config?: string; options: string[] };

      const config = await SdProjectConfigUtils.loadConfigAsync(true, argv.options);

      await SdCliLocalUpdate._runAsync(config, false);
    }
    else {
      const config = arg as ISdProjectConfig;
      await SdCliLocalUpdate._runAsync(config, false);
    }
  }

  public static async watchAsync(config: ISdProjectConfig): Promise<void> {
    await SdCliLocalUpdate._runAsync(config, true);
  }

  private static async _runAsync(config: ISdProjectConfig, watch: boolean): Promise<void> {
    // 옵션체크
    if (!config.localUpdates) {
      return;
    }

    const logger = Logger.get(["simplysm", "sd-cli", "local-update"]);
    logger.debug(watch ? `로컬 패키지 변경감지를 시작합니다.` : `로컬 패키지 업데이트를 시작합니다.`);

    // 설정별
    await Object.keys(config.localUpdates).parallelAsync(async localUpdateKey => {
      // "node_modules'에서 로컬업데이트 설정에 맞는 패키지를 "glob"하여 대상 패키지경로 목록 가져오기
      const targetPaths = await FsUtils.globAsync(path.resolve(process.cwd(), "node_modules", localUpdateKey));
      // 대상 패키지 경로별
      await targetPaths.parallelAsync(async targetPath => {
        const regexpText = localUpdateKey.replace(/[\\/.*]/g, item => (
          item === "/" ? "[\\\\\\/]" :
            item === "." ? "\\." :
              item === "*" ? "(.*)" :
                item
        ));
        const targetNameMatch = new RegExp(regexpText).exec(targetPath);
        if (!targetNameMatch || targetNameMatch[1] === undefined) return;
        const targetName = targetNameMatch[1];

        // 로컬 업데이트 설정에 따라, 가져올 소스 경로 추출
        const sourcePath = path.resolve(config.localUpdates![localUpdateKey].replace(/\*/g, targetName));
        if (!FsUtils.exists(sourcePath)) {
          logger.warn(`소스경로를 찾을 수 없어 무시됩니다(${sourcePath})`);
          return;
        }

        if (watch) {
          // 변경감지 시작
          await FsWatcher.watchAsync(path.resolve(sourcePath, "**", "*"), async changedInfos => {
            logger.debug(
              `'${targetName}' 파일이 변경되었습니다.\n` +
              changedInfos.map(item => `[${item.type}] ${item.filePath}`).join("\n")
            );

            await changedInfos.parallelAsync(async changeInfo => {
              if (
                changeInfo.filePath.includes("node_modules") ||
                changeInfo.filePath.endsWith("package.json")
              ) {
                return;
              }

              const targetFilePath = path.resolve(targetPath, path.relative(sourcePath, changeInfo.filePath));

              if (changeInfo.type === "unlink") {
                logger.debug(targetName, "파일 삭제...");
                await FsUtils.removeAsync(targetFilePath);
                logger.debug(targetName, "파일 삭제 완료");
              }
              else {
                logger.debug(targetName, "파일 카피... (" + changeInfo.filePath + ")");
                await FsUtils.copyAsync(changeInfo.filePath, targetFilePath);
                logger.debug(targetName, "파일 카피 완료");
              }
            });

            logger.log("로컬 패키지 변경 처리 완료");
          }, err => {
            logger.error(`'${targetName}'의 변경사항을 처리하는 중에 오류가 발생하였습니다.`, err);
          }, {
            aggregateTimeout: 1000
          });
        }
        else {
          // 소스경로에서 대상경로로 파일 복사
          await FsUtils.copyAsync(sourcePath, targetPath, src => {
            return !src.includes("node_modules") && !src.endsWith("package.json");
          });
        }
      });
    });

    logger.info(watch ? `모든 로컬 패키지 변경감지가 시작되었습니다.` : `모든 로컬 패키지 업데이트가 완료되었습니다.`);
  }
}