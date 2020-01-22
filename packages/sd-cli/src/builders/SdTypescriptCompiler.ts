import {FsUtil, FsWatcher, IFileChangeInfo, Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";
import {MetadataCollector} from "@angular/compiler-cli";
import {TSdFramework} from "../commons";
import {SdAngularUtils} from "../utils/SdAngularUtils";

export class SdTypescriptCompiler {
  private constructor(private readonly _srcPath: string,
                      private readonly _distPath: string,
                      private readonly _compilerOptions: ts.CompilerOptions,
                      private readonly _framework: TSdFramework | undefined,
                      private readonly _scriptTarget: ts.ScriptTarget,
                      private readonly _packagePath: string,
                      private readonly _logger: Logger) {
  }

  public static async createAsync(argv: {
    tsConfigPath: string;
    framework: TSdFramework | undefined;
  }): Promise<SdTypescriptCompiler> {
    const tsConfigPath = argv.tsConfigPath;
    const framework = argv.framework;

    const packagePath = path.dirname(argv.tsConfigPath);

    const tsConfig = await fs.readJson(tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));
    const scriptTarget = parsedTsConfig.options.target;
    const isNode = scriptTarget !== ts.ScriptTarget.ES5;

    if (tsConfig.files) {
      throw new Error("라이브러리 패키지의 'tsConfig.json'에는 'files'가 정의되어 있지 않아야 합니다.");
    }

    const srcPath = parsedTsConfig.options.sourceRoot
      ? path.resolve(parsedTsConfig.options.sourceRoot)
      : path.resolve(packagePath, "src");

    const distPath = parsedTsConfig.options.outDir
      ? path.resolve(parsedTsConfig.options.outDir)
      : path.resolve(packagePath, "dist");

    const logger = Logger.get(
      [
        "simplysm",
        "sd-cli",
        path.basename(packagePath),
        isNode ? "node" : "browser",
        "compile"
      ]
    );

    return new SdTypescriptCompiler(
      srcPath,
      distPath,
      parsedTsConfig.options,
      framework,
      scriptTarget ?? ts.ScriptTarget.ES2018,
      packagePath,
      logger
    );
  }

  public async runAsync(watch: boolean): Promise<void> {
    if (watch) {
      this._logger.log("컴파일 및 변경감지를 시작합니다.");
    }
    else {
      this._logger.log("컴파일를 시작합니다.");
    }

    const scssDepsObj: { [tsFilePath: string]: string[] } = {};

    const buildAsync = async (changedInfos: IFileChangeInfo[]) => {
      for (const changedInfo of changedInfos) {
        try {
          const tsFilePath = changedInfo.filePath;
          const tsFileRelativePath = path.relative(this._srcPath, changedInfo.filePath);
          const jsFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".js");
          const jsFilePath = path.resolve(this._distPath, jsFileRelativePath);
          const mapFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".js.map");
          const mapFilePath = path.resolve(this._distPath, mapFileRelativePath);

          if (changedInfo.type === "unlink") {
            if (await fs.pathExists(jsFilePath)) {
              await fs.remove(jsFilePath);
            }
            if (await fs.pathExists(mapFilePath)) {
              await fs.remove(mapFilePath);
            }

            delete scssDepsObj[tsFilePath];
          }
          else {
            let tsFileContent = await fs.readFile(tsFilePath, "utf-8");
            if (this._framework?.startsWith("angular")) {
              try {
                const scssResult = SdAngularUtils.replaceScssToCss(tsFilePath, tsFileContent);
                tsFileContent = scssResult.content;

                scssDepsObj[tsFilePath] = scssResult.dependencies.map((item) => path.resolve(item));
              }
              catch (err) {
                this._logger.error("SCSS 컴파일 오류\n", err.formatted || err);
              }
            }

            const result = ts.transpileModule(tsFileContent, {
              compilerOptions: this._compilerOptions
            });

            const diagnostics = result.diagnostics?.filter((item) => !item.messageText.toString().includes("Emitted no files.")) ?? [];

            if (this._framework?.startsWith("angular")) {
              const sourceFile = ts.createSourceFile(tsFilePath, tsFileContent, this._scriptTarget);
              if (sourceFile) {
                diagnostics.concat(await this._generateMetadataFileAsync(sourceFile));
              }
            }

            if (diagnostics.length > 0) {
              const messages = diagnostics.map((diagnostic) => SdTypescriptUtils.getDiagnosticMessage(diagnostic));

              const warningTextArr = messages.filter((item) => item.severity === "warning")
                .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

              const errorTextArr = messages.filter((item) => item.severity === "error")
                .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

              if (warningTextArr.length > 0) {
                this._logger.warn("컴파일 경고\n", warningTextArr.join("\n").trim());
              }

              if (errorTextArr.length > 0) {
                this._logger.error("컴파일 오류\n", errorTextArr.join("\n").trim());
              }
            }

            if (result.outputText) {
              await fs.mkdirs(path.dirname(jsFilePath));
              await fs.writeFile(jsFilePath, result.outputText);
            }
            else if (await fs.pathExists(jsFilePath)) {
              await fs.remove(jsFilePath);
            }
            if (result.sourceMapText) {
              await fs.mkdirs(path.dirname(mapFilePath));
              await fs.writeFile(mapFilePath, result.sourceMapText);
            }
            else if (await fs.pathExists(mapFilePath)) {
              await fs.remove(mapFilePath);
            }
          }
        }
        catch (err) {
          this._logger.error("컴파일중에 오류가 발생했습니다. \n", err);
        }
      }
    };

    const watchPaths = [path.resolve(this._srcPath, "**", "*.ts")];
    if (this._framework?.startsWith("angular")) {
      watchPaths.push(path.resolve(this._packagePath, "scss", "**", "*.scss"));
    }

    await FsWatcher.watch(
      watchPaths,
      async (changedInfos) => {
        const newChangedInfos = changedInfos.mapMany((changedInfo) => {
          if (path.extname(changedInfo.filePath) === ".scss") {
            const filePaths = Object.keys(scssDepsObj).filter((key) => scssDepsObj[key].includes(changedInfo.filePath));
            return filePaths.map((filePath) => ({type: "change" as "change", filePath}));
          }
          return [changedInfo];
        }).distinct();

        if (newChangedInfos.length < 1) {
          return;
        }

        this._logger.log("컴파일에 대한 변경사항이 감지되었습니다.");

        await buildAsync(newChangedInfos);

        this._logger.log("컴파일이 완료되었습니다.");
      },
      (err) => {
        this._logger.error("변경감지 작업중 오류 발생\n", err);
      }
    );

    const fileList = await FsUtil.globAsync(path.resolve(this._srcPath, "**", "*.ts"));
    await buildAsync(fileList.map((item) => ({filePath: item, type: "add"})));

    this._logger.log("컴파일이 완료되었습니다.");
  }

  private async _generateMetadataFileAsync(sourceFile: ts.SourceFile): Promise<ts.Diagnostic[]> {
    const diagnostics: ts.Diagnostic[] = [];

    if (path.resolve(sourceFile.fileName).startsWith(path.resolve(this._packagePath, "src"))) {
      const metadata = new MetadataCollector().getMetadata(
        sourceFile,
        true, //TODO: 원래 false 였음 확인 필요
        (value, tsNode) => {
          if (value && value["__symbolic"] && value["__symbolic"] === "error") {
            diagnostics.push({
              file: sourceFile,
              start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
              messageText: value["message"],
              category: ts.DiagnosticCategory.Error,
              code: 0,
              length: undefined
            });
          }

          return value;
        }
      );

      const outFilePath = path.resolve(this._distPath, path.relative(path.resolve(this._packagePath, "src"), sourceFile.fileName))
        .replace(/\.ts$/, ".metadata.json");
      if (metadata) {
        const metadataJsonString = JSON.stringify(metadata);
        await fs.mkdirs(path.dirname(outFilePath));
        await fs.writeFile(outFilePath, metadataJsonString);
      }
      else {
        await fs.remove(outFilePath);
      }
    }

    return diagnostics;
  }
}
