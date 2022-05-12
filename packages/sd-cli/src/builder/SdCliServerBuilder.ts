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
import TerserPlugin from "terser-webpack-plugin";
import { ObjectUtil, StringUtil } from "@simplysm/sd-core-common";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import { SdCliNpmConfigUtil } from "../utils/SdCliNpmConfigUtil";
import { createHash } from "crypto";
import LintResult = ESLint.LintResult;

export class SdCliServerBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _tsconfigFilePath: string;
  private readonly _parsedTsconfig: ts.ParsedCommandLine;
  private readonly _npmConfigMap = new Map<string, INpmConfig>();

  private readonly _cacheBasePath = path.resolve(this._rootPath, ".cache");

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

  private async _checkCacheAsync(watch: boolean): Promise<void> {
    const workspacePkgLockContent = await FsUtil.readFileAsync(path.resolve(this._workspaceRootPath, "package-lock.json"));

    // const cachePath = path.resolve(cacheBasePath, pkgVersion);

    const versionHash = createHash("sha1")
      .update(workspacePkgLockContent)
      .update(JSON.stringify(this._parsedTsconfig.options))
      .update(JSON.stringify(this._config))
      .update(watch.toString())
      .digest("hex");
    if (
      !FsUtil.exists(path.resolve(this._cacheBasePath, "version")) // 버전파일이 없거나
      || (
        FsUtil.exists(path.resolve(this._cacheBasePath, "version")) &&
        await FsUtil.readFileAsync(path.resolve(this._cacheBasePath, "version")) !== versionHash
      ) // 버전이 현재 버전과 다르면
    ) {
      // 캐시 삭제
      await FsUtil.removeAsync(path.resolve(this._cacheBasePath));
    }
    // 버전쓰기
    await FsUtil.writeFileAsync(path.resolve(this._cacheBasePath, "version"), versionHash);
  }

  public async watchAsync(): Promise<void> {
    // DIST 비우기
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 캐시체크
    await this._checkCacheAsync(true);

    // 빌드 준비
    const extModules = this._getExternalModules();
    const webpackConfig = this._getWebpackConfig(true, extModules);
    const compiler = webpack(webpackConfig);
    await new Promise<void>((resolve, reject) => {
      compiler.hooks.watchRun.tapAsync(this.constructor.name, (args, callback) => {
        this.emit("change");
        this._logger.debug("Webpack 빌드 수행...");
        callback();
      });

      compiler.watch({}, async (err, stats) => {
        if (err != null || stats == null) {
          this.emit("complete", [{
            filePath: undefined,
            line: undefined,
            char: undefined,
            code: undefined,
            severity: "error",
            message: err?.stack ?? "알 수 없는 오류 (stats=null)"
          }]);
          reject(err);
          return;
        }

        // .config.json 파일 쓰기
        await this._writeDistConfigFileAsync();

        // 결과 반환
        this._logger.debug("Webpack 빌드 완료");
        const results = SdCliBuildResultUtil.convertFromWebpackStats(stats);
        this.emit("complete", results);
        resolve();
      });
    });
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    // DIST 비우기
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 빌드
    this._logger.debug("Webpack 빌드 수행...");
    const extModules = this._getExternalModules();
    const webpackConfig = this._getWebpackConfig(false, extModules);
    const compiler = webpack(webpackConfig);
    const buildResults = await new Promise<ISdCliPackageBuildResult[]>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err != null || stats == null) {
          reject(err);
          return;
        }

        // 결과 반환
        const results = SdCliBuildResultUtil.convertFromWebpackStats(stats);
        resolve(results);
      });
    });

    // .config.json 파일 쓰기
    await this._writeDistConfigFileAsync();

    // pm2.json 파일 쓰기
    await this._writeDistPm2ConfigFileAsync();

    // iis web.config 파일 쓰기
    await this._writeDistIisConfigFileAsync();

    // 배포용 package.json 파일 생성
    await this._writeDistNpmConfigFileAsync(extModules.filter((item) => item.exists).map((item) => item.name));

    // 마무리
    this._logger.debug("Webpack 빌드 완료");
    return buildResults;
  }

  private async _writeDistConfigFileAsync(): Promise<void> {
    const configDistPath = path.resolve(this._parsedTsconfig.options.outDir!, ".config.json");
    await FsUtil.writeFileAsync(configDistPath, JSON.stringify(this._config.configs ?? {}, undefined, 2));
  }

  private async _writeDistPm2ConfigFileAsync(): Promise<void> {
    if (this._config.pm2 === undefined || this._config.pm2 === false) return;

    const npmConfig = this._getNpmConfig(this._rootPath)!;
    const pm2DistPath = path.resolve(this._parsedTsconfig.options.outDir!, "pm2.json");
    await FsUtil.writeFileAsync(
      pm2DistPath,
      JSON.stringify(
        ObjectUtil.merge(
          {
            "name": npmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
            "script": path.basename(path.resolve(this._parsedTsconfig.options.outDir!, "main.js")),
            // "script": path.basename(path.resolve(this._parsedTsconfig.options.outDir!, "main.mjs")),
            // "node_args": "--experimental-specifier-resolution=node --experimental-import-meta-resolve",
            "watch": true,
            "watch_delay": 2000,
            "ignore_watch": [
              "node_modules",
              "www"
            ].distinct(),
            "interpreter": "node@" + process.versions.node,
            "env": {
              NODE_ENV: "production",
              SD_VERSION: npmConfig.version,
              TZ: "Asia/Seoul",
              ...this._config.env ? this._config.env : {}
            }
          },
          (typeof this._config.pm2 !== "boolean") ? this._config.pm2 : {},
          {
            arrayProcess: "concat",
            useDelTargetNull: true
          }),
        undefined,
        2
      )
    );
  }

  private async _writeDistIisConfigFileAsync(): Promise<void> {
    if (this._config.iis === undefined || this._config.iis === false) return;

    const iisDistPath = path.resolve(this._parsedTsconfig.options.outDir!, "web.config");
    const serverExeFilePath = (this._config.iis !== true && "serverExeFilePath" in this._config.iis)
      ? (this._config.iis.serverExeFilePath ?? "C:\\Program Files\\nodejs\\node.exe")
      : "C:\\Program Files\\nodejs\\node.exe";
    await FsUtil.writeFileAsync(iisDistPath, `
<configuration>
  <system.webServer>
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

  private async _writeDistNpmConfigFileAsync(deps: string[]): Promise<void> {
    const distNpmConfig = ObjectUtil.clone(this._getNpmConfig(this._rootPath))!;
    distNpmConfig.dependencies = {};
    for (const dep of deps) {
      distNpmConfig.dependencies[dep] = "*";
    }
    delete distNpmConfig.optionalDependencies;
    delete distNpmConfig.devDependencies;
    delete distNpmConfig.peerDependencies;

    if (this._config.pm2 !== undefined) {
      distNpmConfig.scripts = { "start": "pm2 start pm2.json" };
    }

    await FsUtil.writeFileAsync(
      path.resolve(this._parsedTsconfig.options.outDir!, "package.json"),
      JSON.stringify(distNpmConfig, undefined, 2)
    );
  }

  private _getInternalModuleCachePaths(workspaceName: string): string[] {
    return [
      ...FsUtil.findAllParentChildDirPaths("node_modules/*/package.json", this._rootPath, this._workspaceRootPath),
      ...FsUtil.findAllParentChildDirPaths(`node_modules/!(@simplysm|@${workspaceName})/*/package.json`, this._rootPath, this._workspaceRootPath),
    ].map((p) => path.dirname(p));
  }

  private _getWebpackConfig(watch: boolean, extModules: { name: string; exists: boolean }[]): webpack.Configuration {
    const workspaceNpmConfig = this._getNpmConfig(this._workspaceRootPath)!;
    const workspaceName = workspaceNpmConfig.name;

    const internalModuleCachePaths = watch ? this._getInternalModuleCachePaths(workspaceName) : undefined;

    const npmConfig = this._getNpmConfig(this._rootPath)!;
    const pkgKey = npmConfig.name.split("/").last()!;
    // const pkgVersion = npmConfig.version;

    let prevProgressMessage = "";
    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: ["node", "es2020"],
      // target: ["node", "es2020"],
      profile: false,
      resolve: {
        roots: [this._rootPath],
        extensions: [".ts", ".js", ".mjs", ".cjs"],
        symlinks: true,
        modules: [this._workspaceRootPath, "node_modules"],
        mainFields: ["es2020", "default", "module", "main"],
        conditionNames: ["es2020", "..."]
      },
      resolveLoader: {
        symlinks: true
      },
      context: this._workspaceRootPath,
      entry: {
        main: [
          path.resolve(this._rootPath, "src/main.ts")
        ]
      },
      output: {
        uniqueName: pkgKey,
        hashFunction: "xxhash64",
        clean: true,
        path: this._parsedTsconfig.options.outDir,
        filename: "[name].js",
        chunkFilename: "[name].js",
        // filename: "[name].mjs",
        // chunkFilename: "[name].mjs",
        assetModuleFilename: "res/[name][ext][query]",
        libraryTarget: "commonjs2"
        // library: {
        //   type: "module"
        // },
        // module: true
      },
      /*experiments: {
        outputModule: true
      },*/
      watch: false,
      watchOptions: { poll: undefined, ignored: undefined },
      performance: { hints: false },
      infrastructureLogging: { level: "error" },
      stats: "errors-warnings",
      externals: extModules.toObject((item) => item.name, (item) => "commonjs2 " + item.name),
      // externals: extModules.toObject((item) => item.name, (item) => "node-commonjs " + item.name),
      cache: {
        type: "filesystem",
        profile: watch ? undefined : false,
        cacheDirectory: this._cacheBasePath,
        maxMemoryGenerations: 1,
        name: "webpack"
      },
      snapshot: {
        immutablePaths: internalModuleCachePaths,
        managedPaths: internalModuleCachePaths
      },
      node: false,
      optimization: {
        minimizer: watch ? [] : [
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
              // module: true,
              format: {
                comments: false
              }
            }
          })
        ],
        moduleIds: "deterministic",
        chunkIds: watch ? "named" : "deterministic",
        emitOnErrors: watch
      },
      module: {
        strictExportPresence: true,
        parser: {
          javascript: {
            importMeta: false
          }
        },
        rules: [
          {
            test: /\.[cm]?[tj]sx?$/,
            resolve: {
              fullySpecified: false
            }
          },
          ...watch ? [
            {
              test: /\.[cm]?jsx?$/,
              enforce: "pre" as const,
              loader: "source-map-loader",
              options: {
                filterSourceMappingUrl: (mapUri: string, resourcePath: string) => {
                  const workspaceRegex = new RegExp(`node_modules[\\\\/]@${workspaceName}[\\\\/]`);
                  return !resourcePath.includes("node_modules")
                    || (/node_modules[\\/]@simplysm[\\/]/).test(resourcePath)
                    || workspaceRegex.test(resourcePath);
                }
              }
            }
          ] : [],
          {
            test: /\.[cm]?tsx?$/,
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
        ...watch ? [] : [
          new LicenseWebpackPlugin({
            stats: { warnings: false, errors: false },
            perChunkOutput: false,
            outputFilename: "3rd_party_licenses.txt",
            skipChildCompilers: true
          }) as any
        ],
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
          eslintPath: path.resolve(this._workspaceRootPath, "node_modules", "eslint"),
          exclude: ["node_modules"],
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
            const progressMessage = `Webpack 빌드 수행중...(${Math.round(per * 100)}%)${phaseText}${argsText}`;
            if (progressMessage !== prevProgressMessage) {
              prevProgressMessage = progressMessage;
              this._logger.debug(progressMessage);
            }
          }
        })
      ]
    };
  }

  private _getExternalModules(): { name: string; exists: boolean }[] {
    const loadedModuleNames: string[] = [];
    const results: { name: string; exists: boolean }[] = [];

    const fn = (currPath: string): void => {
      const npmConfig = this._getNpmConfig(currPath);
      if (!npmConfig) return;

      const deps = SdCliNpmConfigUtil.getDependencies(npmConfig);

      for (const moduleName of deps.defaults) {
        if (loadedModuleNames.includes(moduleName)) continue;
        loadedModuleNames.push(moduleName);

        const modulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + moduleName, currPath, this._workspaceRootPath).first();
        if (StringUtil.isNullOrEmpty(modulePath)) {
          continue;
        }

        if (FsUtil.glob(path.resolve(modulePath, "**/binding.gyp")).length > 0) {
          results.push({ name: moduleName, exists: true });
        }

        if (this._config.externalNodeModules?.includes(moduleName)) {
          results.push({ name: moduleName, exists: true });
        }

        fn(modulePath);
      }

      for (const optModuleName of deps.optionals) {
        if (loadedModuleNames.includes(optModuleName)) continue;
        loadedModuleNames.push(optModuleName);

        const optModulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + optModuleName, currPath, this._workspaceRootPath).first();
        if (StringUtil.isNullOrEmpty(optModulePath)) {
          results.push({ name: optModuleName, exists: false });
          continue;
        }

        if (FsUtil.glob(path.resolve(optModulePath, "**/binding.gyp")).length > 0) {
          results.push({ name: optModuleName, exists: true });
        }

        if (this._config.externalNodeModules?.includes(optModuleName)) {
          results.push({ name: optModuleName, exists: true });
        }

        fn(optModulePath);
      }
    };

    fn(this._rootPath);

    return results;
  }

  private _getNpmConfig(pkgPath: string): INpmConfig | undefined {
    if (!this._npmConfigMap.has(pkgPath)) {
      this._npmConfigMap.set(pkgPath, FsUtil.readJson(path.resolve(pkgPath, "package.json")));
    }
    return this._npmConfigMap.get(pkgPath);
  }
}
