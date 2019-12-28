import {Logger} from "@simplysm/sd-core-node";
import {SdCliUtil} from "./SdCliUtil";
import * as glob from "glob";
import * as path from "path";
import * as fs from "fs-extra";
import {NotImplementError} from "@simplysm/sd-core-common";

export class SdLibraryLocalUpdater {
  public static async localUpdateAsync(watch?: boolean): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "local-update"]);
    logger.info(watch ? `로컬 라이브러리의 변경감지를 시작합니다.` : `로컬 라이브러리를 통한 업데이트를 시작합니다.`);

    // "simplysm.json" 정보 가져오기
    const config = await SdCliUtil.getConfigObjAsync("development");

    // 옵션체크
    if (!config.localUpdates) {
      return;
    }

    // 로컬 업데이트 설정별 병렬로,
    await Promise.all(Object.keys(config.localUpdates).map(async (localUpdateKey) => {
      // node_modules 에서 로컬업데이트 설정에 맞는 패키지를 glob 하여 대상 패키지 경로 목록 가져오기
      const targetPaths = await new Promise<string[]>((resolve, reject) => {
        glob(path.resolve(process.cwd(), "node_modules", localUpdateKey), (err, files) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(files);
        });
      });

      // 대상 패키지 경로별 병렬로,
      await Promise.all(targetPaths.map(async (targetPath) => {
        const targetName = targetPath.match(new RegExp(
          localUpdateKey.replace(
            /([\/.*])/g,
            (item) => item === "/" ? "\\/" : item === "." ? "\\." : item === "*" ? "(.*)" : item)
        ))![1];

        const targetLogger = Logger.get(["simplysm", "sd-cli", "local-update", targetName]);

        // 로컬 업데이트 설정에 따라, 가져올 소스 경로 추출
        const sourcePath = path.resolve(config.localUpdates![localUpdateKey].replace(/\*/g, targetName));
        if (!(await fs.pathExists(sourcePath))) {
          targetLogger.warn(`소스경로를 찾을 수 없어 무시됩니다(${sourcePath})`);
          return;
        }

        // 변경감지 모드일 경우,
        if (watch) {
          throw new NotImplementError();
        }
        // 변경감지 모드가 아닐 경우,
        else {
          // 소스경로에서 대상경로로 파일 복사
          await fs.copy(sourcePath, targetPath, {
            filter: (src: string) => {
              return !src.includes("node_modules") && !src.endsWith("package.json");
            }
          });
        }
      }));

    }));

    logger.info(`로컬 라이브러리를 통한 업데이트가 모두 완료되었습니다.`);
  }
}