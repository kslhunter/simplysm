import "source-map-support/register";

import { FsUtil, Logger, LoggerSeverity, SdProcessWorker } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import * as path from "path";
import * as ts from "typescript";
import { SdTsDiagnosticUtil } from "@simplysm/sd-cli/src/utils/SdTsDiagnosticUtil";
import { SdCliResultCacheMap } from "@simplysm/sd-cli/src/utils/SdCliResultCacheMap";
import { SdCliPathUtil } from "@simplysm/sd-cli/src/utils/SdCliPathUtil";
import { SdCliTsProgramWatcher } from "@simplysm/sd-cli/src/build-tools/SdCliTsProgramWatcher";
import { INpmConfig, ITsConfig } from "@simplysm/sd-cli/src/commons";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const logger = Logger.get(["simplysm", "sd-cli", "check-worker"]);
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
    const target = args[1] as "node" | "browser";

    const srcPath = SdCliPathUtil.getSourcePath(rootPath);
    const typesPath = SdCliPathUtil.getDistTypesPath(rootPath);

    const resultCacheMap = new SdCliResultCacheMap();

    const npmConfig: INpmConfig = await FsUtil.readJsonAsync(SdCliPathUtil.getNpmConfigFilePath(rootPath));
    const isForAngular = (
      target === "browser" && (
        (npmConfig.dependencies && Object.keys(npmConfig.dependencies).includes("@angular/core")) ||
        (npmConfig.devDependencies && Object.keys(npmConfig.devDependencies).includes("@angular/core")) ||
        (npmConfig.peerDependencies && Object.keys(npmConfig.peerDependencies).includes("@angular/core"))
      )
    ) ?? false;

    const tsconfig: ITsConfig = await FsUtil.readJsonAsync(SdCliPathUtil.getTsConfigBuildFilePath(rootPath, target));
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, rootPath);

    const programWatcher = new SdCliTsProgramWatcher(rootPath, target, isForAngular);
    await programWatcher
      .watchAsync(async (program, changeInfos) => {
        // 변경된 파일에 대한 이전 결과들 삭제
        for (const changeInfo of changeInfos) {
          resultCacheMap.delete(changeInfo.filePath);
        }

        // 현재 패키지의 소스코드고, .d.ts가 아닌 .ts파일
        const targetInfos = changeInfos
          .filter((item) => (
            FsUtil.isChildPath(item.filePath, srcPath) &&
            item.filePath.endsWith(".ts") && !item.filePath.endsWith(".d.ts")
          ));

        // 관련 파일이 없으면 그냥 RETURN
        if (targetInfos.length === 0) return;

        worker.send("change");

        for (const targetInfo of targetInfos) {
          try {
            const declFilePath = path.resolve(typesPath, path.relative(srcPath, targetInfo.filePath)).replace(/\.ts$/, ".d.ts");

            if (targetInfo.eventType === "unlink") {
              programWatcher.deleteOutputFileCache(declFilePath);
              await FsUtil.removeAsync(declFilePath);
            }
            else {
              const sourceFile = program.getSourceFile(targetInfo.filePath);

              if (parsedTsconfig.options.declaration) {
                const emitResult = program.emit(
                  sourceFile,
                  undefined,
                  undefined,
                  true
                );
                const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
                const results = diagnostics.map((item) => SdTsDiagnosticUtil.convertDiagnosticsToResult("check", item)).filterExists();
                resultCacheMap.save(...results);
              }
              else {
                const diagnostics = program.getSemanticDiagnostics(sourceFile).concat(program.getSyntacticDiagnostics(sourceFile));
                const results = diagnostics.map((item) => SdTsDiagnosticUtil.convertDiagnosticsToResult("check", item)).filterExists();
                resultCacheMap.save(...results);
              }
            }
          }
          catch (err) {
            resultCacheMap.save({
              type: "check",
              filePath: targetInfo.filePath,
              severity: "error",
              message: targetInfo.filePath + "(0, 0): " + err.stack
            });
          }
        }

        worker.send("complete", resultCacheMap.results);
      });
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}