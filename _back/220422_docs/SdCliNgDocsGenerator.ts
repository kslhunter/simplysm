import { INpmConfig, ISdCliPackageBuildResult } from "../commons";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import path from "path";
import ts from "typescript";
import compodoc from "@compodoc/compodoc";

export class SdCliNgDocsGenerator {
  private readonly _logger: Logger;

  private readonly _app: compodoc.Application;

  public constructor(private readonly _rootPath: string) {
    const npmConfig = FsUtil.readJson(path.resolve(this._rootPath, "package.json")) as INpmConfig;
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, npmConfig.name]);

    const tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    const tsconfig = FsUtil.readJson(tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);

    const outputDir = path.resolve(this._rootPath, "docs");

    this._app = new compodoc.Application({
      tsconfig: tsconfigFilePath,
      output: outputDir,
      silent: true
    });

    this._app.setFiles(parsedTsconfig.fileNames);
  }

  public async runAsync(changedFiles?: string[]): Promise<ISdCliPackageBuildResult[]> {
    try {
      this._logger.debug(`TS 문서생성을 시작합니다.`);

      if (changedFiles && changedFiles.length > 0) {
        this._app.setUpdatedFiles(changedFiles);

        if (Boolean(this._app.hasWatchedFilesTSFiles())) {
          this._app.getMicroDependenciesData();
        }
        else if (Boolean(this._app.hasWatchedFilesRootMarkdownFiles())) {
          this._app.rebuildRootMarkdowns();
        }
        else {
          this._app.rebuildExternalDocumentation();
        }
      }
      else {
        await this._app.generate();
      }

      this._logger.debug(`TS 문서생성이 완료되었습니다.`);
      return [];
    }
    catch (err) {
      return [{
        filePath: undefined,
        line: undefined,
        char: undefined,
        code: undefined,
        severity: "error",
        message: err.stack
      }];
    }
  }
}
