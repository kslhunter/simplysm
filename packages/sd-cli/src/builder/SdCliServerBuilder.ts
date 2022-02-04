import { INpmConfig, ISdCliPackageBuildResult, ISdCliServerPackageConfig } from "../commons";
import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import webpack from "webpack";
import path from "path";
import ts from "typescript";
import { SdCliBuildResultUtil } from "../utils/SdCliBuildResultUtil";
import { ErrorInfo } from "ts-loader/dist/interfaces";
import os from "os";
import { ESLint } from "eslint";
import * as webpackMerge from "webpack-merge";
import TerserPlugin from "terser-webpack-plugin";
import { StringUtil } from "@simplysm/sd-core-common";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import LintResult = ESLint.LintResult;

export class SdCliServerBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _tsconfigFilePath: string;
  private readonly _parsedTsconfig: ts.ParsedCommandLine;
  private readonly _npmConfigMap = new Map<string, INpmConfig>();

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdCliServerPackageConfig,
                     private readonly _workspaceRootPath: string) {
    super();

    // tsconfig
    this._tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    const tsconfig = FsUtil.readJson(this._tsconfigFilePath);
    this._parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async watchAsync(): Promise<void> {
    // DIST 비우기
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 빌드 준비
    const webpackConfig = this._getWebpackWatchConfig();
    const compiler = webpack(webpackConfig);
    await new Promise<void>((resolve, reject) => {
      compiler.hooks.watchRun.tapAsync(this.constructor.name, (args, callback) => {
        this.emit("change");
        callback();

        this._logger.debug("Webpack 빌드 수행...");
      });

      compiler.watch({}, (err, stats) => {
        if (err != null || stats == null) {
          reject(err);
          return;
        }

        const results = SdCliBuildResultUtil.convertFromWebpackStats(stats);
        this.emit("complete", results);

        this._logger.debug("Webpack 빌드 완료");
        resolve();
      });
    });
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    // DIST 비우기
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 빌드
    this._logger.debug("Webpack 빌드 수행...");
    const webpackConfig = this._getWebpackBuildConfig();
    const compiler = webpack(webpackConfig);
    const buildResults = await new Promise<ISdCliPackageBuildResult[]>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err != null || stats == null) {
          reject(err);
          return;
        }

        // 결과 리턴
        const results = SdCliBuildResultUtil.convertFromWebpackStats(stats);
        resolve(results);
      });
    });
    this._logger.debug("Webpack 빌드 완료");

    return buildResults;
  }

  private get _webpackCommonConfig(): webpack.Configuration {
    return {
      devtool: false,
      target: ["node", "es2020"],
      profile: false,
      resolve: {
        roots: [this._rootPath],
        extensions: [".ts", ".js", ".mjs", ".cjs"],
        symlinks: true,
        mainFields: ["es2020", "default", "module", "main"]
      },
      context: this._workspaceRootPath,
      entry: {
        main: [
          path.resolve(this._rootPath, "src/main.ts")
        ]
      },
      output: {
        clean: true,
        path: this._parsedTsconfig.options.outDir,
        filename: "[name].mjs",
        chunkFilename: "[name].mjs",
        assetModuleFilename: "res/[name][ext][query]",
        libraryTarget: "module"
      },
      experiments: {
        outputModule: true
      },
      performance: { hints: false },
      node: false,
      stats: "errors-warnings",
      module: {
        strictExportPresence: true,
        rules: [
          {
            test: /\.m?js/,
            resolve: {
              fullySpecified: false
            }
          },
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: "ts-loader",
            options: {
              configFile: this._tsconfigFilePath,
              errorFormatter: (msg: ErrorInfo) => {
                return SdCliBuildResultUtil.getMessage({
                  filePath: msg.file,
                  line: msg.line,
                  char: msg.character,
                  code: "TS" + msg.code.toString(),
                  severity: msg.severity,
                  message: msg.content
                });
              }
            }
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip|pfx|pkl)$/,
            type: "asset/resource"
          }
        ]
      },
      plugins: [
        new CopyWebpackPlugin({
          patterns: ["assets/"].map((item) => ({
            context: this._rootPath,
            to: item,
            from: `src/${item}`,
            noErrorOnMissing: true,
            force: true,
            globOptions: {
              dot: true,
              followSymbolicLinks: false,
              ignore: [
                ".gitkeep",
                "**/.DS_Store",
                "**/Thumbs.db"
              ].map((i) => PathUtil.posix(this._rootPath, i))
            },
            priority: 0
          }))
        }),
        new webpack.EnvironmentPlugin({
          SD_VERSION: this._getNpmConfig(this._rootPath)!.version,
          ...this._config.env
        }),
        new ESLintWebpackPlugin({
          context: this._rootPath,
          extensions: ["ts", "js", "mjs", "cjs"],
          fix: false,
          threads: false,
          formatter: (results: LintResult[]) => {
            const resultMessages: string[] = [];
            for (const result of results) {
              for (const msg of result.messages) {
                const severity = msg.severity === 1 ? "warning" : msg.severity === 2 ? "error" : undefined;
                if (severity === undefined) continue;

                resultMessages.push(SdCliBuildResultUtil.getMessage({
                  filePath: result.filePath,
                  line: msg.line,
                  char: msg.column,
                  code: msg.ruleId?.toString(),
                  severity,
                  message: msg.message
                }));
              }
            }
            return resultMessages.join(os.EOL);
          }
        }),
        new webpack.ProgressPlugin({
          handler: (per: number, msg: string, ...args: string[]) => {
            const phaseText = msg ? ` - phase: ${msg}` : "";
            const argsText = args.length > 0 ? ` - args: [${args.join(", ")}]` : "";
            this._logger.debug(`Webpack 빌드 수행중...(${Math.round(per * 100)}%)${phaseText}${argsText}`);
          }
        })
      ]
    };
  }

  private _getWebpackWatchConfig(): webpack.Configuration {
    const internalModuleCachePaths = FsUtil.findAllParentChildDirPaths("node_modules/!(@simplysm)", this._rootPath, this._workspaceRootPath);

    const extModuleNames = this._findExternalModules(true).map((item) => item.name);
    return webpackMerge.merge(this._webpackCommonConfig, {
      mode: "development",
      module: {
        rules: [
          {
            test: /\.m?js$/,
            enforce: "pre",
            loader: "source-map-loader",
            options: {
              filterSourceMappingUrl: (mapUri: string, resourcePath: string) => {
                return !resourcePath.includes("node_modules") || (/@simplysm[\\/]sd/).test(resourcePath);
              }
            }
          }
        ]
      },
      cache: { type: "memory", maxGenerations: 1 },
      snapshot: {
        immutablePaths: internalModuleCachePaths,
        managedPaths: internalModuleCachePaths
      },
      optimization: {
        moduleIds: "deterministic",
        chunkIds: "named",
        emitOnErrors: true
      },
      externals: extModuleNames
    });
  }

  private _getWebpackBuildConfig(): webpack.Configuration {
    const extModuleNames = this._findExternalModules(false).map((item) => item.name);
    return webpackMerge.merge(this._webpackCommonConfig, {
      mode: "production",
      cache: false,
      optimization: {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            extractComments: false,
            terserOptions: {
              compress: true,
              ecma: 2020,
              sourceMap: false,
              keep_classnames: true,
              keep_fnames: true,
              ie8: false,
              safari10: false,
              module: true,
              format: {
                comments: false
              }
            }
          })
        ],
        moduleIds: "deterministic",
        chunkIds: "deterministic",
        emitOnErrors: false
      },
      plugins: [
        new LicenseWebpackPlugin({
          stats: { warnings: false, errors: false },
          perChunkOutput: false,
          outputFilename: "3rd_party_licenses.txt",
          skipChildCompilers: true
        }) as any
      ],
      externals: extModuleNames
    });
  }

  private _findExternalModules(all: boolean): { name: string; path?: string }[] {
    const loadedModuleNames: string[] = [];
    const externalModules: { name: string; path?: string }[] = [];

    const fn = (currPath: string): void => {
      const npmConfig = this._getNpmConfig(currPath);
      if (!npmConfig) return;

      const moduleNames = [
        ...Object.keys(npmConfig.dependencies ?? {}),
        ...Object.keys(npmConfig.peerDependencies ?? {}).filter((item) => !npmConfig.peerDependenciesMeta?.[item].optional)
      ];
      const optModuleNames = [
        ...Object.keys(npmConfig.optionalDependencies ?? {}),
        ...Object.keys(npmConfig.peerDependencies ?? {}).filter((item) => npmConfig.peerDependenciesMeta?.[item].optional)
      ].distinct();

      for (const moduleName of moduleNames) {
        if (loadedModuleNames.includes(moduleName)) continue;
        loadedModuleNames.push(moduleName);

        const modulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + moduleName, currPath, this._workspaceRootPath).first();
        if (StringUtil.isNullOrEmpty(modulePath)) {
          console.log(2, currPath, moduleName);
          continue;
        }

        if (all || FsUtil.exists(path.resolve(modulePath, "binding.gyp"))) {
          externalModules.push({ path: modulePath, name: moduleName });
        }

        fn(modulePath);
      }

      for (const optModuleName of optModuleNames) {
        if (loadedModuleNames.includes(optModuleName)) continue;
        loadedModuleNames.push(optModuleName);

        const optModulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + optModuleName, currPath, this._workspaceRootPath).first();
        if (StringUtil.isNullOrEmpty(optModulePath)) {
          console.log(1, currPath, optModuleName);
          externalModules.push({ path: optModulePath, name: optModuleName });
          continue;
        }

        if (all || FsUtil.exists(path.resolve(optModulePath, "binding.gyp"))) {
          externalModules.push({ path: optModulePath, name: optModuleName });
        }

        fn(optModulePath);
      }
    };

    fn(this._rootPath);

    return externalModules.distinct();
  }

  private _getNpmConfig(pkgPath: string): INpmConfig | undefined {
    if (!this._npmConfigMap.has(pkgPath)) {
      this._npmConfigMap.set(pkgPath, FsUtil.readJson(path.resolve(pkgPath, "package.json")));
    }
    return this._npmConfigMap.get(pkgPath);
  }
}
