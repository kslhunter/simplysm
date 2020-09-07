import {ISdPackageInfo, ITsConfig} from "../commons";
import {FsUtils, FsWatcher, IFileChangeInfo, Logger} from "@simplysm/sd-core-node/src";
import * as path from "path";
import * as ts from "typescript";
import {NeverEntryError, NotImplementError} from "@simplysm/sd-core-common";
import {EventEmitter} from "events";
import * as os from "os";
import anymatch from "anymatch";
import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import {CLIEngine} from "eslint";
import {SdAngularUtils} from "./SdAngularUtils";
import {SdNgGenerator} from "./SdNgGenerator";

export class SdPackageBuilder extends EventEmitter {
  private readonly _logger = Logger.get([
    "simplysm",
    "sd-cli",
    "package-builder",
    this._info.npmConfig.name,
    ...this._target !== undefined ? [this._target] : []
  ]);

  private readonly _additionalDepMapObj: { [key: string]: string[] | undefined } = {};

  private readonly _outputCache: { [key: string]: string | undefined } = {};

  private _builderProgram?: ts.BuilderProgram;

  private _getParsedTsConfig(): ts.ParsedCommandLine {
    if (this._target === undefined) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild[this._target]) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild[this._target]!.parsedConfig) throw new NeverEntryError();
    return this._info.tsConfigForBuild[this._target]!.parsedConfig!;
  }

  private _getTsConfigPath(): string | undefined {
    if (this._target === undefined) return undefined;
    if (!this._info.tsConfigForBuild) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild[this._target]) throw new NeverEntryError();
    return this._info.tsConfigForBuild[this._target]!.filePath;
  }

  private _getTsConfig(): ITsConfig {
    if (this._target === undefined) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild[this._target]) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild[this._target]!.config) throw new NeverEntryError();
    return this._info.tsConfigForBuild[this._target]!.config!;
  }

  private _getSrcPath(): string {
    if (this._getTsConfigPath() !== undefined) {
      const parsedTsConfig = this._getParsedTsConfig();
      return parsedTsConfig.options.rootDir !== undefined ?
        path.resolve(parsedTsConfig.options.rootDir) :
        path.resolve(this._info.rootPath, "src");
    }
    else {
      return this._info.rootPath;
    }
  }

  private _getDistPath(): string {
    const parsedTsConfig = this._getParsedTsConfig();
    return parsedTsConfig.options.outDir !== undefined ?
      path.resolve(parsedTsConfig.options.outDir) :
      path.resolve(this._info.rootPath, "dist");
  }

  private _ngGenerator?: SdNgGenerator;

  private _getNgGenerator(): SdNgGenerator {
    if (!this._ngGenerator) {
      const srcPath = this._getSrcPath();
      this._ngGenerator = new SdNgGenerator(srcPath, [srcPath]);
    }
    return this._ngGenerator;
  }

  private get _isAngularLibrary(): boolean {
    return this._info.config?.type === "library" &&
      this._info.npmConfig.dependencies !== undefined &&
      Object.keys(this._info.npmConfig.dependencies).includes("@angular/core");
  }

  public constructor(private readonly _info: ISdPackageInfo,
                     private readonly _command: string,
                     private readonly _target: "browser" | "node" | undefined,
                     private readonly _devMode: boolean) {
    super();
  }

  public on(event: "change", listener: (filePaths?: string[]) => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async runAsync(): Promise<void> {
    if (this._command === "gen-index") {
      await this._watchFilesAsync(async changedInfos => await this._genIndexAsync(changedInfos));
    }
    else if (this._command === "check") {
      await this._watchAsync(async changedInfos => await this._checkAsync(changedInfos));
    }
    else if (this._command === "lint") {
      await this._watchAsync(changedInfos => this._lint(changedInfos));
    }
    else if (this._command === "compile") {
      await this._watchAsync(async changedInfos => await this._compileAsync(changedInfos));
    }
    /*else if (this._command === "compile-webpack") {
      await this._watchWebpackAsync();
    }*/
    else if (this._command === "gen-ng") {
      await this._watchAsync(async changedInfos => await this._genNgAsync(changedInfos), true);
    }
    else {
      throw new NotImplementError();
    }
  }

  private async _genIndexAsync(changedInfos: IFileChangeInfo[]): Promise<ISdPackageBuildResult[]> {
    if (this._info.npmConfig.main === undefined) throw new NeverEntryError();
    if (this._info.config?.type !== "library") throw new NeverEntryError();

    const srcPath = this._getSrcPath();
    const distPath = this._getDistPath();

    const indexTsFilePath = path.resolve(
      srcPath,
      path.relative(
        distPath,
        path.resolve(
          this._info.rootPath,
          this._info.npmConfig.main
        )
      )
    ).replace(/\.js$/, ".ts");

    if (this._outputCache[indexTsFilePath] === undefined && FsUtils.exists(indexTsFilePath)) {
      this._outputCache[indexTsFilePath] = await FsUtils.readFileAsync(indexTsFilePath);
    }

    const excludes: string[] = this._getTsConfig().files?.map((item: string) => path.resolve(this._info.rootPath, item)) ?? [];

    const polyfills = this._info.config.polyfills ?? [];

    if (changedInfos.every(item => excludes.includes(item.filePath))) {
      return [];
    }

    this._logger.debug("'index.ts' 파일 생성 시작...");

    const importTexts: string[] = [];
    for (const polyfill of polyfills) {
      importTexts.push(`import "${polyfill}";`);
    }

    const srcTsFiles = await FsUtils.globAsync(path.resolve(srcPath, "**", "*.ts"));
    for (const srcTsFile of srcTsFiles) {
      if (path.resolve(srcTsFile) === indexTsFilePath) {
        continue;
      }
      if (excludes.some(item => path.resolve(item) === path.resolve(srcTsFile))) {
        continue;
      }

      const requirePath = path.relative(path.dirname(indexTsFilePath), srcTsFile)
        .replace(/\\/g, "/")
        .replace(/\.ts$/, "");

      const sourceTsFileContent = await FsUtils.readFileAsync(srcTsFile);
      if (sourceTsFileContent.split("\n").some(line => line.startsWith("export "))) {
        importTexts.push(`export * from "./${requirePath}";`);
      }
      else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join(os.EOL) + os.EOL;
    if (this._outputCache[indexTsFilePath] !== content) {
      this._outputCache[indexTsFilePath] = content;
      await FsUtils.writeFileAsync(indexTsFilePath, content);
    }

    this._logger.debug("'index.ts' 파일 생성 완료");
    return [];
  }

  private async _checkAsync(changedInfos: IFileChangeInfo[]): Promise<ISdPackageBuildResult[]> {
    if (!this._builderProgram) throw new NeverEntryError();

    this._logger.debug("타입체크 시작...");

    const results: ISdPackageBuildResult[] = [];

    const program = this._builderProgram.getProgram();
    const parsedTsConfig = this._getParsedTsConfig();

    const srcPath = this._getSrcPath();
    const distPath = this._getDistPath();

    for (const changedInfo of changedInfos) {
      if (changedInfo.type === "unlink") {
        const declFilePath = path.resolve(distPath, path.relative(srcPath, changedInfo.filePath))
          .replace(/\.ts$/, ".d.ts");
        await FsUtils.removeAsync(declFilePath);
        delete this._outputCache[declFilePath];

        if (this._isAngularLibrary) {
          const metadataFilePath = path.resolve(distPath, path.relative(srcPath, changedInfo.filePath))
            .replace(/\.ts$/, ".metadata.json");
          await FsUtils.removeAsync(metadataFilePath);
          delete this._outputCache[metadataFilePath];
        }
        return [];
      }

      const diagnostics: ts.Diagnostic[] = [];

      const sourceFile = program.getSourceFile(changedInfo.filePath);
      if (!sourceFile) throw new NeverEntryError();

      if (this._isAngularLibrary) {
        // metadata

        const metadataFilePath = path.resolve(distPath, path.relative(srcPath, changedInfo.filePath))
          .replace(/\.ts$/, ".metadata.json");

        const metadata = new MetadataCollector().getMetadata(
          sourceFile,
          true,
          (value, tsNode) => {
            if (isMetadataError(value)) {
              results.push(...this._convertDiagnosticsToResults([
                {
                  file: sourceFile,
                  start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
                  messageText: value.message,
                  category: ts.DiagnosticCategory.Error,
                  code: 0,
                  length: undefined
                }
              ]));
            }

            return value;
          }
        );

        // write: metadata

        if (metadata) {
          const metadataJson = JSON.stringify(metadata);
          if (this._outputCache[metadataFilePath] !== metadataJson) {
            this._outputCache[metadataFilePath] = metadataJson;
            await FsUtils.writeFileAsync(metadataFilePath, metadataJson);
          }
        }
        else {
          delete this._outputCache[metadataFilePath];
          await FsUtils.removeAsync(metadataFilePath);
        }
      }

      // check / decl

      if (parsedTsConfig.options.declaration) {
        diagnostics.push(...ts.getPreEmitDiagnostics(program, sourceFile));
        const emitResult = program.emit(
          sourceFile,
          undefined,
          undefined,
          true,
          undefined
        );
        diagnostics.push(...emitResult.diagnostics);
      }
      else {
        diagnostics.push(...program.getSemanticDiagnostics(sourceFile));
        diagnostics.push(...program.getSyntacticDiagnostics(sourceFile));
      }

      results.push(...this._convertDiagnosticsToResults(diagnostics));
    }

    this._logger.debug("타입체크 완료");
    return results;
  }

  private _lint(changedInfos: IFileChangeInfo[]): ISdPackageBuildResult[] {
    this._logger.debug("규칙체크 시작...");

    const srcPath = this._getSrcPath();

    const lintConfig = this._target !== undefined && this._info.tsConfigForBuild?.[this._target] !== undefined ?
      {
        parserOptions: {
          project: path.basename(this._info.tsConfigForBuild[this._target]!.filePath),
          tsconfigRootDir: this._info.rootPath
        }
      } :
      {};

    const lintEngine = new CLIEngine({
      cache: true,
      cacheFile: path.resolve(this._info.rootPath, ".eslintcache"),
      ...lintConfig
    });

    const anymatchPath = path.resolve(srcPath, "**", "+(*.ts|*.js)");
    const filePaths = changedInfos
      .filter(item => item.type !== "unlink" && anymatch(anymatchPath.replace(/\\/g, "/"), item.filePath.replace(/\\/g, "/")))
      .map(item => item.filePath)
      .distinct();

    let results: ISdPackageBuildResult[];

    try {
      const reports = lintEngine.executeOnFiles(filePaths).results;

      results = reports.mapMany(report => report.messages.map(msg => {
        const severity: "warning" | "error" = msg.severity === 1 ? "warning" : "error";

        return {
          filePath: report.filePath,
          severity,
          message: `${report.filePath}(${msg.line}, ${msg.column}): ${msg.ruleId ?? ""}: ${severity} ${msg.message}`
        };
      }));
    }
    catch (err) {
      results = [{
        filePath: undefined,
        severity: "error",
        message: err.stack
      }];
    }

    this._logger.debug("규칙체크 완료");
    return results;
  }

  private async _compileAsync(changedInfos: IFileChangeInfo[]): Promise<ISdPackageBuildResult[]> {
    if (!this._builderProgram) throw new NeverEntryError();

    this._logger.debug("컴파일 시작...");

    const srcPath = this._getSrcPath();
    const distPath = this._getDistPath();

    const results: ISdPackageBuildResult[] = [];

    for (const changedInfo of changedInfos) {
      delete this._additionalDepMapObj[changedInfo.filePath];
    }

    // const program = this._builderProgram.getProgram();
    const parsedTsConfig = this._getParsedTsConfig();

    for (const changedInfo of changedInfos) {
      const jsFilePath = path.resolve(distPath, path.relative(srcPath, changedInfo.filePath)).replace(/\.ts$/, ".js");
      const mapFilePath = jsFilePath + ".map";

      if (changedInfo.type === "unlink") {
        await FsUtils.removeAsync(jsFilePath);
        await FsUtils.removeAsync(mapFilePath);
        delete this._outputCache[jsFilePath];
        delete this._outputCache[mapFilePath];
        return [];
      }

      // const sourceFile = program.getSourceFile(changedInfo.filePath);
      // if (!sourceFile) throw new NeverEntryError();
      // const fileContent = sourceFile.getFullText();
      const fileContent = await FsUtils.readFileAsync(changedInfo.filePath);

      // transpile
      const transpileResult = ts.transpileModule(fileContent, {
        fileName: changedInfo.filePath,
        compilerOptions: parsedTsConfig.options
      });

      if (transpileResult.diagnostics) {
        results.push(...this._convertDiagnosticsToResults(transpileResult.diagnostics));
      }

      // write: transpile: js

      if (transpileResult.outputText === undefined) {
        await FsUtils.removeAsync(jsFilePath);
      }
      else if (this._outputCache[jsFilePath] !== transpileResult.outputText) {
        await FsUtils.mkdirsAsync(path.dirname(jsFilePath));
        await FsUtils.writeFileAsync(jsFilePath, transpileResult.outputText);
        this._outputCache[jsFilePath] = transpileResult.outputText;
      }

      // write: transpile: sourcemap

      if (transpileResult.sourceMapText === undefined) {
        await FsUtils.removeAsync(mapFilePath);
      }
      else if (this._outputCache[mapFilePath] !== transpileResult.sourceMapText) {
        await FsUtils.mkdirsAsync(path.dirname(mapFilePath));
        await FsUtils.writeFileAsync(mapFilePath, transpileResult.sourceMapText);
        this._outputCache[mapFilePath] = transpileResult.sourceMapText;
      }
    }

    this._logger.debug("컴파일 완료");
    return results.distinct();
  }

  /*private async _watchWebpackAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const webpackConfig = this._getWebpackConfig();
      const compiler = webpack(webpackConfig);

      compiler.hooks.watchRun.tap("SdPackageBuilder", () => {
        this._logger.debug("WEBPACK 컴파일 시작...");
        this.emit("change");
      });

      compiler.watch({}, (err: Error | null, stats) => {
        if (err) {
          this._logger.error(err);
          reject(err);
          return;
        }

        const results: ISdPackageBuildResult[] = [];

        const info = stats.toJson("errors-warnings");

        if (stats.hasWarnings()) {
          results.push(
            ...info.warnings.map(item => ({
              filePath: undefined,
              severity: "warning" as const,
              message: item.startsWith("(undefined)") ? item.split("\n").slice(1).join(os.EOL) : item
            }))
          );
        }

        if (stats.hasErrors()) {
          results.push(
            ...info.errors.map(item => ({
              filePath: undefined,
              severity: "error" as const,
              message: item.startsWith("(undefined)") ? item.split("\n").slice(1).join(os.EOL) : item
            }))
          );
        }

        this._logger.debug("WEBPACK 컴파일 완료");
        this.emit("complete", results);
        resolve();
      });
    });
  }*/

  private async _watchAsync(cb: (changedInfos: IFileChangeInfo[]) => Promise<ISdPackageBuildResult[]> | ISdPackageBuildResult[], includeExternalChanges?: boolean): Promise<void> {
    const tsConfigPath = this._getTsConfigPath();
    if (tsConfigPath === undefined) {
      await this._watchFilesAsync(cb);
      return;
    }

    let watchCache: string[] = [];
    let watchProgram: ts.WatchOfConfigFile<any> | undefined;
    let changedInfos: IFileChangeInfo[] = [];

    const srcPath = this._getSrcPath();

    const host = ts.createWatchCompilerHost(
      tsConfigPath,
      {},
      {
        ...ts.sys,
        useCaseSensitiveFileNames: true,
        readFile: (filePath: string, encoding?: string): string | undefined => {
          const content = ts.sys.readFile(filePath, encoding);
          if (content === undefined) return undefined;

          try {
            const scssResult = SdAngularUtils.replaceScssToCss(filePath, content);
            const newContent = scssResult.content;
            this._additionalDepMapObj[filePath] = this._additionalDepMapObj[filePath] ?? [];
            this._additionalDepMapObj[filePath]!.push(...scssResult.dependencies);
            return newContent;
          }
          catch (err) {
            this._logger.error(err);
            return content;
          }
        }
      },
      ts.createSemanticDiagnosticsBuilderProgram,
      () => {
      },
      () => {
      }
    );

    host.afterProgramCreate = async (builderProgram): Promise<void> => {
      this._builderProgram = builderProgram;

      // bug-fix
      if (watchProgram) {
        if (changedInfos.some(changedInfo => (
          changedInfo.type !== "unlink" &&
          !builderProgram.getSourceFile(changedInfo.filePath) &&
          path.resolve(changedInfo.filePath) !== tsConfigPath
        ))) {
          watchProgram.close();
          watchProgram = undefined;
          watchProgram = ts.createWatchProgram(host);
          return;
        }
      }

      let newChangeInfos: IFileChangeInfo[] = [];
      for (const changedInfo of changedInfos) {
        if (includeExternalChanges || !path.relative(srcPath, changedInfo.filePath).includes("..")) {
          newChangeInfos.push(changedInfo);
        }

        const sourceFiles = this._builderProgram.getSourceFiles();
        for (const sourceFile of sourceFiles) {
          const sourceFilePath = path.resolve(sourceFile.fileName);
          const deps = Array.from(this._builderProgram.getAllDependencies(sourceFile));
          if (this._additionalDepMapObj[sourceFilePath]) {
            deps.push(...this._additionalDepMapObj[sourceFilePath]!);
          }

          if (!newChangeInfos.some(item => item.filePath === sourceFilePath)) {
            for (const dep of deps) {
              if (changedInfo.filePath === path.resolve(dep)) {
                newChangeInfos.push({
                  type: "change",
                  filePath: sourceFilePath
                });
              }
            }
          }
        }
      }
      changedInfos = [];

      if (!includeExternalChanges) {
        newChangeInfos = newChangeInfos.filter(item => !path.relative(srcPath, item.filePath).includes(".."));
      }

      watchCache.remove(item => newChangeInfos.filter(item1 => item1.type === "unlink").some(item1 => item1.filePath === item));
      watchCache.push(...newChangeInfos.filter(item => item.type !== "unlink").map(item => item.filePath));
      watchCache = watchCache.distinct();
      const unlinkFilePaths = watchCache.filter(item => !this._builderProgram?.getSourceFile(item));
      for (const unlinkFilePath of unlinkFilePaths) {
        newChangeInfos.push({
          type: "unlink",
          filePath: unlinkFilePath
        });
      }

      this.emit("change", newChangeInfos.map(item => item.filePath));
      const results = await cb(newChangeInfos);
      this.emit("complete", results);
    };

    const prevWatchFile = host.watchFile;
    host.watchFile = (filePath: string, callback: ts.FileWatcherCallback, pollingInterval?: number): ts.FileWatcher => {
      changedInfos.push({type: FsUtils.exists(filePath) ? "add" : "unlink", filePath: path.resolve(filePath)});

      return prevWatchFile(
        filePath,
        (fileName, eventKind) => {
          callback(fileName, eventKind);

          changedInfos.push({
            type: eventKind === ts.FileWatcherEventKind.Created ? "add" :
              eventKind === ts.FileWatcherEventKind.Changed ? "change" :
                "unlink",
            filePath: path.resolve(fileName)
          });
        },
        pollingInterval
      );
    };

    watchProgram = ts.createWatchProgram(host);
  }

  private async _watchFilesAsync(cb: (changedInfos: IFileChangeInfo[]) => Promise<ISdPackageBuildResult[]> | ISdPackageBuildResult[]): Promise<void> {
    const srcPath = this._getSrcPath();

    const watchPath = path.resolve(srcPath, "**", "*.ts");
    await FsWatcher.watchAsync(watchPath, async changedInfos => {
      this.emit("change", changedInfos.map(item => item.filePath));
      const results = await cb(changedInfos);
      this.emit("complete", results);
    }, err => {
      this._logger.error(err);
    });

    const changedInfos = (await FsUtils.globAsync(watchPath)).map(item => ({type: "add" as const, filePath: item}));
    this.emit("change", changedInfos.map(item => item.filePath));
    const results = await cb(changedInfos);
    this.emit("complete", results);
  }

  private async _genNgAsync(changedInfos: IFileChangeInfo[]): Promise<ISdPackageBuildResult[]> {
    if (!this._builderProgram) throw new NeverEntryError();

    const ngGenerator = this._getNgGenerator();
    const diagnostics = await ngGenerator.updateAsync(this._builderProgram, changedInfos);

    await ngGenerator.emitAsync();

    return this._convertDiagnosticsToResults(diagnostics);
  }

  /*private _getWebpackConfig(): webpack.Configuration {
    const distPath = this._getDistPath();

    const entry = (this._getTsConfig().files as string[]).toObject(
      item => path.basename(item, path.extname(item)) + "." + this._target,
      item => path.resolve(this._info.rootPath, item)
    );

    return {
      mode: this._devMode ? "development" : "production",
      devtool: this._devMode ? "cheap-module-source-map" : "source-map",
      target: this._target === "node" ? "node" : "web",
      node: {
        __dirname: false
      },
      resolve: {
        extensions: [".ts", ".js"]
      },
      optimization: {
        minimize: false
      },
      entry,
      output: {
        path: distPath,
        filename: "[name].js",
        libraryTarget: "umd"
      },
      externals: [
        webpackNodeExternals()
      ],
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
              {
                loader: "ts-loader",
                options: {
                  configFile: this._getTsConfigPath(),
                  transpileOnly: true
                }
              }
            ]
          }
        ]
      },
      plugins: [
        new SdWebpackTimeFixPlugin()
      ]
    };
  }*/

  private _convertDiagnosticsToResults(diagnostics: ts.Diagnostic[]): ISdPackageBuildResult[] {
    const result: ISdPackageBuildResult[] = [];
    for (const diag of diagnostics) {
      const severity = ts.DiagnosticCategory[diag.category].toLowerCase();
      if (severity !== "error" && severity !== "warning") {
        continue;
      }

      const code = "TS" + diag.code;
      const messageText = ts.flattenDiagnosticMessageText(diag.messageText, os.EOL);

      if (diag.file?.fileName !== undefined) {
        const filePath = path.resolve(diag.file.fileName);

        if (diag.start !== undefined) {
          const position = diag.file.getLineAndCharacterOfPosition(diag.start);
          const line = position.line + 1;
          const char = position.character + 1;

          result.push({
            filePath,
            severity,
            message: `${filePath}(${line}, ${char}): ${code}: ${severity} ${messageText}`
          });
        }
        else {
          result.push({
            filePath,
            severity,
            message: `${filePath}(0, 0): ${code}: ${severity} ${messageText}`
          });
        }
      }
      else {
        result.push({
          filePath: undefined,
          severity,
          message: `${code}: ${severity} ${messageText}`
        });
      }
    }

    return result;
  }
}

export interface ISdPackageBuildResult {
  filePath: string | undefined;
  severity: "error" | "warning";
  message: string;
}