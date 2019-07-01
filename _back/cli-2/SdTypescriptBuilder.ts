import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs-extra";
import {FileWatcher} from "@simplysm/sd-core";
import * as chokidar from "chokidar";

export class SdTypescriptBuilder {
  public static watch(packageKey: string, run: (builder: SdTypescriptBuilder, changedInfos: { filePath: string, type: "dependency" | "add" | "change" | "unlink" }[]) => void): void {
    const builder = new SdTypescriptBuilder(packageKey);
    const sourceFiles = builder.getSourceFiles();
    run(
      builder,
      sourceFiles
        .map(sourceFile => ({
          filePath: sourceFile.fileName,
          type: "add"
        }))
    );

    const deps = builder.getDependencies();

    let watcher: chokidar.FSWatcher;

    const createWatcher = async () => {
      const watchFilePaths = [
        ...builder.getSourceFiles().map(item => item.fileName),
        ...deps
      ].distinct();

      watcher = await FileWatcher.watch(watchFilePaths, ["add", "change", "unlink"], async changedInfos => {
        if (watcher) {
          watcher.close();
        }

        const reloadTargetInfos = Object.clone(changedInfos);

        for (const changedInfo of changedInfos) {
          reloadTargetInfos.push(
            ...builder
              .getReverseDependencies(changedInfo.filePath)
              .map(item => ({filePath: item, type: "dependency"}))
          );

          builder.updateSourceFile(changedInfo.filePath);
        }

        run(
          builder,
          reloadTargetInfos
        );

        await createWatcher();
      });
    };

    createWatcher().catch(err => {
      console.error(err);
    });
  }

  private readonly _contextPath: string;
  private readonly _tsConfigPath: string;
  private readonly _parsedTsConfig: ts.ParsedCommandLine;
  private readonly _host: ts.CompilerHost;
  private readonly _program: ts.Program;
  private readonly _sourceFiles: ReadonlyArray<ts.SourceFile>;

  public constructor(packageKey: string) {
    this._contextPath = path.resolve("packages", packageKey);
    this._tsConfigPath = path.resolve(this._contextPath, "tsconfig.build.json");
    this._parsedTsConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(this._tsConfigPath), ts.sys, this._contextPath);
    this._host = ts.createCompilerHost(this._parsedTsConfig.options);
    this._program = ts.createProgram(this._parsedTsConfig.fileNames, this._parsedTsConfig.options, this._host);
    this._sourceFiles = this._program.getSourceFiles();
  }

  public getSourceFiles(): ReadonlyArray<ts.SourceFile> {
    return this._sourceFiles;
  }

  public updateSourceFile(filePath: string): void {
    this._host.getSourceFile()
  }
}
