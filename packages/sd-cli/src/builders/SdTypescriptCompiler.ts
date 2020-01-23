import {FsUtil, FsWatcher, IFileChangeInfo, Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";
import {MetadataCollector} from "@angular/compiler-cli";
import {TSdFramework} from "../commons";
import {SdAngularUtils} from "../utils/SdAngularUtils";
import * as nodeExternals from "webpack-node-externals";
import * as webpack from "webpack";
import {SdWebpackTimeFixPlugin} from "../plugins/SdWebpackTimeFixPlugin";
import * as os from "os";

export class SdTypescriptCompiler {
  private constructor(private readonly _mode: "development" | "production",
                      private readonly _tsConfigPath: string,
                      private readonly _isNode: boolean,
                      private readonly _srcPath: string,
                      private readonly _distPath: string,
                      private readonly _entry: { [key: string]: string },
                      private readonly _hasBinFile: boolean,
                      private readonly _compilerOptions: ts.CompilerOptions,
                      private readonly _framework: TSdFramework | undefined,
                      private readonly _scriptTarget: ts.ScriptTarget,
                      private readonly _packagePath: string,
                      private readonly _indexTargetPath: string,
                      private readonly _npmConfig: any,
                      private readonly _logger: Logger) {
  }

  public static async createAsync(argv: {
    tsConfigPath: string;
    mode: "development" | "production";
    framework: TSdFramework | undefined;
  }): Promise<SdTypescriptCompiler> {
    const tsConfigPath = argv.tsConfigPath;
    const mode = argv.mode;
    const framework = argv.framework;

    const packagePath = path.dirname(argv.tsConfigPath);

    const tsConfig = await fs.readJson(tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));
    const scriptTarget = parsedTsConfig.options.target;
    const isNode = scriptTarget !== ts.ScriptTarget.ES5;

    if (!tsConfig.files) {
      throw new Error("라이브러리 패키지의 'tsConfig.json'에는 'files'가 반드시 정의되어야 합니다.");
    }

    const npmConfigPath = path.resolve(packagePath, "package.json");
    const npmConfig = await fs.readJson(npmConfigPath);
    const hasBin = !!npmConfig.bin;

    const entry = (tsConfig.files as string[]).toObject(
      (item) => npmConfig.browser && !isNode
        ? (path.basename(item, path.extname(item)) + ".browser")
        : path.basename(item, path.extname(item)),
      (item) => path.resolve(packagePath, item)
    );

    const indexTargetPath = npmConfig.browser && !isNode ? npmConfig.browser : npmConfig.main;

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
      mode,
      tsConfigPath,
      isNode,
      srcPath,
      distPath,
      entry,
      hasBin,
      parsedTsConfig.options,
      framework,
      scriptTarget ?? ts.ScriptTarget.ES2018,
      packagePath,
      indexTargetPath,
      npmConfig,
      logger
    );
  }

  public async runAsync(watch: boolean): Promise<void> {
    if (this._npmConfig.browser && !this._isNode) {
      await this._runWebpackAsync(watch);
    }
    else {
      await this._runTscAsync(watch);
    }
  }


  private async _runWebpackAsync(watch: boolean): Promise<void> {
    if (watch) {
      this._logger.log("컴파일 및 변경감지를 시작합니다.");
    }
    else {
      this._logger.log("컴파일를 시작합니다.");
    }

    const webpackConfig = await this._getWebpackConfigAsync(watch);

    const compiler = webpack(webpackConfig);

    if (watch) {
      compiler.hooks.invalid.tap("SdTypescriptCompiler", () => {
        this._logger.log("컴파일에 대한 변경사항이 감지되었습니다.");
      });
    }

    await new Promise<void>(async (resolve, reject) => {
      const callback = (err: Error, stats: webpack.Stats) => {
        if (err) {
          reject(err);
          return;
        }

        const info = stats.toJson("errors-warnings");

        if (stats.hasWarnings()) {
          this._logger.warn(
            "컴파일 경고\n",
            info.warnings
              .map((item) => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
              .join(os.EOL)
          );
        }

        if (stats.hasErrors()) {
          this._logger.error(
            "컴파일 오류\n",
            info.errors
              .map((item) => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
              .join(os.EOL)
          );
        }

        this._logger.log("컴파일이 완료되었습니다.");
        resolve();
      };

      if (watch) {
        compiler.watch({}, callback);
      }
      else {
        compiler.run(callback);
      }
    });
  }

  private async _runTscAsync(watch: boolean): Promise<void> {
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


          let jsFilePath: string;
          let mapFilePath: string;

          if (path.resolve(tsFilePath) === path.resolve(this._srcPath, "index.ts")) {
            jsFilePath = path.resolve(this._packagePath, this._indexTargetPath);
            mapFilePath = path.resolve(this._packagePath, this._indexTargetPath.replace(/\.js$/, ".js.map"));
          }
          else {
            const jsFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".js");
            jsFilePath = path.resolve(this._distPath, jsFileRelativePath);

            const mapFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".js.map");
            mapFilePath = path.resolve(this._distPath, mapFileRelativePath);
          }

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
        const newChangedInfos = this._framework?.startsWith("angular")
          ? changedInfos.mapMany((changedInfo) => {
            if (path.extname(changedInfo.filePath) === ".scss") {
              const filePaths = Object.keys(scssDepsObj).filter((key) => scssDepsObj[key].includes(changedInfo.filePath));
              return filePaths.map((filePath) => ({type: "change" as "change", filePath}));
            }
            return [changedInfo];
          }).distinct()
          : changedInfos;

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

  private async _getWebpackConfigAsync(watch: boolean): Promise<webpack.Configuration> {
    return {
      mode: this._mode,
      devtool: this._mode === "development" ? "cheap-module-source-map" : "source-map",
      target: this._isNode ? "node" : "web",
      node: {
        __dirname: false
      },
      resolve: {
        extensions: [".ts", ".js"]
      },
      optimization: {
        minimize: false
      },
      entry: this._entry,
      output: {
        path: this._distPath,
        filename: "[name].js",
        libraryTarget: "umd"
      },
      externals: [
        nodeExternals()
      ],
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
              ...this._hasBinFile ? ["shebang-loader"] : [],
              {
                loader: "ts-loader",
                options: {
                  configFile: this._tsConfigPath,
                  transpileOnly: true
                }
              }
            ]
          }
        ]
      },
      plugins: [
        ...this._hasBinFile ? [
          new webpack.BannerPlugin({
            banner: "#!/usr/bin/env node",
            raw: true,
            entryOnly: true,
            include: ["bin.js"]
          })
        ] : [],
        ...watch ? [new SdWebpackTimeFixPlugin()] : []
      ]
    };
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
