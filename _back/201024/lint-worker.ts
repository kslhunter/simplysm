import "source-map-support/register";

import { FsUtil, Logger, LoggerSeverity, SdProcessWorker } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdCliResultCacheMap } from "@simplysm/sd-cli/src/utils/SdCliResultCacheMap";
import * as path from "path";
import { SdCliTsProgramWatcher } from "@simplysm/sd-cli/src/build-tools/SdCliTsProgramWatcher";
import { SdCliLinter } from "@simplysm/sd-cli/src/build-tools/SdCliLinter";
import { SdCliPathUtil } from "@simplysm/sd-cli/src/utils/SdCliPathUtil";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const logger = Logger.get(["simplysm", "sd-cli", "lint-worker"]);

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
    const target = args[1] as "node" | "browser" | undefined;

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
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}