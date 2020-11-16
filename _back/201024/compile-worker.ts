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

const logger = Logger.get(["simplysm", "sd-cli", "compile-worker"]);
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
    const distPath = SdCliPathUtil.getDistPath(rootPath, target);

    const resultCacheMap = new SdCliResultCacheMap();

    const npmConfig: INpmConfig = FsUtil.readJson(SdCliPathUtil.getNpmConfigFilePath(rootPath));
    const isForAngular = (
      target === "browser" && (
        (npmConfig.dependencies && Object.keys(npmConfig.dependencies).includes("@angular/core")) ||
        (npmConfig.devDependencies && Object.keys(npmConfig.devDependencies).includes("@angular/core")) ||
        (npmConfig.peerDependencies && Object.keys(npmConfig.peerDependencies).includes("@angular/core"))
      )
    ) ?? false;

    const tsconfig: ITsConfig = await FsUtil.readJsonAsync(SdCliPathUtil.getTsConfigBuildFilePath(rootPath, target));
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, rootPath);

    await new SdCliTsProgramWatcher(rootPath, target, isForAngular)
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
            const jsFilePath = path.resolve(distPath, path.relative(srcPath, targetInfo.filePath)).replace(/\.ts$/, ".js");
            const mapFilePath = jsFilePath + ".map";

            if (targetInfo.eventType === "unlink") {
              await Promise.all([
                FsUtil.removeAsync(jsFilePath),
                FsUtil.removeAsync(mapFilePath)
              ]);
            }
            else {
              const sourceFile = program.getSourceFile(targetInfo.filePath);
              if (sourceFile) {
                const transpileResult = ts.transpileModule(sourceFile.getFullText(), {
                  fileName: targetInfo.filePath,
                  compilerOptions: parsedTsconfig.options,
                  reportDiagnostics: true
                });

                const diagnostics = transpileResult.diagnostics;
                if (diagnostics) {
                  const results = diagnostics.map((item) => SdTsDiagnosticUtil.convertDiagnosticsToResult("compile", item)).filterExists();
                  resultCacheMap.save(...results);
                }

                if (transpileResult.sourceMapText === undefined) {
                  await FsUtil.removeAsync(mapFilePath);
                }
                else {
                  const sourceMap = JSON.parse(transpileResult.sourceMapText);
                  sourceMap.sources = [
                    path.relative(path.dirname(mapFilePath), targetInfo.filePath).replace(/\\/g, "/")
                  ];
                  const realSourceMapText = JSON.stringify(sourceMap);

                  await FsUtil.writeFileAsync(mapFilePath, realSourceMapText);
                }

                if (!transpileResult.outputText) {
                  await FsUtil.removeAsync(jsFilePath);
                }
                else {
                  await FsUtil.writeFileAsync(jsFilePath, transpileResult.outputText);
                }
              }
              else {
                await Promise.all([
                  FsUtil.removeAsync(jsFilePath),
                  FsUtil.removeAsync(mapFilePath)
                ]);
              }
            }
          }
          catch (err) {
            resultCacheMap.save({
              type: "compile",
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