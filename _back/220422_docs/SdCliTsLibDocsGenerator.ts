import { INpmConfig, ISdCliPackageBuildResult } from "../commons";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import path from "path";
import TypeDoc, { LogLevel } from "typedoc";
import { Wait } from "@simplysm/sd-core-common";

export class SdCliTsLibDocsGenerator {
  private readonly _logger: Logger;

  private readonly _app: TypeDoc.Application;

  private _isRunning = false;

  private _results: ISdCliPackageBuildResult[] = [];

  public constructor(private readonly _rootPath: string) {
    const npmConfig = FsUtil.readJson(path.resolve(this._rootPath, "package.json")) as INpmConfig;
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, npmConfig.name]);

    const tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    /*const tsconfig = FsUtil.readJson(tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);*/

    this._app = new TypeDoc.Application();

    this._app.options.addReader(new TypeDoc.TypeDocReader());
    this._app.options.addReader(new TypeDoc.TSConfigReader());

    this._app.logger.log = (message, logLevel) => {
      if (logLevel !== LogLevel.Warn && logLevel !== LogLevel.Error) {
        return;
      }

      this._results.push({
        filePath: undefined,
        line: undefined,
        char: undefined,
        code: undefined,
        severity: logLevel === LogLevel.Warn ? "warning" : "error",
        message: message
      });
    };

    this._app.bootstrap({
      tsconfig: tsconfigFilePath,
      entryPoints: [path.resolve(this._rootPath, "src/index.ts")],
      cleanOutputDir: true,
      watch: true,
      preserveWatchOutput: true
    });
  }

  public async runAsync(): Promise<ISdCliPackageBuildResult[]> {
    await Wait.until(() => !this._isRunning);
    this._isRunning = true;
    this._results = [];

    this._logger.debug(`TS 문서생성을 시작합니다.`);

    const outputDir = path.resolve(this._rootPath, "docs");

    const project = this._app.convert();
    if (!project) {
      this._isRunning = false;
      return this._results;
    }

    await this._app.generateDocs(project, outputDir);

    this._logger.debug(`TS 문서생성이 완료되었습니다.`);
    this._isRunning = false;
    return this._results;
  }
}
