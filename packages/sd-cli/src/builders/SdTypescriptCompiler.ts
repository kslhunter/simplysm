import {FsUtil, FsWatcher, IFileChangeInfo, Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as ts from "typescript";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";
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
                      // private readonly _scriptTarget: ts.ScriptTarget,
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

    const tsConfig = await FsUtil.readJsonAsync(tsConfigPath);
    tsConfig.compilerOptions.rootDir = tsConfig.compilerOptions.rootDir || "src";
    tsConfig.compilerOptions.outDir = tsConfig.compilerOptions.outDir || "dist";

    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));
    const scriptTarget = parsedTsConfig.options.target;
    const isNode = scriptTarget !== ts.ScriptTarget.ES5;

    if (!tsConfig.files) {
      throw new Error("라이브러리 패키지의 'tsConfig.json'에는 'files'가 반드시 정의되어야 합니다.");
    }

    const npmConfigPath = path.resolve(packagePath, "package.json");
    const npmConfig = await FsUtil.readJsonAsync(npmConfigPath);
    const hasBin = !!npmConfig.bin;

    const entry = (tsConfig.files as string[]).toObject(
      item => npmConfig.browser && !isNode
        ? (path.basename(item, path.extname(item)) + ".browser")
        : path.basename(item, path.extname(item)),
      item => path.resolve(packagePath, item)
    );

    const srcPath = path.resolve(parsedTsConfig.options.rootDir!);
    const distPath = path.resolve(parsedTsConfig.options.outDir!);

    const indexTargetPath = npmConfig.browser && !isNode ? npmConfig.browser : npmConfig.main;

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
      // scriptTarget ?? ts.ScriptTarget.ES2018,
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
              .map(item => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
              .join(os.EOL)
          );
        }

        if (stats.hasErrors()) {
          this._logger.error(
            "컴파일 오류\n",
            info.errors
              .map(item => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
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
          let metadataFilePath: string;

          if (path.resolve(tsFilePath) === path.resolve(this._srcPath, "index.ts")) {
            jsFilePath = path.resolve(this._packagePath, this._indexTargetPath);
            mapFilePath = path.resolve(this._packagePath, this._indexTargetPath.replace(/\.js$/, ".js.map"));
            metadataFilePath = path.resolve(this._packagePath, this._indexTargetPath.replace(/\.js$/, ".metadata.json"));
          }
          else {
            const jsFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".js");
            jsFilePath = path.resolve(this._distPath, jsFileRelativePath);

            const mapFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".js.map");
            mapFilePath = path.resolve(this._distPath, mapFileRelativePath);

            const metadataFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".metadata.json");
            metadataFilePath = path.resolve(this._distPath, metadataFileRelativePath);
          }

          if (changedInfo.type === "unlink") {
            if (FsUtil.exists(jsFilePath)) {
              await FsUtil.removeAsync(jsFilePath);
            }
            if (FsUtil.exists(mapFilePath)) {
              await FsUtil.removeAsync(mapFilePath);
            }
            if (FsUtil.exists(metadataFilePath)) {
              await FsUtil.removeAsync(metadataFilePath);
            }

            delete scssDepsObj[tsFilePath];
          }
          else {
            let tsFileContent = await FsUtil.readFileAsync(tsFilePath);
            if (this._framework?.startsWith("angular")) {
              try {
                const scssResult = SdAngularUtils.replaceScssToCss(tsFilePath, tsFileContent);
                tsFileContent = scssResult.content;

                scssDepsObj[tsFilePath] = scssResult.dependencies.map(item => path.resolve(item));
              }
              catch (err) {
                this._logger.error("SCSS 컴파일 오류\n", err.formatted || err);
              }
            }

            const result = ts.transpileModule(tsFileContent, {
              fileName: tsFilePath,
              compilerOptions: this._compilerOptions
            });

            const diagnostics = result.diagnostics?.filter(item => !item.messageText.toString().includes("Emitted no files.")) ?? [];

            if (diagnostics.length > 0) {
              const messages = SdTypescriptUtils.getDiagnosticMessage(diagnostics);

              if (messages.warnings.length > 0) {
                this._logger.warn("컴파일 경고\n", messages.warnings.join("\n").trim());
              }

              if (messages.errors.length > 0) {
                this._logger.error("컴파일 오류\n", messages.errors.join("\n").trim());
              }
            }

            if (result.outputText) {
              await FsUtil.mkdirsAsync(path.dirname(jsFilePath));
              await FsUtil.writeFileAsync(jsFilePath, result.outputText);
            }
            else if (FsUtil.exists(jsFilePath)) {
              await FsUtil.removeAsync(jsFilePath);
            }
            if (result.sourceMapText) {
              await FsUtil.mkdirsAsync(path.dirname(mapFilePath));
              await FsUtil.writeFileAsync(mapFilePath, result.sourceMapText);
            }
            else if (FsUtil.exists(mapFilePath)) {
              await FsUtil.removeAsync(mapFilePath);
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

    await FsWatcher.watchAsync(
      watchPaths,
      async changedInfos => {
        const newChangedInfos = this._framework?.startsWith("angular")
          ? changedInfos.mapMany(changedInfo => {
            if (path.extname(changedInfo.filePath) === ".scss") {
              const filePaths = Object.keys(scssDepsObj).filter(key => scssDepsObj[key].includes(changedInfo.filePath));
              return filePaths.map(filePath => ({type: "change" as "change", filePath}));
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
      err => {
        this._logger.error("변경감지 작업중 오류 발생\n", err);
      }
    );

    const fileList = await FsUtil.globAsync(path.resolve(this._srcPath, "**", "*.ts"));
    await buildAsync(fileList.map(item => ({filePath: item, type: "add"})));

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
}
