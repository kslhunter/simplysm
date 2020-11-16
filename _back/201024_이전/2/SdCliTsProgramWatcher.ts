import * as ts from "typescript";
import { SdCliPathUtil } from "../..";
import * as path from "path";
import { ObjectUtil } from "@simplysm/sd-core-common";

/**
 * TS Program의 WATCH 모듈
 */
export class SdCliTsProgramWatcher {
  public constructor(private readonly _rootPath: string,
                     private readonly _target: "node" | "browser" | undefined) {
  }

  public async watchAsync(callback: (program: ts.Program | ts.SemanticDiagnosticsBuilderProgram, changeInfos: ISdTsProgramChangeInfo[]) => (void | Promise<void>)): Promise<void> {
    const tsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this._rootPath, this._target);

    const watchHost = ts.createWatchCompilerHost(
      tsconfigFilePath,
      {},
      ts.sys,
      ts.createSemanticDiagnosticsBuilderProgram,
      (diag) => {
      },
      (diag) => {
      }
    );

    let oldFileVersionMap: Map<string, string>;

    const origCreateProgram = watchHost.createProgram;
    watchHost.createProgram = (rootNames, options, host, oldProgram) => {
      oldFileVersionMap = oldProgram
        ?.getSourceFiles()
        .toMap((item) => path.normalize(item.fileName), (item) => item["version"] as string) ?? new Map<string, string>();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    watchHost.afterProgramCreate = async (program) => {
      const currOldFileVersionMap = ObjectUtil.clone(oldFileVersionMap);

      const currFileVersionMap = program.getSourceFiles()
        .toMap((item) => path.normalize(item.fileName), (item) => item["version"] as string);

      // 변경 목록 구성
      const changeInfos: ISdTsProgramChangeInfo[] = [];

      for (const filePath of Array.from(currFileVersionMap.keys())) {
        const oldVersion = currFileVersionMap.get(filePath);

        if (oldVersion === undefined) {
          changeInfos.push({ filePath, eventType: "change" });
        }
        else if (oldVersion !== currOldFileVersionMap.get(filePath)) {
          changeInfos.push({ filePath, eventType: "change" });
        }
      }

      for (const filePath of Array.from(currOldFileVersionMap.keys())) {
        if (!currFileVersionMap.has(filePath)) {
          changeInfos.push({ filePath, eventType: "unlink" });
        }
      }

      const revDepFilePaths = program.getSourceFiles()
        .filter((item) => program.getAllDependencies(item).some((dep) => changeInfos.some((changeInfo) => changeInfo.filePath === dep)))
        .map((item) => path.normalize(item.fileName));

      for (const revDepFilePath of revDepFilePaths) {
        if (!changeInfos.some((item) => item.filePath === revDepFilePath)) {
          changeInfos.push({
            eventType: "dependency",
            filePath: revDepFilePath
          });
        }
      }

      await callback(program, changeInfos);
    };

    ts.createWatchProgram(watchHost);
  }
}

export interface ISdTsProgramChangeInfo {
  eventType: "change" | "unlink" | "dependency";
  filePath: string;
}