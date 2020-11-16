import "source-map-support/register";

import { FsUtil, Logger, LoggerSeverity, SdProcessWorker } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdCliNgModuleGenerator } from "@simplysm/sd-cli/src/build-tools/SdCliNgModuleGenerator";
import { SdCliNgMetadataGenerator } from "@simplysm/sd-cli/src/build-tools/SdCliNgMetadataGenerator";
import { SdCliResultCacheMap } from "@simplysm/sd-cli/src/utils/SdCliResultCacheMap";
import { SdCliPathUtil } from "@simplysm/sd-cli/src/utils/SdCliPathUtil";
import { SdCliTsProgramWatcher } from "@simplysm/sd-cli/src/build-tools/SdCliTsProgramWatcher";
import { INpmConfig } from "@simplysm/sd-cli/src/commons";
import * as ng from "@angular/compiler-cli";
import * as path from "path";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const logger = Logger.get(["simplysm", "sd-cli", "ng-gen-worker"]);

if (process.env.SD_CLI_LOGGER_SEVERITY === "DEBUG") {
  Error.stackTraceLimit = 100; //Infinity;

  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig({
    dot: true
  });
}

try {
  SdProcessWorker.defineWorker(async (worker, args) => {
    const rootPath = args[0] as string;

    const srcPath = SdCliPathUtil.getSourcePath(rootPath);

    const resultCacheMap = new SdCliResultCacheMap();

    const metadataCacheMap = new Map<string, ng.ModuleMetadata>();

    const ngMetadataGenerator = new SdCliNgMetadataGenerator(rootPath);


    const modulesGenPath = path.resolve(srcPath, "_modules");
    const ngModuleGenerator = new SdCliNgModuleGenerator(rootPath, modulesGenPath);

    const npmConfig: INpmConfig = await FsUtil.readJsonAsync(SdCliPathUtil.getNpmConfigFilePath(rootPath));
    const isForAngular = (
      (npmConfig.dependencies && Object.keys(npmConfig.dependencies).includes("@angular/core")) ||
      (npmConfig.devDependencies && Object.keys(npmConfig.devDependencies).includes("@angular/core")) ||
      (npmConfig.peerDependencies && Object.keys(npmConfig.peerDependencies).includes("@angular/core"))
    ) ?? false;

    const isLibrary = npmConfig.main !== undefined;

    await new SdCliTsProgramWatcher(rootPath, "browser", isForAngular)
      .watchAsync(async (program, changeInfos) => {
        // 변경된 파일에 대한 이전 결과들 삭제
        for (const changeInfo of changeInfos) {
          resultCacheMap.delete(changeInfo.filePath);
        }

        // METADATA를 만들기 위해 필요한 파일 목록
        // 현재 패키지의 소스코드고, .d.ts가 아닌 .ts파일, 생성 모듈 폴더 제외
        const genMetadataTargetInfos = changeInfos
          .filter((item) => (
            FsUtil.isChildPath(item.filePath, srcPath) &&
            item.filePath.endsWith(".ts") && !item.filePath.endsWith(".d.ts")
          ));

        // NgModule를 만들기 위해 필요한 파일 목록
        // 의존성있는 다른 패키지의 파일도 등록해야 NgModule이 제대로 생성됨
        const genNgModuleTargetInfos = changeInfos
          .filter((item) => (
            !FsUtil.isChildPath(item.filePath, modulesGenPath) &&
            item.filePath.endsWith(".ts")
          ));

        // 관련 파일이 없으면 그냥 RETURN
        if (genMetadataTargetInfos.length === 0 && genNgModuleTargetInfos.length === 0) return;

        worker.send("change");

        // GEN/GET METADATA
        if (genMetadataTargetInfos.length > 0) {
          for (const genMetadataTargetInfo of genMetadataTargetInfos) {
            if (genMetadataTargetInfo.eventType === "unlink") {
              await ngMetadataGenerator.removeMetadataAsync(genMetadataTargetInfo.filePath);
            }
            else {
              const sourceFile = program.getSourceFile(genMetadataTargetInfo.filePath);
              if (!sourceFile) continue;

              if (isLibrary) {
                const results = await ngMetadataGenerator.genMetadataAsync(sourceFile);
                resultCacheMap.save(...results);
              }
              else {
                if (FsUtil.isChildPath(genMetadataTargetInfo.filePath, modulesGenPath)) continue;

                const result = ngMetadataGenerator.getMetadata(sourceFile);
                resultCacheMap.save(...result.results);
                if (result.metadata) {
                  metadataCacheMap.set(genMetadataTargetInfo.filePath, result.metadata);
                }
                else {
                  metadataCacheMap.delete(genMetadataTargetInfo.filePath);
                }
              }
            }
          }
        }

        // GEN NgModule
        if (genNgModuleTargetInfos.length > 0) {
          for (const genNgModuleTargetInfo of genNgModuleTargetInfos) {
            if (genNgModuleTargetInfo.eventType !== "unlink") {
              const sourceFile = program.getSourceFile(genNgModuleTargetInfo.filePath);
              if (!sourceFile) continue;
              await ngModuleGenerator.registerAsync(sourceFile, metadataCacheMap.get(genNgModuleTargetInfo.filePath));
            }
            else {
              await ngModuleGenerator.deleteAsync(genNgModuleTargetInfo.filePath);
            }
          }
          const results = await ngModuleGenerator.genAsync();
          resultCacheMap.save(...results);
        }

        worker.send("complete", resultCacheMap.results);
      });
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}