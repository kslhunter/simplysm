import "source-map-support/register";

import { FsUtil, Logger, LoggerSeverity, SdProcessChildWorker } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import * as path from "path";
import * as ts from "typescript";
import { SdTsDiagnosticUtil } from "../utils/SdTsDiagnosticUtil";
import { SdCliResultCacheMap } from "../utils/SdCliResultCacheMap";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { SdCliTsProgramWatcher } from "../build-tools/SdCliTsProgramWatcher";
import { INpmConfig, ITsConfig } from "../commons";
import { SdCliLinter } from "../build-tools/SdCliLinter";
import * as ng from "@angular/compiler-cli";
import { SdCliNgModuleGenerator } from "../build-tools/SdCliNgModuleGenerator";
import { SdCliNgMetadataGenerator } from "../build-tools/SdCliNgMetadataGenerator";

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
  SdProcessChildWorker.defineWorker(async (worker, args) => {
    if (args[0] === "compile") {
      const rootPath = args[1] as string;
      const target = args[2] as "node" | "browser";

      const srcPath = SdCliPathUtil.getSourcePath(rootPath);

      const resultCacheMap = new SdCliResultCacheMap();

      const npmConfig: INpmConfig = FsUtil.readJson(SdCliPathUtil.getNpmConfigFilePath(rootPath));
      const isForAngular = (
        target === "browser" && (
          (npmConfig.dependencies && Object.keys(npmConfig.dependencies).includes("@angular/core")) ||
          (npmConfig.devDependencies && Object.keys(npmConfig.devDependencies).includes("@angular/core")) ||
          (npmConfig.peerDependencies && Object.keys(npmConfig.peerDependencies).includes("@angular/core"))
        )
      ) ?? false;

      const distPath = isForAngular ? path.resolve(rootPath, "dist") : SdCliPathUtil.getDistPath(rootPath, target);

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
    }
    else if (args[0] === "check") {
      const rootPath = args[1] as string;
      const target = args[2] as "node" | "browser" | undefined;

      const srcPath = SdCliPathUtil.getSourcePath(rootPath);

      const resultCacheMap = new SdCliResultCacheMap();

      const npmConfig: INpmConfig = await FsUtil.readJsonAsync(SdCliPathUtil.getNpmConfigFilePath(rootPath));
      const isForAngular = (
        target === "browser" && (
          (npmConfig.dependencies && Object.keys(npmConfig.dependencies).includes("@angular/core")) ||
          (npmConfig.devDependencies && Object.keys(npmConfig.devDependencies).includes("@angular/core")) ||
          (npmConfig.peerDependencies && Object.keys(npmConfig.peerDependencies).includes("@angular/core"))
        )
      ) ?? false;

      const typesPath = isForAngular ? path.resolve(rootPath, "dist") : SdCliPathUtil.getDistTypesPath(rootPath);

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
    }
    else if (args[0] === "lint") {
      const rootPath = args[1] as string;
      const target = args[2] as "node" | "browser" | undefined;

      const srcPath = SdCliPathUtil.getSourcePath(rootPath);

      const resultCacheMap = new SdCliResultCacheMap();

      const linter = new SdCliLinter(rootPath, target);

      // 일반 TARGET LINT
      if (target !== undefined) {
        let watchCount = 0;
        const emitChange = (): void => {
          if (watchCount === 0) {
            worker.send("change");
          }
          watchCount++;
        };
        const emitComplete = (): void => {
          watchCount--;
          if (watchCount === 0) {
            worker.send("complete", resultCacheMap.results);
          }
        };

        await new SdCliTsProgramWatcher(rootPath, target, false)
          .watchAsync(async (program, changeInfos) => {
            // 변경된 파일에 대한 이전 결과들 삭제
            for (const changeInfo of changeInfos) {
              resultCacheMap.delete(changeInfo.filePath);
            }

            // 현재 패키지의 소스코드고, .js혹은 .ts파일
            // 그리고 삭제되지 않은것
            const targetInfos = changeInfos
              .filter((item) => (
                item.eventType !== "unlink" &&
                FsUtil.isChildPath(item.filePath, srcPath) &&
                (item.filePath.endsWith(".js") || item.filePath.endsWith(".ts"))
              ));

            // 관련 파일이 없으면 그냥 RETURN
            if (targetInfos.length === 0) return;

            emitChange();

            const results = await linter.lintAsync(targetInfos.map((item) => item.filePath));
            resultCacheMap.save(...results);

            emitComplete();
          });

        // 패키지내의 TS와 상관없는 파일 LINT (lib 혹은 .eslintrc.js등)
        await FsUtil.watchAsync(
          path.resolve(rootPath, "**", "*.+(js|ts)"),
          async (changeInfos) => {
            // 소스파일 외의 파일들
            const targetInfos = changeInfos
              .filter((item) => (
                !(/[\\/]src[\\/]/).test(item.filePath) &&
                !(/[\\/]node_modules[\\/]/).test(item.filePath) &&
                !(/[\\/]dist.*[\\/]/).test(item.filePath)
              ));

            // 변경된 파일에 대한 이전 결과들 삭제
            for (const targetInfo of targetInfos) {
              resultCacheMap.delete(targetInfo.filePath);
            }

            // 관련 파일이 없으면 그냥 RETURN
            if (targetInfos.length === 0) return;

            emitChange();

            const results = await linter.lintAsync(targetInfos.map((item) => item.filePath));
            resultCacheMap.save(...results);

            emitComplete();
          },
          (err) => {
            logger.error(err);
          },
          { useFirstRun: true }
        );
      }
      // TARGET이 없는 패키지 (JS 혹은 types 패키지등) LINT
      else {
        await FsUtil.watchAsync(
          path.resolve(rootPath, "**", "*.+(js|ts)"),
          async (changeInfos) => {
            // 변경된 파일에 대한 이전 결과들 삭제
            for (const changeInfo of changeInfos) {
              resultCacheMap.delete(changeInfo.filePath);
            }

            // 소스라 할 수 있는 파일들
            const targetInfos = changeInfos
              .filter((item) => (
                !(/[\\/]node_modules[\\/]/).test(item.filePath) &&
                !(/[\\/]dist.*[\\/]/).test(item.filePath)
              ));

            // 관련 파일이 없으면 그냥 RETURN
            if (targetInfos.length === 0) return;

            worker.send("change");

            const results = await linter.lintAsync(targetInfos.map((item) => item.filePath));
            resultCacheMap.save(...results);

            worker.send("complete", resultCacheMap.results);
          },
          (err) => {
            logger.error(err);
          },
          { useFirstRun: true }
        );
      }
    }
    else if (args[0] === "ng-gen") {
      const rootPath = args[1] as string;

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

          // GET METADATA
          if (genMetadataTargetInfos.length > 0) {
            for (const genMetadataTargetInfo of genMetadataTargetInfos) {
              try {
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
              catch (err) {
                resultCacheMap.save({
                  type: "metadata",
                  filePath: genMetadataTargetInfo.filePath,
                  severity: "error",
                  message: genMetadataTargetInfo.filePath + "(0, 0): " + err.stack
                });
              }
            }
          }

          // GEN NgModule
          if (genNgModuleTargetInfos.length > 0) {
            for (const genNgModuleTargetInfo of genNgModuleTargetInfos) {
              try {
                if (genNgModuleTargetInfo.eventType !== "unlink") {
                  const sourceFile = program.getSourceFile(genNgModuleTargetInfo.filePath);
                  if (!sourceFile) continue;
                  await ngModuleGenerator.registerAsync(sourceFile, metadataCacheMap.get(genNgModuleTargetInfo.filePath));
                }
                else {
                  await ngModuleGenerator.deleteAsync(genNgModuleTargetInfo.filePath);
                }
              }
              catch (err) {
                resultCacheMap.save({
                  type: "metadata",
                  filePath: genNgModuleTargetInfo.filePath,
                  severity: "error",
                  message: genNgModuleTargetInfo.filePath + "(0, 0): " + err.stack
                });
              }
            }
            try {
              const results = await ngModuleGenerator.genAsync();
              resultCacheMap.save(...results);
            }
            catch (err) {
              resultCacheMap.save({
                type: "metadata",
                filePath: undefined,
                severity: "error",
                message: err.stack
              });
            }
          }

          worker.send("complete", resultCacheMap.results);
        });
    }
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}