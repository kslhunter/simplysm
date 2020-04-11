import {ISdPackageInfo, ITsConfig} from "../commons";
import {FsUtils, FsWatcher, IFileChangeInfo, Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as ts from "typescript";
import {NeverEntryError, ObjectUtils} from "@simplysm/sd-core-common";
import {EventEmitter} from "events";
import * as os from "os";
import anymatch from "anymatch";
import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import {CLIEngine} from "eslint";
import {SdNgGenerator} from "./SdNgGenerator";
import * as webpack from "webpack";
import {SdWebpackWriteFilePlugin} from "./SdWebpackWriteFilePlugin";
import {NextHandleFunction} from "connect";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import * as fs from "fs";
import {AngularCompilerPlugin, PLATFORM} from "@ngtools/webpack";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import {SdWebpackInputHostWithScss} from "./SdWebpackInputHostWithScss";
import {SdTypescriptProgramRunner} from "./SdTypescriptProgramRunner";
import * as OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";

export class SdPackageBuilder extends EventEmitter {
  private readonly _logger = Logger.get([
    "simplysm",
    "sd-cli",
    "package-builder",
    this._info.npmConfig.name,
    ...this._target !== undefined ? [this._target] : []
  ]);

  private _ngGenerator?: SdNgGenerator;
  private _runner?: SdTypescriptProgramRunner;

  private readonly _outputCache: { [key: string]: string | undefined } = {};

  private _getParsedTsConfig(): ts.ParsedCommandLine {
    if (this._target === undefined) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild) throw new NeverEntryError();
    if (!this._info.tsConfigForBuild[this._target]) throw new NeverEntryError();
    return ts.parseJsonConfigFileContent(this._info.tsConfigForBuild[this._target]!.config, ts.sys, this._info.rootPath);
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

  private _getNgGenerator(): SdNgGenerator {
    if (!this._ngGenerator) {
      const srcPath = this._getSrcPath();
      this._ngGenerator = new SdNgGenerator(srcPath, [srcPath]);
    }
    return this._ngGenerator;
  }

  private _getRunner(): SdTypescriptProgramRunner {
    if (!this._runner) {
      this._runner = new SdTypescriptProgramRunner(this._info.npmConfig.name, this._target, this._info.rootPath, this._getTsConfig());
    }
    return this._runner;
  }

  private _getProgram(): ts.Program {
    const result = this._getRunner().program;
    if (!result) throw new NeverEntryError();
    return result;
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

  public async runAsync(watch: boolean): Promise<void> {
    if (this._command === "gen-index") {
      await this._runFilesAsync(watch, async changedInfos => await this._genIndexAsync(changedInfos));
    }
    else if (this._command === "check") {
      await this._runProgramAsync(watch, this._checkAsync.bind(this));
    }
    else if (this._command === "lint") {
      await this._runProgramAsync(watch, this._lint.bind(this));
    }
    else if (this._command === "compile") {
      if (this._info.config?.type === "library") {
        await this._runProgramAsync(watch, this._compileAsync.bind(this));
      }
      else if (this._info.config?.type === "server") {
        await this._runServerCompileAsync(watch);
      }
      else {
        await this.runClientCompileAsync(watch);
      }
    }
    else if (this._command === "gen-ng") {
      await this._runProgramAsync(watch, this._genNgAsync.bind(this));
    }
    else {
      throw new NeverEntryError();
    }
  }

  private async _runProgramAsync(watch: boolean, cb: (changedInfos: IFileChangeInfo[]) => Promise<ISdPackageBuildResult[]> | ISdPackageBuildResult[]): Promise<void> {
    const tsConfigPath = this._getTsConfigPath();
    if (tsConfigPath === undefined) {
      await this._runFilesAsync(watch, this._lint.bind(this));
    }
    else {
      await this._getRunner()
        .on("change", filePaths => this.emit("change", filePaths))
        .on("complete", results => this.emit("complete", results))
        .runAsync(watch, cb);
    }
  }

  public async runClientCompileAsync(watch: boolean): Promise<void | NextHandleFunction[]> {
    if (this._info.config?.type !== "web") {
      throw new Error(`[${this._info.npmConfig.name}] 클라이언트(web) 패키지가 아닙니다.`);
    }

    const webpackConfig = this._getClientWebpackConfig();

    const compiler = webpack(webpackConfig);

    return await new Promise<NextHandleFunction[] | void>((resolve, reject) => {
      if (watch) {
        compiler.hooks.watchRun.tap("SdPackageBuilder", () => {
          this._logger.debug("컴파일 시작...");
          this.emit("change");
        });

        let devMiddleware: NextHandleFunction | undefined; // eslint-disable-line prefer-const
        let hotMiddleware: NextHandleFunction | undefined; // eslint-disable-line prefer-const

        compiler.hooks.failed.tap("SdPackageBuilder", err => {
          this._emitWebpackResults(err);
          reject(err);
        });

        compiler.hooks.done.tap("SdPackageBuilder", stats => {
          this._emitWebpackResults(undefined, stats);
          this._logger.debug("컴파일 완료");
          resolve([devMiddleware, hotMiddleware].filterExists());
        });

        devMiddleware = WebpackDevMiddleware(compiler, {
          publicPath: webpackConfig.output!.publicPath!,
          logLevel: "silent"/*,
          watchOptions: {
            aggregateTimeout: 300,
            poll: 1000
          }*/
        });

        hotMiddleware = WebpackHotMiddleware(compiler, {
          path: `/${path.basename(this._info.rootPath)}/__webpack_hmr`,
          log: false,
          overlay: true
        });
      }
      else {
        compiler.hooks.run.tap("SdPackageBuilder", () => {
          this._logger.debug("컴파일 시작...");
          this.emit("change");
        });

        compiler.run((err, stats) => {
          this._emitWebpackResults(err, stats);
          if (err) {
            reject(err);
          }
          else {
            this._logger.debug("컴파일 완료");
            resolve();
          }
        });
      }
    });
  }

  private async _runServerCompileAsync(watch: boolean): Promise<void> {
    if (this._info.config?.type !== "server") {
      throw new Error("서버 패키지가 아닙니다.");
    }

    const webpackConfig = this._getServerWebpackConfig();

    const compiler = webpack(webpackConfig);

    await new Promise<void>((resolve, reject) => {
      if (watch) {
        compiler.hooks.watchRun.tap("SdPackageBuilder", () => {
          this._logger.debug("컴파일 시작...");
          this.emit("change");
        });

        compiler.watch({}, (err, stats) => {
          this._emitWebpackResults(err, stats);
          this._logger.debug("컴파일 완료");
          resolve();
        });
      }
      else {
        compiler.hooks.run.tap("SdPackageBuilder", () => {
          this._logger.debug("컴파일 시작...");
          this.emit("change");
        });

        compiler.run((err, stats) => {
          this._emitWebpackResults(err, stats);
          this._logger.debug("컴파일 완료");
          resolve();
        });
      }
    });
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

  private async _genNgAsync(changedInfos: IFileChangeInfo[]): Promise<ISdPackageBuildResult[]> {
    this._logger.debug("NG 모듈 생성 시작...");

    const ngGenerator = this._getNgGenerator();
    const diagnostics = await ngGenerator.updateAsync(this._getProgram(), changedInfos);

    await ngGenerator.emitAsync();

    const results = this._convertDiagnosticsToResults(diagnostics);

    this._logger.debug("NG 모듈 생성 완료");
    return results;
  }

  private async _checkAsync(changedInfos: IFileChangeInfo[]): Promise<ISdPackageBuildResult[]> {
    this._logger.debug(`타입체크 시작...(count: ${changedInfos.length})`);

    const results: ISdPackageBuildResult[] = [];

    const parsedTsConfig = this._getParsedTsConfig();

    const srcPath = this._getSrcPath();
    const distPath = this._getDistPath();

    for (const changedInfo of changedInfos) {
      const anymatchPath = path.resolve(srcPath, "**", "*.ts");
      if (!anymatch(anymatchPath.replace(/\\/g, "/"), changedInfo.filePath.replace(/\\/g, "/"))) continue;

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

      const sourceFile = this._getProgram().getSourceFile(changedInfo.filePath);
      if (!sourceFile) {
        results.push({
          filePath: changedInfo.filePath,
          severity: "error",
          message: `error 파일을 찾을 수 없습니다: ${changedInfo.filePath}`
        });
        continue;
      }

      if (this._isAngularLibrary) {
        // metadata

        const metadataFilePath = path.resolve(distPath, path.relative(srcPath, changedInfo.filePath))
          .replace(/\.ts$/, ".metadata.json");

        const metadata = new MetadataCollector().getMetadata(
          sourceFile,
          false, // 에러를 아래에서 함수에서 걸러냄, true일 경우, Error 가 throw 됨
          (value, tsNode) => {
            if (isMetadataError(value)) {
              results.push(...this._convertDiagnosticsToResults([
                {
                  file: sourceFile,
                  start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
                  messageText: value.message,
                  category: ts.DiagnosticCategory.Error,
                  code: -5,
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
        diagnostics.push(...ts.getPreEmitDiagnostics(this._getProgram(), sourceFile));
        const emitResult = this._getProgram().emit(
          sourceFile,
          undefined,
          undefined,
          true,
          undefined
        );
        diagnostics.push(...emitResult.diagnostics);
      }
      else {
        diagnostics.push(...this._getProgram().getSemanticDiagnostics(sourceFile));
        diagnostics.push(...this._getProgram().getSyntacticDiagnostics(sourceFile));
      }

      results.push(...this._convertDiagnosticsToResults(diagnostics));
    }

    this._logger.debug(`타입체크 완료 (results: ${results.length})`);
    return results;
  }

  private async _compileAsync(changedInfos: IFileChangeInfo[]): Promise<ISdPackageBuildResult[]> {
    this._logger.debug("컴파일 시작...");

    const srcPath = this._getSrcPath();
    const distPath = this._getDistPath();

    const results: ISdPackageBuildResult[] = [];

    const parsedTsConfig = this._getParsedTsConfig();

    for (const changedInfo of changedInfos) {
      const anymatchPath = path.resolve(srcPath, "**", "*.ts");
      if (!anymatch(anymatchPath.replace(/\\/g, "/"), changedInfo.filePath.replace(/\\/g, "/"))) continue;

      const jsFilePath = path.resolve(distPath, path.relative(srcPath, changedInfo.filePath)).replace(/\.ts$/, ".js");
      const mapFilePath = jsFilePath + ".map";

      if (changedInfo.type === "unlink") {
        await FsUtils.removeAsync(jsFilePath);
        await FsUtils.removeAsync(mapFilePath);
        delete this._outputCache[jsFilePath];
        delete this._outputCache[mapFilePath];
        return [];
      }

      try {
        const sourceFile = this._getProgram().getSourceFile(changedInfo.filePath);
        if (!sourceFile) {
          results.push({
            filePath: changedInfo.filePath,
            severity: "error",
            message: `error 파일을 찾을 수 없습니다: ${changedInfo.filePath}`
          });
          delete this._outputCache[mapFilePath];
          delete this._outputCache[jsFilePath];
          await FsUtils.removeAsync(jsFilePath);
          await FsUtils.removeAsync(mapFilePath);
          continue;
        }

        const fileContent = sourceFile.getFullText();
        // const fileContent = await FsUtils.readFileAsync(changedInfo.filePath);

        // transpile
        const transpileResult = ts.transpileModule(fileContent, {
          fileName: changedInfo.filePath,
          compilerOptions: parsedTsConfig.options,
          reportDiagnostics: true
        });

        if (transpileResult.diagnostics) {
          results.push(...this._convertDiagnosticsToResults(transpileResult.diagnostics));
        }

        // write: transpile: sourcemap

        if (transpileResult.sourceMapText === undefined) {
          await FsUtils.removeAsync(mapFilePath);
          delete this._outputCache[mapFilePath];
        }
        else if (this._outputCache[mapFilePath] !== transpileResult.sourceMapText) {
          const sourceMap = JSON.parse(transpileResult.sourceMapText);
          sourceMap.sources = [
            path.relative(path.dirname(mapFilePath), changedInfo.filePath).replace(/\\/g, "/")
          ];
          const realSourceMapText = JSON.stringify(sourceMap);

          await FsUtils.mkdirsAsync(path.dirname(mapFilePath));
          await FsUtils.writeFileAsync(mapFilePath, realSourceMapText);
          this._outputCache[mapFilePath] = transpileResult.sourceMapText;
        }

        // write: transpile: js

        if (transpileResult.outputText === undefined) {
          await FsUtils.removeAsync(jsFilePath);
          delete this._outputCache[jsFilePath];
        }
        else if (this._outputCache[jsFilePath] !== transpileResult.outputText) {
          await FsUtils.mkdirsAsync(path.dirname(jsFilePath));
          await FsUtils.writeFileAsync(jsFilePath, transpileResult.outputText);
          this._outputCache[jsFilePath] = transpileResult.outputText;
        }
      }
      catch (err) {
        results.push({
          severity: "error",
          filePath: changedInfo.filePath,
          message: `${changedInfo.filePath}(0, 0): ${err.message}`
        });
        delete this._outputCache[mapFilePath];
        delete this._outputCache[jsFilePath];
        await FsUtils.removeAsync(jsFilePath);
        await FsUtils.removeAsync(mapFilePath);
      }
    }

    this._logger.debug("컴파일 완료");
    return results.distinct();
  }

  private _lint(changedInfos: IFileChangeInfo[]): ISdPackageBuildResult[] {
    this._logger.debug("규칙체크 시작...");

    const srcPath = this._getSrcPath();

    const lintConfig = this._target !== undefined && this._info.tsConfigForBuild?.[this._target] !== undefined ?
      {
        parserOptions: {
          tsconfigRootDir: this._info.rootPath,
          project: path.basename(this._info.tsConfigForBuild[this._target]!.filePath)
        }
      } :
      {};

    /*const lintEngine = new CLIEngine({
      cache: true,
      cacheFile: path.resolve(this._info.rootPath, ".eslintcache"),
      ...lintConfig
    });*/
    const lintEngine = new CLIEngine(lintConfig);

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

  private _getClientWebpackConfig(): webpack.Configuration {
    if (this._info.config?.type !== "web") {
      throw new Error("클라이언트(web) 패키지가 아닙니다.");
    }

    const packageKey = path.basename(this._info.rootPath);
    const srcPath = this._getSrcPath();
    const distPath = this._getDistPath();

    const tsConfigPath = this._getTsConfigPath();
    if (tsConfigPath === undefined) throw new NeverEntryError();

    const parsedTsConfig = this._getParsedTsConfig();

    const mainPath = path.resolve(__dirname, "../../lib/main." + (this._devMode ? "dev" : "prod") + ".js");
    const indexPath = path.resolve(__dirname, `../../lib/index.ejs`);

    return {
      ...this._devMode ? {
        mode: "development",
        devtool: "cheap-module-source-map",
        optimization: {
          minimize: false
        },
        entry: {
          main: [
            "eventsource-polyfill",
            `webpack-hot-middleware/client?path=/${packageKey}/__webpack_hmr&timeout=20000&reload=true`,
            mainPath
          ]
        },
        resolve: {
          extensions: [".ts", ".js", ".json"],
          alias: {"SD_APP_MODULE": path.resolve(srcPath, "AppModule")},
          aliasFields: ["browser"]
        }
      } : {
        mode: "production",
        devtool: "source-map",
        profile: false,
        performance: {
          hints: false
        },
        optimization: {
          noEmitOnErrors: true,
          runtimeChunk: "single",
          splitChunks: {
            chunks: "all",
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: (module: any): string => {
                  const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                  return `libs/${packageName.replace("@", "")}`;
                }
              }
            }
          },
          minimizer: [
            new webpack.HashedModuleIdsPlugin(),
            new OptimizeCSSAssetsPlugin()
          ]
        },
        entry: {
          main: ["eventsource-polyfill", mainPath]
        },
        resolve: {
          extensions: [".ts", ".js", ".json"],
          alias: {
            "SD_APP_MODULE_FACTORY": path.resolve(srcPath, "AppModule.ngfactory")
          },
          aliasFields: ["browser"]
        }
      },
      target: "web",
      output: {
        publicPath: `/${packageKey}/`,
        path: distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      module: {
        strictExportPresence: true,
        rules: [
          ...this._devMode ?
            [
              {
                test: /(?:main\.prod\.js|main\.dev\.js)$/,
                loader: "ts-loader",
                options: {
                  configFile: tsConfigPath,
                  transpileOnly: true
                }
              },
              {
                test: /\.ts$/,
                exclude: /node_modules/,
                loaders: [
                  {
                    loader: "ts-loader",
                    options: {
                      configFile: tsConfigPath,
                      transpileOnly: true
                    }
                  },
                  require.resolve("../inline-sass-loader"),
                  require.resolve("angular-router-loader")
                ]
              }
            ] :
            [
              {
                test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
                loaders: [
                  {
                    loader: "@angular-devkit/build-optimizer/webpack-loader",
                    options: {
                      sourceMap: parsedTsConfig.options.sourceMap
                    }
                  },
                  require.resolve("angular-router-loader") + "?aot=true",
                  "@ngtools/webpack"
                ]
              }
            ],
          {
            test: /[\\/]@angular[\\/]core[\\/].+\.js$/,
            parser: {system: true}
          },
          {
            test: /\.js$/,
            enforce: "pre",
            loader: "source-map-loader",
            exclude: [
              /node_modules[\\/](?!@simplysm)/,
              /(ngfactory|ngstyle)\.js$/
            ]
          },
          {
            test: /\.scss$/,
            use: [
              "style-loader",
              "css-loader",
              "resolve-url-loader",
              "sass-loader"
            ]
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip)$/,
            loader: "file-loader",
            options: {
              name: `assets/[name].[ext]${this._devMode ? "?[hash]" : ""}`,
              esModule: false
            }
          }
        ]
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: indexPath,
          BASE_HREF: `/${packageKey}/`
        }),
        new webpack.ContextReplacementPlugin(
          /(.+)?angular(\\|\/)core(.+)?/,
          srcPath,
          {}
        ),
        ...this._devMode ? [
          new webpack.HotModuleReplacementPlugin()
        ] : [],
        ...this._devMode ? [] : [
          new AngularCompilerPlugin({
            mainPath,
            entryModule: path.resolve(srcPath, "AppModule") + "#AppModule",
            platform: PLATFORM.Browser,
            sourceMap: parsedTsConfig.options.sourceMap,
            nameLazyFiles: this._devMode,
            forkTypeChecker: false,
            directTemplateLoading: true,
            tsConfigPath,
            skipCodeGeneration: this._devMode,
            host: new SdWebpackInputHostWithScss(fs),
            compilerOptions: {
              fullTemplateTypeCheck: true,
              strictInjectionParameters: true,
              disableTypeScriptVersionCheck: true,
              skipMetadataEmit: true,
              rootDir: undefined,
              enableIvy: false
            }
          })
        ],
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(distPath, ".configs.json"),
            content: JSON.stringify(this._info.config.configs, undefined, 2)
          }
        ])
      ]
    };
  }

  private _getServerWebpackConfig(): webpack.Configuration {
    if (this._info.config?.type !== "server") {
      throw new Error("서버 패키지가 아닙니다.");
    }

    const entryFiles = this._getTsConfig().files;
    if (!entryFiles) throw new Error("서버를 빌드하려면, 엔트리 파일을 'tsconfig.json'의 'files'에 지정해야 합니다.");

    const distPath = this._getDistPath();
    const tsConfigPath = this._getTsConfigPath();

    const entry = entryFiles.toObject(
      item => path.basename(item, path.extname(item)),
      item => path.resolve(this._info.rootPath, item)
    );

    const copyNpmConfig = ObjectUtils.clone(this._info.npmConfig);

    const loadedModuleNames: string[] = [];
    const nodeGypModuleNames: string[] = [];
    const fn = (moduleName: string): void => {
      if (loadedModuleNames.includes(moduleName)) return;
      loadedModuleNames.push(moduleName);

      const modulePath = path.resolve(process.cwd(), "node_modules", moduleName);
      if (FsUtils.exists(path.resolve(modulePath, "binding.gyp"))) {
        nodeGypModuleNames.push(moduleName);
      }

      const moduleNpmConfig = FsUtils.readJson(path.resolve(modulePath, "package.json"));
      for (const depModuleName of Object.keys(moduleNpmConfig.dependencies ?? {})) {
        fn(depModuleName);
      }
    };
    for (const key of Object.keys(copyNpmConfig.dependencies ?? {})) {
      fn(key);
    }

    copyNpmConfig.dependencies = {};
    for (const nodeGypModuleName of nodeGypModuleNames) {
      copyNpmConfig.dependencies[nodeGypModuleName] = "*";
    }
    delete copyNpmConfig.devDependencies;
    delete copyNpmConfig.peerDependencies;

    return {
      ...this._devMode ? {
        mode: "development",
        devtool: "cheap-module-source-map",
        optimization: {
          minimize: false
        }
      } : {
        mode: "production",
        devtool: "source-map",
        profile: false,
        performance: {hints: false},
        optimization: {
          noEmitOnErrors: true,
          minimizer: [
            new webpack.HashedModuleIdsPlugin()
          ]
        }
      },
      target: "node",
      node: {
        __dirname: false
      },
      resolve: {
        extensions: [".ts", ".js", ".json"]
      },
      entry,
      output: {
        path: distPath,
        filename: "[name].js",
        libraryTarget: "umd"
      },
      module: {
        strictExportPresence: true,
        rules: [
          {
            test: /\.js$/,
            enforce: "pre",
            loader: "source-map-loader",
            exclude: [
              /node_modules[\\/](?!@simplysm)/
            ]
          },
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: "ts-loader",
            options: {
              configFile: tsConfigPath,
              transpileOnly: true
            }
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip|pfx)$/,
            loader: "file-loader",
            options: {
              name: `[name].[ext]`,
              outputPath: "assets/",
              publicPath: "assets/",
              postTransformPublicPath: (publicPath: string): string => "__dirname + " + JSON.stringify("/" + JSON.parse(publicPath)),
              esModule: false
            }
          }
        ]
      },
      plugins: [
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(distPath, ".configs.json"),
            content: JSON.stringify(this._info.config.configs, undefined, 2)
          },
          {
            path: path.resolve(distPath, "package.json"),
            content: JSON.stringify(copyNpmConfig, undefined, 2)
          },
          {
            path: path.resolve(distPath, "pm2.json"),
            content: JSON.stringify({
              name: this._info.npmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
              script: "app.js",
              watch: false,
              interpreter: "node@" + process.versions.node,
              env: {
                NODE_ENV: this._devMode ? "development" : "production",
                VERSION: this._info.npmConfig.version,
                ...this._info.config.env ? this._info.config.env : {}
              }
            }, undefined, 2)
          }
        ])
      ],
      externals: [
        (context, request, callback): void => {
          if (nodeGypModuleNames.includes(request)) {
            const req = request.replace(/^.*?\/node_modules\//, "") as string;
            if (req.startsWith("@")) {
              callback(undefined, `commonjs ${req.split("/", 2).join("/")}`);
              return;
            }

            callback(undefined, `commonjs ${req.split("/")[0]}`);
            return;
          }

          callback(undefined, undefined);

          /*if (request === "node-gyp-build") {
            const sourcePath = path.resolve(context, "prebuilds", "win32-x64", "node-napi.node");
            const targetRelativePath = path.relative(path.resolve(process.cwd(), "node_modules"), sourcePath);
            const targetPath = path.resolve(distPath, "node_modules", targetRelativePath);

            if (FsUtils.exists(sourcePath)) {
              FsUtils.mkdirs(path.dirname(targetPath));
              FsUtils.copy(sourcePath, targetPath);
            }

            callback(undefined, `function (() => require('${targetRelativePath.replace(/\\/g, "/")}'))`);
          }
          else if ((/.*\.node$/).test(request)) {
            const sourcePath = path.resolve(context, request);
            const targetRelativePath = path.relative(path.resolve(process.cwd(), "node_modules"), sourcePath);
            const targetPath = path.resolve(distPath, "node_modules", targetRelativePath);

            if (FsUtils.exists(sourcePath)) {
              FsUtils.mkdirs(path.dirname(targetPath));
              FsUtils.copy(sourcePath, targetPath);
            }

            callback(undefined, `commonjs ${targetRelativePath.replace(/\\/g, "/")}`);
          }
          else {
            callback(undefined, undefined);
          }*/
        }
      ]
    };
  }

  private _emitWebpackResults(err?: Error, stats?: webpack.Stats): void {
    if (err != null) {
      this.emit("complete", [{
        filePath: undefined,
        severity: "error" as const,
        message: err.message
      }]);
      return;
    }
    if (stats == null) {
      throw new NeverEntryError();
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

    this.emit("complete", results);
  }

  private async _runFilesAsync(watch: boolean,
                               cb: (changedInfos: IFileChangeInfo[]) => Promise<ISdPackageBuildResult[]> | ISdPackageBuildResult[]): Promise<void> {
    const srcPath = this._getSrcPath();

    const filePathAnyMatch = path.resolve(srcPath, "**", "*.ts");
    if (watch) {
      await FsWatcher.watchAsync(filePathAnyMatch, async changedInfos => {
        this.emit("change", changedInfos.map(item => item.filePath));
        const results = await cb(changedInfos);
        this.emit("complete", results);
      }, err => {
        this._logger.error(err);
      });
    }
    else {
      const changedInfos = (await FsUtils.globAsync(filePathAnyMatch)).map(item => ({
        type: "add" as const,
        filePath: item
      }));
      this.emit("change", changedInfos.map(item => item.filePath));
      const results = await cb(changedInfos);
      this.emit("complete", results);
    }
  }

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