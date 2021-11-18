import { EventEmitter } from "events";
import { INpmConfig, ISdPackageBuildResult, ISdServerPackageConfig, ITsconfig } from "../commons";
import * as ts from "typescript";
import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import { ObjectUtil, StringUtil, Wait } from "@simplysm/sd-core-common";
import * as webpack from "webpack";
import * as path from "path";
import { JavaScriptOptimizerPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/javascript-optimizer-plugin";
import { DedupeModuleResolvePlugin } from "@angular-devkit/build-angular/src/webpack/plugins";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import { SdWebpackUtil } from "../utils/SdWebpackUtil";
import { ErrorInfo } from "ts-loader/dist/interfaces";
import { LintResult } from "eslint-webpack-plugin/declarations/options";
import * as os from "os";
import { SdServiceServer } from "@simplysm/sd-service-node";
import decache from "decache";
import * as CopyWebpackPlugin from "copy-webpack-plugin";

// eslint-disable-next-line @typescript-eslint/naming-convention
const ESLintWebpackPlugin = require("eslint-webpack-plugin");

export class SdCliServerBuilder extends EventEmitter {
  public parsedTsconfig: ts.ParsedCommandLine;
  public npmConfigCache = new Map<string, INpmConfig>();
  private _server?: SdServiceServer;

  protected readonly _logger: Logger;

  public constructor(public rootPath: string,
                     public tsconfigFilePath: string,
                     public projectRootPath: string,
                     public config: ISdServerPackageConfig,
                     public skipProcesses: "lint"[]) {
    super();

    const tsconfig: ITsconfig = FsUtil.readJson(this.tsconfigFilePath);
    this.parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this.rootPath);
    const npmConfig = FsUtil.readJson(path.resolve(this.rootPath, "package.json"));
    this.npmConfigCache.set(this.rootPath, npmConfig);

    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, npmConfig.name]);
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[], server?: SdServiceServer) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async buildAsync(): Promise<void> {
    this.emit("change");

    await FsUtil.removeAsync(this.parsedTsconfig.options.outDir!);

    const externalModuleNames = this._findExternalModules(false).map((item) => item.name);

    // WEBPACK 빌드
    this._logger.debug("Webpack 빌드 수행");
    const webpackConfig = this._getWebpackConfig(false, externalModuleNames);
    const compiler = webpack(webpackConfig);
    const buildResults = await new Promise<ISdPackageBuildResult[]>((resolve, reject) => {
      compiler.run((err, stat) => {
        if (err != null) {
          reject(err);
          return;
        }

        // 결과 리턴

        const results = SdWebpackUtil.getWebpackResults(stat!);
        resolve(results);
      });
    });
    this._logger.debug("Webpack 빌드 결과", buildResults);

    // .config.json 파일 쓰기

    const targetPath = path.resolve(this.parsedTsconfig.options.outDir!, ".config.json");
    await FsUtil.writeFileAsync(targetPath, JSON.stringify(this.config.configs ?? {}, undefined, 2));

    // pm2.json 파일 쓰기
    if (this.config.pm2 !== undefined && this.config.pm2 !== false) {
      const npmConfig = this._getNpmConfig(this.rootPath)!;
      const pm2DistPath = path.resolve(this.parsedTsconfig.options.outDir!, "pm2.json");
      await FsUtil.writeFileAsync(pm2DistPath, JSON.stringify(ObjectUtil.merge(
        {
          "name": npmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
          "script": path.basename(path.resolve(this.parsedTsconfig.options.outDir!, "main.js")),
          "watch": true,
          "watch_delay": 2000,
          "ignore_watch": [
            "node_modules",
            "www"
          ].distinct(),
          "interpreter": "node@" + process.versions.node,
          "env": {
            NODE_ENV: "production",
            VERSION: npmConfig.version,
            TZ: "Asia/Seoul",
            ...this.config.env ? this.config.env : {}
          }
        },
        (typeof this.config.pm2 !== "boolean") ? this.config.pm2 : {},
        {
          arrayProcess: "concat"
        }
      ), undefined, 2));
    }

    // iis 파일 쓰기
    if (this.config.iis !== undefined && this.config.iis !== false) {
      const iisDistPath = path.resolve(this.parsedTsconfig.options.outDir!, "web.config");
      const serverExeFilePath = (this.config.iis !== true && "serverExeFilePath" in this.config.iis)
        ? (this.config.iis.serverExeFilePath ?? "C:\\Program Files\\nodejs\\node.exe")
        : "C:\\Program Files\\nodejs\\node.exe";
      await FsUtil.writeFileAsync(iisDistPath, `
<configuration>
  <system.webServer>
    <webSocket enabled="false" />
    <handlers>
      <add name="iisnode" path="main.js" verb="*" modules="iisnode" />
    </handlers>
    <iisnode nodeProcessCommandLine="${serverExeFilePath}"
             watchedFiles="web.config;*.js"
             loggingEnabled="true"
             devErrorsEnabled="true" />
    <rewrite>
      <rules>
        <rule name="main">
          <action type="Rewrite" url="main.js" />
        </rule>
      </rules>
    </rewrite>
    <httpErrors errorMode="Detailed" />
  </system.webServer>
</configuration>

`.trim());
    }

    // 배포용 package.json 파일 생성

    const distNpmConfig = ObjectUtil.clone(this._getNpmConfig(this.rootPath))!;
    distNpmConfig.dependencies = {};
    for (const externalModuleName of externalModuleNames) {
      distNpmConfig.dependencies[externalModuleName] = "*";
    }
    delete distNpmConfig.optionalDependencies;
    delete distNpmConfig.devDependencies;
    delete distNpmConfig.peerDependencies;

    if (this.config.pm2 !== undefined) {
      distNpmConfig.scripts = { "start": "pm2 start pm2.json" };
    }

    await FsUtil.writeFileAsync(path.resolve(this.parsedTsconfig.options.outDir!, "package.json"), JSON.stringify(distNpmConfig, undefined, 2));

    this.emit("complete", buildResults);
  }

  public async watchAsync(): Promise<void> {
    await FsUtil.removeAsync(this.parsedTsconfig.options.outDir!);

    const externalModules = this._findExternalModules(true);
    const externalModuleNames = externalModules.map((item) => item.name);
    const externalModulePaths = externalModules.map((item) => item.path);

    // 빌드
    const webpackConfig = this._getWebpackConfig(true, externalModuleNames);
    const compiler = webpack(webpackConfig);
    await new Promise<void>((resolve, reject) => {
      compiler.hooks.watchRun.tapAsync(this.constructor.name, async (args, callback) => {
        this.emit("change");
        callback();

        this._logger.debug("Webpack 빌드 수행");

        await this._stopServerAsync();
      });

      compiler.watch({ poll: undefined }, async (err, stat) => {
        if (err != null) {
          reject(err);
          return;
        }

        // .config.json 파일 쓰기

        const configDistPath = path.resolve(this.parsedTsconfig.options.outDir!, ".config.json");
        await FsUtil.writeFileAsync(configDistPath, JSON.stringify(this.config.configs ?? {}, undefined, 2));

        // 결과 변환

        const results = SdWebpackUtil.getWebpackResults(stat!);

        // 서버 시작
        try {
          await this._startServerAsync();
        }
        catch (error) {
          if (error instanceof Error) {
            results.push({
              filePath: undefined,
              severity: "error",
              message: error.message
            });
          }
          else {
            throw error;
          }
        }

        // 결과 리턴

        this.emit("complete", results, this._server);
        this._logger.debug("Webpack 빌드 수행 결과", results);
        resolve();
      });
    });

    // external 변경에 따른 서버 재시작을 위한 WATCH 구성

    const getWatchPathsAsync = async (): Promise<string[]> => {
      const result: string[] = [];
      for (const modulePath of externalModulePaths) {
        const npmConfig = this._getNpmConfig(modulePath);
        if (!npmConfig) continue;
        const distPath = path.resolve(modulePath, path.dirname(npmConfig.es2020 ?? npmConfig.module ?? npmConfig.main ?? "dist"));
        const watchPaths = (await FsUtil.globAsync(path.resolve(distPath, "**")))
          .filter((item) => (
            item.includes("@simplysm")
            && FsUtil.exists(item)
            && FsUtil.isDirectory(item)
          ));

        result.push(...watchPaths);
      }

      return result;
    };

    const watchPaths = await getWatchPathsAsync();
    const watcher = new SdFsWatcher();
    watcher
      .onChange(async (changeInfos) => {
        const dirtyFilePaths = changeInfos
          .map((changeInfo) => changeInfo.filePath)
          .filter((item) => path.basename(item).includes("."))
          .distinct();

        if (dirtyFilePaths.length === 0) return;

        this.emit("change");
        this._logger.debug("서버 재시작");

        const watchPaths2 = await getWatchPathsAsync();
        watcher.replaceWatchPaths(watchPaths2);

        await this._stopServerAsync();

        const results: ISdPackageBuildResult[] = [];

        try {
          await this._startServerAsync();
        }
        catch (error) {
          if (error instanceof Error) {
            results.push({
              filePath: undefined,
              severity: "error",
              message: error.message
            });
          }
          else {
            throw error;
          }
        }

        this.emit("complete", results, this._server);
        this._logger.debug("서버 재시작 결과", results);
      })
      .watch(watchPaths);
  }

  private async _stopServerAsync(): Promise<void> {
    if (this._server) {
      await this._server.closeAsync();
      delete this._server;
    }
    const mainFilePath = path.resolve(this.parsedTsconfig.options.outDir!, "main.js");
    decache(mainFilePath);
  }

  private async _startServerAsync(): Promise<void> {
    await Wait.true(() => this._server === undefined);


    const mainFilePath = path.resolve(this.parsedTsconfig.options.outDir!, "main.js");

    // const prevLoggerConfigs = ObjectUtil.clone(Logger.configs);
    this._server = require(mainFilePath) as SdServiceServer | undefined;
    // Logger.configs = prevLoggerConfigs;

    if (!this._server) {
      throw new Error(`${mainFilePath}(0, 0): 'SdServiceServer'를 'export'해야 합니다.`);
    }


    await new Promise<void>((resolve) => {
      this._server!.on("ready", () => {
        resolve();
      });
    });
  }

  private _getWebpackConfig(watch: boolean, externalModuleNames: string[]): webpack.Configuration {
    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: ["node", "es2020"],
      profile: false,
      resolve: {
        roots: [this.rootPath],
        extensions: [".ts", ".tsx", ".js"],
        symlinks: true,
        // modules: [this.projectRootPath, "node_modules"],
        mainFields: ["es2020", "module", "main"]
      },
      /*resolveLoader: {
        symlinks: true,
        modules: [
          "node_modules",
          ...this._findAllNodeModules(__dirname, this.projectRootPath)
        ]
      },*/
      context: this.projectRootPath,
      entry: {
        main: [
          path.resolve(this.rootPath, "src/main.ts")
        ]
      },
      output: {
        clean: true,
        path: this.parsedTsconfig.options.outDir,
        // filename: watch ? "[name].js" : `[name].[chunkhash:20].js`,
        // chunkFilename: watch ? "[name].js" : "[name].[chunkhash:20].js",
        filename: "[name].js",
        chunkFilename: "[name].js",
        assetModuleFilename: "resources/[name][ext][query]",
        libraryTarget: watch ? "umd" : "commonjs"
      },
      performance: { hints: false },
      module: {
        strictExportPresence: true,
        rules: [
          ...watch ? [
            {
              test: /\.js$/,
              enforce: "pre",
              loader: require.resolve("source-map-loader"),
              options: {
                filterSourceMappingUrl: (mapUri: string, resourcePath: string) => {
                  return !resourcePath.includes("node_modules");
                }
              }
            }
          ] as any : [],
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: require.resolve("ts-loader"),
            options: {
              configFile: this.tsconfigFilePath,
              errorFormatter: (msg: ErrorInfo, colors: boolean) => {
                return `${msg.file}(${msg.line}, ${msg.character}): ${msg.code}: ${msg.severity} ${msg.content}`;
              }
            }
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip|pfx|pkl)$/,
            type: "asset/resource"
          }
        ]
      },
      ...watch ? {
        cache: { type: "memory", maxGenerations: 1 },
        snapshot: {
          immutablePaths: this._findAllInternalModuleCachePaths(),
          managedPaths: this._findAllInternalModuleCachePaths()
        }
      } : {
        cache: false
      },
      optimization: {
        minimizer: watch ? [] : [
          new JavaScriptOptimizerPlugin({
            sourcemap: false,
            target: this.parsedTsconfig.options.target,
            keepNames: true,
            removeLicenses: true,
            advanced: true
          }) as any
        ],
        moduleIds: "deterministic",
        chunkIds: watch ? "named" : "deterministic",
        emitOnErrors: watch
      },
      plugins: [
        new DedupeModuleResolvePlugin({ verbose: false }) as any,
        ...watch ? [] : [
          new LicenseWebpackPlugin({
            stats: { warnings: false, errors: false },
            perChunkOutput: false,
            outputFilename: "3rdpartylicenses.txt",
            skipChildCompilers: true
          })
        ],
        new CopyWebpackPlugin({
          patterns: ["assets/"].map((item) => ({
            context: this.rootPath,
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
              ].map((i) => PathUtil.posix(this.rootPath, i))
            },
            priority: 0
          }))
        }),
        new webpack.EnvironmentPlugin({
          SD_VERSION: this._getNpmConfig(this.rootPath)!.version,
          ...this.config.env
        }),
        ...!this.skipProcesses.includes("lint") ? [
          new ESLintWebpackPlugin({
            context: this.rootPath,
            eslintPath: path.resolve(this.projectRootPath, "node_modules", "eslint"),
            extensions: ["js", "ts"],
            exclude: ["node_modules"],
            fix: false,
            threads: false,
            formatter: (results: LintResult[]) => {
              const resultMessages: string[] = [];
              for (const result of results) {
                for (const msg of result.messages) {
                  resultMessages.push(`${result.filePath}(${msg.line}, ${msg.column}): ${msg.ruleId ?? ""}: ${msg.severity === 1 ? "warning" : msg.severity === 2 ? "error" : ""} ${msg.message}`);
                }
              }
              return resultMessages.join(os.EOL);
            }
          })
        ] : [],
        new webpack.ProgressPlugin({
          handler: (per: number, msg: string, ...args: string[]) => {
            const phaseText = msg ? ` - phase: ${msg}` : "";
            const argsText = args.length > 0 ? ` - args: [${args.join(", ")}]` : "";
            this._logger.debug(`Webpack 빌드 수행중...(${Math.round(per * 100)}%)${phaseText}${argsText}`);
          }
        })
      ],
      node: false,
      externals: externalModuleNames,
      stats: "errors-warnings"
    };
  }

  private _findAllInternalModuleCachePaths(): string[] {
    return this._findAllNodeModules(this.rootPath, this.projectRootPath)
      .mapMany((item) => (
        FsUtil.readdir(item)
          .filter((item1) => item1 !== "@simplysm")
          .map((item1) => path.resolve(item, item1))
      ));
  }

  private _findAllNodeModules(from: string, root: string): string[] {
    const nodeModules: string[] = [];

    let current = from;
    while (current) {
      const potential = path.join(current, "node_modules");
      if (FsUtil.exists(potential) && FsUtil.isDirectory(potential)) {
        nodeModules.push(potential);
      }

      if (current === root) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return nodeModules;
  }

  private _findModulePath(moduleName: string, currentPath: string): string | undefined {
    const nodeModulesPaths = this._findAllNodeModules(currentPath, this.projectRootPath);

    for (const nodeModulePath of nodeModulesPaths) {
      const potential = path.join(nodeModulePath, moduleName);
      if (FsUtil.exists(potential)) {
        return potential;
      }
    }

    return undefined;
  }

  private _findExternalModules(all: boolean): { name: string; path: string }[] {
    const loadedModuleNames: string[] = [];
    const externalModules: { name: string; path: string }[] = [];

    const fn = (currPath: string): void => {
      const npmConfig = this._getNpmConfig(currPath);
      if (!npmConfig) return;

      for (const moduleName of Object.keys({
        ...npmConfig.dependencies,
        ...npmConfig.optionalDependencies
      })) {
        if (loadedModuleNames.includes(moduleName)) continue;
        loadedModuleNames.push(moduleName);

        const modulePath = this._findModulePath(moduleName, currPath);
        if (StringUtil.isNullOrEmpty(modulePath)) continue;

        if (all
          || this.config.externalDependencies?.includes(moduleName)
          || FsUtil.exists(path.resolve(modulePath, "binding.gyp"))) {
          externalModules.push({ path: modulePath, name: moduleName });
        }

        fn(modulePath);
      }
    };

    fn(this.rootPath);

    return externalModules.distinct();
  }

  private _getNpmConfig(rootPath: string): INpmConfig | undefined {
    if (!this.npmConfigCache.has(rootPath)) {
      this.npmConfigCache.set(rootPath, FsUtil.readJson(path.resolve(rootPath, "package.json")));
    }
    return this.npmConfigCache.get(rootPath);
  }
}
