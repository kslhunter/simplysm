import { INpmConfig, ISdCliClientPackageConfig, ISdCliPackageBuildResult, ITsconfig } from "../commons";
import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import webpack from "webpack";
import path from "path";
import ts from "typescript";
import { SdCliBuildResultUtil } from "../utils/SdCliBuildResultUtil";
import { NamedChunksPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/named-chunks-plugin";
import {
  DedupeModuleResolvePlugin,
  JavaScriptOptimizerPlugin,
  SuppressExtractedTextChunksWebpackPlugin
} from "@angular-devkit/build-angular/src/webpack/plugins";
import CopyWebpackPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { AngularWebpackPlugin } from "@ngtools/webpack";
import { IndexHtmlWebpackPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/index-html-webpack-plugin";
import { SassWorkerImplementation } from "@angular-devkit/build-angular/src/sass/sass-service";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { createHash } from "crypto";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import os from "os";
import { ESLint } from "eslint";
import { TransferSizePlugin } from "@angular-devkit/build-angular/src/webpack/plugins/transfer-size-plugin";
import { CssOptimizerPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/css-optimizer-plugin";
import browserslist from "browserslist";
import { augmentAppWithServiceWorker } from "@angular-devkit/build-angular/src/utils/service-worker";
import { SdCliNgModuleGenerator } from "../ng-tools/SdCliNgModuleGenerator";
import { SdCliCordova } from "../build-tool/SdCliCordova";
import { SdCliNpmConfigUtil } from "../utils/SdCliNpmConfigUtil";
import electronBuilder from "electron-builder";
import { fileURLToPath } from "url";
import { Entrypoint } from "@angular-devkit/build-angular/src/utils/index-file/augment-index-html";
import { StringUtil } from "@simplysm/sd-core-common";
import LintResult = ESLint.LintResult;

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger: Logger;

  private readonly _tsconfigFilePath: string;
  private readonly _parsedTsconfig: ts.ParsedCommandLine;
  private readonly _npmConfigMap = new Map<string, INpmConfig>();
  private readonly _ngModuleGenerator: SdCliNgModuleGenerator;

  private readonly _cordova?: SdCliCordova;

  private readonly _hasAngularRoute: boolean;

  private readonly _cacheBasePath = path.resolve(this._rootPath, ".cache");

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdCliClientPackageConfig,
                     private readonly _projRootPath: string) {
    super();

    const npmConfig = this._getNpmConfig(this._rootPath)!;
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, npmConfig.name]);

    // tsconfig
    this._tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    const tsconfig = FsUtil.readJson(this._tsconfigFilePath) as ITsconfig;
    this._parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath, tsconfig.angularCompilerOptions);

    // isAngular
    this._hasAngularRoute = SdCliNpmConfigUtil.getDependencies(npmConfig).defaults.includes("@angular/router");

    // NgModule 생성기 초기화
    this._ngModuleGenerator = new SdCliNgModuleGenerator(this._rootPath, [
      "controls",
      "directives",
      "guards",
      "modals",
      "providers",
      "app",
      "pages",
      "print-templates",
      "toasts",
      "AppPage"
    ], this._hasAngularRoute ? {
      glob: "**/*Page.ts",
      fileEndsWith: "Page",
      rootClassName: "AppPage"
    } : undefined);

    // CORDOVA
    if (this._config.builder?.cordova) {
      this._cordova = new SdCliCordova(this._rootPath, this._config.builder.cordova);
    }
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  private async _checkCacheAsync(watch: boolean): Promise<void> {
    const projPkgLockContent = await FsUtil.readFileAsync(path.resolve(this._projRootPath, "package-lock.json"));

    // const cachePath = path.resolve(cacheBasePath, pkgVersion);

    const versionHash = createHash("sha1")
      .update(projPkgLockContent)
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
    await FsUtil.removeAsync(path.resolve(this._rootPath, ".cache", "electron"));
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 캐시체크
    await this._checkCacheAsync(true);

    // NgModule 생성
    await this._ngModuleGenerator.runAsync();

    // CORDOVA 초기화
    if (this._cordova) {
      this._logger.debug("CORDOVA 구성...");
      await this._cordova.initializeAsync();
    }

    // 빌드 준비
    const extModules = this._config.builder?.electron ? this._getExternalModules() : [];
    const webpackConfigs = (Object.keys(this._config.builder ?? { web: {} }) as ("web" | "cordova" | "electron")[])
      .map((builderType) => this._getWebpackConfig(true, builderType, extModules));
    const multiCompiler = webpack(webpackConfigs);
    await new Promise<void>((resolve, reject) => {
      // const invalidFiles: string[] = [];
      multiCompiler.hooks.invalid.tap(this.constructor.name, (fileName) => {
        if (fileName != null) {
          this._logger.debug("파일변경 감지", fileName);

          // NgModule 캐시 삭제
          this._ngModuleGenerator.removeCaches([path.resolve(fileName)]);

          // invalidFiles.push(fileName);
        }
      });

      multiCompiler.hooks.watchRun.tapAsync(this.constructor.name, async (args, callback) => {
        this.emit("change");

        // NgModule 생성
        await this._ngModuleGenerator.runAsync();

        callback();

        this._logger.debug("Webpack 빌드 수행...");
      });

      multiCompiler.watch({}, async (err, multiStats) => {
        if (err != null || multiStats == null) {
          this.emit("complete", [{
            filePath: undefined,
            line: undefined,
            char: undefined,
            code: undefined,
            severity: "error",
            message: err?.stack ?? "알 수 없는 오류 (multiStats=null)"
          }]);
          reject(err);
          return;
        }

        // .config.json 파일 쓰기
        const npmConfig = this._getNpmConfig(this._rootPath)!;
        const packageKey = npmConfig.name.split("/").last()!;

        const configDistPath = typeof this._config.server === "string"
          ? path.resolve(this._projRootPath, "packages", this._config.server, "dist/www", packageKey, ".config.json")
          : path.resolve(this._parsedTsconfig.options.outDir!, ".config.json");
        await FsUtil.writeFileAsync(configDistPath, JSON.stringify(this._config.configs ?? {}, undefined, 2));

        // 완료 로그
        this._logger.debug("Webpack 빌드 완료");

        // 결과 반환
        const results = multiStats.stats.mapMany((stats) => SdCliBuildResultUtil.convertFromWebpackStats(stats));
        this.emit("complete", results);

        resolve();
      });
    });
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    // DIST 비우기
    this._logger.debug("removeAsync:1");
    await FsUtil.removeAsync(path.resolve(this._rootPath, ".cache", "electron"));
    this._logger.debug("removeAsync:2");
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 캐시체크
    await this._checkCacheAsync(false);

    // NgModule 생성
    this._logger.debug("ngModule");
    await this._ngModuleGenerator.runAsync();

    // CORDOVA 초기화
    this._logger.debug("Cordova");
    if (this._cordova) {
      this._logger.debug("CORDOVA 구성...");
      await this._cordova.initializeAsync();
    }

    // 빌드
    this._logger.debug("Webpack 빌드 수행...");
    const extModules = this._config.builder?.electron ? this._getExternalModules() : [];
    const builderTypes = (Object.keys(this._config.builder ?? { web: {} }) as ("web" | "cordova" | "electron")[]);
    const webpackConfigs = builderTypes.map((builderType) => this._getWebpackConfig(false, builderType, extModules));
    const multipleCompiler = webpack(webpackConfigs);
    const buildResults = await new Promise<ISdCliPackageBuildResult[]>((resolve, reject) => {
      multipleCompiler.run((err, multiStats) => {
        if (err != null || multiStats == null) {
          reject(err);
          return;
        }

        // 결과 반환
        const results = multiStats.stats.mapMany((stats) => SdCliBuildResultUtil.convertFromWebpackStats(stats));
        resolve(results);
      });
    });

    // .config.json 파일 쓰기
    const targetPath = path.resolve(this._parsedTsconfig.options.outDir!, ".config.json");
    await FsUtil.writeFileAsync(targetPath, JSON.stringify(this._config.configs ?? {}, undefined, 2));

    // service-worker 처리
    if (builderTypes.includes("web") && FsUtil.exists(path.resolve(this._rootPath, "ngsw-config.json"))) {
      const packageKey = this._getNpmConfig(this._rootPath)!.name.split("/").last()!;
      await augmentAppWithServiceWorker(
        PathUtil.posix(path.relative(this._projRootPath, this._rootPath)) as any,
        PathUtil.posix(this._projRootPath),
        PathUtil.posix(path.relative(this._projRootPath, path.resolve(this._parsedTsconfig.options.outDir!))) as any,
        `/${packageKey}/` as any,
        PathUtil.posix(path.relative(this._projRootPath, path.resolve(this._rootPath, "ngsw-config.json")))
      );
    }

    // CORDOVA 빌드
    if (this._cordova) {
      this._logger.debug("CORDOVA 빌드...");
      await this._cordova.buildAsync(this._parsedTsconfig.options.outDir!);
    }

    // ELECTRON
    if (this._config.builder?.electron) {
      const npmConfig = this._getNpmConfig(this._rootPath)!;

      const electronVersion = npmConfig.dependencies?.["electron"];
      if (electronVersion === undefined) {
        throw new Error("ELECTRON 빌드 패키지의 'dependencies'에는 'electron'이 반드시 포함되어야 합니다.");
      }

      const dotenvVersion = npmConfig.dependencies?.["dotenv"];
      if (dotenvVersion === undefined) {
        throw new Error("ELECTRON 빌드 패키지의 'dependencies'에는 'dotenv'가 반드시 포함되어야 합니다.");
      }

      const remoteVersion = npmConfig.dependencies?.["@electron/remote"];

      const electronSrcPath = path.resolve(this._rootPath, `.cache/electron/src`);
      const electronDistPath = path.resolve(this._rootPath, `.cache/electron/dist`);

      await FsUtil.writeJsonAsync(path.resolve(electronSrcPath, `package.json`), {
        name: npmConfig.name,
        version: npmConfig.version,
        description: npmConfig.description,
        main: "electron.js",
        author: npmConfig.author,
        license: npmConfig.license,
        devDependencies: {
          "electron": electronVersion.replace("^", "")
        },
        dependencies: {
          "dotenv": dotenvVersion,
          ...remoteVersion !== undefined ? {
            "@electron/remote": remoteVersion
          } : {},
          ...extModules.filter((item) => item.exists).map((item) => item.name)
            .toObject((item) => item, () => "*")
        }
      }, { space: 2 });
      await FsUtil.writeFileAsync(path.resolve(electronSrcPath, "package-lock.json"), "");

      await FsUtil.writeFileAsync(path.resolve(electronSrcPath, `.env`), [
        "NODE_ENV=production",
        `SD_VERSION=${npmConfig.version}`,
        (this._config.builder.electron.icon !== undefined) ? `SD_ELECTRON_ICON=${this._config.builder.electron.icon}` : `SD_ELECTRON_ICON=favicon.ico`,
        ...(this._config.env !== undefined) ? Object.keys(this._config.env).map((key) => `${key}=${this._config.env![key]}`) : [],
        ...(this._config.builder.electron.env !== undefined) ? Object.keys(this._config.builder.electron.env).map((key) => `${key}=${this._config.builder!.electron!.env![key]}`) : []
      ].filterExists().join("\n"));

      let electronTsFileContent = await FsUtil.readFileAsync(path.resolve(this._rootPath, `src/electron.ts`));
      electronTsFileContent = "require(\"dotenv\").config({ path: `${__dirname}\\\\.env` });\n" + electronTsFileContent;
      const result = ts.transpileModule(electronTsFileContent, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
      await FsUtil.writeFileAsync(path.resolve(electronSrcPath, "electron.js"), result.outputText);

      await electronBuilder.build({
        targets: electronBuilder.Platform.WINDOWS.createTarget(),
        config: {
          appId: this._config.builder.electron.appId,
          productName: npmConfig.description,
          // asar: false,
          win: {
            target: "nsis"
          },
          nsis: {},
          directories: {
            app: electronSrcPath,
            output: electronDistPath
          },
          ...this._config.builder.electron.installerIcon !== undefined ? {
            icon: path.resolve(this._rootPath, "src", this._config.builder.electron.installerIcon)
          } : {}
        }
      });

      await FsUtil.copyAsync(
        path.resolve(this._rootPath, `.cache/electron/dist/${npmConfig.description} Setup ${npmConfig.version}.exe`),
        path.resolve(this._parsedTsconfig.options.outDir!, `electron/${npmConfig.description}-latest.exe`)
      );

      await FsUtil.copyAsync(
        path.resolve(this._rootPath, `.cache/electron/dist/${npmConfig.description} Setup ${npmConfig.version}.exe`),
        path.resolve(this._parsedTsconfig.options.outDir!, `electron/updates/${npmConfig.version}.exe`)
      );
    }

    // 마무리
    this._logger.debug("Webpack 빌드 완료");
    return buildResults;
  }

  private _getInternalModuleCachePaths(projName: string): string[] {
    return [
      ...FsUtil.findAllParentChildDirPaths("node_modules/*/package.json", this._rootPath, this._projRootPath),
      ...FsUtil.findAllParentChildDirPaths(`node_modules/!(@simplysm|@${projName})/*/package.json`, this._rootPath, this._projRootPath),
    ].map((p) => path.dirname(p));
  }

  private _getWebpackConfig(watch: boolean, builderType: "web" | "cordova" | "electron", extModules: { name: string; exists: boolean }[]): webpack.Configuration {
    const projNpmConfig = this._getNpmConfig(this._projRootPath)!;
    const projName = projNpmConfig.name;

    const internalModuleCachePaths = watch ? this._getInternalModuleCachePaths(projName) : undefined;

    const npmConfig = this._getNpmConfig(this._rootPath)!;

    const projPkgLockContent = FsUtil.readFile(path.resolve(this._projRootPath, "package-lock.json"));

    const pkgKey = npmConfig.name.split("/").last()!;
    const publicPath = builderType === "web" ? `/${pkgKey}/` : watch ? `/${pkgKey}/${builderType}/` : ``;

    const distPath = (builderType === "cordova" && !watch) ? path.resolve(this._cordova!.cordovaPath, "www")
      : (builderType === "electron" && !watch) ? path.resolve(this._rootPath, ".cache/electron/src")
        : builderType === "web" ? this._parsedTsconfig.options.outDir
          : `${this._parsedTsconfig.options.outDir}/${builderType}`;

    const sassImplementation = new SassWorkerImplementation();

    const mainFilePath = path.resolve(this._rootPath, "src/main.ts");
    const polyfillsFilePath = path.resolve(this._rootPath, "src/polyfills.ts");
    const stylesFilePath = path.resolve(this._rootPath, "src/styles.scss");

    const versionHash = createHash("sha1")
      .update(projPkgLockContent)
      .update(JSON.stringify(this._parsedTsconfig.options))
      .update(JSON.stringify(this._config))
      .update(watch.toString())
      .digest("hex");
    if (
      !FsUtil.exists(path.resolve(this._cacheBasePath, "version")) // 버전파일이 없거나
      || (
        FsUtil.exists(path.resolve(this._cacheBasePath, "version")) &&
        FsUtil.readFile(path.resolve(this._cacheBasePath, "version")) !== versionHash
      ) // 버전이 현재 버전과 다르면
    ) {
      // 캐시 삭제
      FsUtil.remove(path.resolve(this._cacheBasePath));
    }
    // 버전쓰기
    FsUtil.writeFile(path.resolve(this._cacheBasePath, "version"), versionHash);

    let prevProgressMessage = "";
    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: builderType === "electron" ? ["electron-renderer", "es2015"] : ["web", "es2015"],
      profile: false,
      resolve: {
        roots: [this._rootPath],
        extensions: [".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx"],
        symlinks: true,
        modules: [this._projRootPath, "node_modules"],
        mainFields: ["es2015", "browser", "module", "main"],
        conditionNames: ["es2015", "..."],
      },
      resolveLoader: {
        symlinks: true
      },
      context: this._projRootPath,
      entry: {
        main: [mainFilePath],
        ...FsUtil.exists(polyfillsFilePath) ? { polyfills: [polyfillsFilePath] } : {},
        ...FsUtil.exists(stylesFilePath) ? { styles: [stylesFilePath] } : {},
        ...builderType === "cordova" ? { "cordova-entry": path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../lib/cordova-entry.js`) } : {}
      },
      output: {
        uniqueName: pkgKey,
        hashFunction: "xxhash64",
        clean: true,
        path: distPath,
        publicPath,
        filename: "[name].js",
        chunkFilename: "[name].js",
        libraryTarget: undefined,
        crossOriginLoading: false,
        trustedTypes: "angular#bundler",
        scriptType: "module"
      },
      watch: false,
      watchOptions: {
        poll: undefined,
        ignored: undefined
      },
      performance: { hints: false },
      ignoreWarnings: [
        /Failed to parse source map from/,
        /Add postcss as project dependency/,
        /"@charset" must be the first rule in the file/
      ],
      experiments: { backCompat: false, syncWebAssembly: true, asyncWebAssembly: true },
      infrastructureLogging: { level: "error" },
      stats: "errors-warnings",
      externals: extModules.toObject((item) => item.name, (item) => item.exists ? "commonjs2 " + item.name : `var {name: '${item.name}'}`),
      cache: {
        type: "filesystem",
        profile: undefined,
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
          new JavaScriptOptimizerPlugin({
            define: {
              ngDevMode: false,
              ngI18nClosureMode: false,
              ngJitMode: false
            },
            sourcemap: false,
            target: ts.ScriptTarget.ES2017,
            keepIdentifierNames: true,
            keepNames: true,
            removeLicenses: true,
            advanced: true
          }),
          new TransferSizePlugin(),
          new CssOptimizerPlugin({
            supportedBrowsers: browserslist([
              "last 1 Chrome versions",
              "last 2 Edge major versions"
            ], { path: this._projRootPath })
          })
        ] as any[],
        moduleIds: "deterministic",
        chunkIds: watch ? "named" : "deterministic",
        emitOnErrors: watch,
        runtimeChunk: "single",
        splitChunks: {
          maxAsyncRequests: Infinity,
          cacheGroups: {
            default: {
              chunks: "async",
              minChunks: 2,
              priority: 10
            },
            common: {
              name: "common",
              chunks: "async",
              minChunks: 2,
              enforce: true,
              priority: 5
            },
            vendors: false,
            defaultVendors: watch ? {
              name: "vendor",
              chunks: (chunk) => chunk.name === "main",
              enforce: true,
              test: /[\\/]node_modules[\\/]/
            } : false
          }
        }
      },
      module: {
        strictExportPresence: true,
        parser: { javascript: { url: false, worker: false } },
        rules: [
          {
            test: /\.?(svg|html)$/,
            resourceQuery: /\?ngResource/,
            type: "asset/source"
          },
          {
            test: /[/\\]rxjs[/\\]add[/\\].+\.js$/,
            sideEffects: true
          },
          {
            test: /\.[cm]?[tj]sx?$/,
            resolve: { fullySpecified: false },
            exclude: [/[/\\](?:core-js|@babel|tslib|web-animations-js|web-streams-polyfill)[/\\]/],
            use: [
              {
                loader: "@angular-devkit/build-angular/src/babel/webpack-loader",
                options: {
                  cacheDirectory: path.resolve(this._cacheBasePath, "webpack-babel"),
                  scriptTarget: ts.ScriptTarget.ES2017,
                  aot: true,
                  optimize: !watch,
                  instrumentCode: undefined
                }
              }
            ]
          },
          ...watch ? [
            {
              test: /\.[cm]?jsx?$/,
              enforce: "pre" as const,
              loader: "source-map-loader",
              options: {
                filterSourceMappingUrl: (mapUri: string, resourcePath: string) => {
                  const projRegex = new RegExp(`node_modules[\\\\/]@${projName}[\\\\/]`);
                  return !resourcePath.includes("node_modules")
                    || (/node_modules[\\/]@simplysm[\\/]/).test(resourcePath)
                    || projRegex.test(resourcePath);
                }
              }
            }
          ] : [],
          {
            test: /\.[cm]?tsx?$/,
            loader: "@ngtools/webpack",
            exclude: [/[/\\](?:css-loader|mini-css-extract-plugin|webpack)[/\\]/]
          },
          {
            test: /\.css$/i,
            type: "asset/source"
          },
          {
            test: /\.scss$/i,
            rules: [
              {
                oneOf: [
                  {
                    use: [
                      {
                        loader: MiniCssExtractPlugin.loader
                      },
                      {
                        loader: "css-loader",
                        options: { url: false, sourceMap: watch }
                      }
                    ],
                    include: [stylesFilePath],
                    resourceQuery: { not: [/\?ngResource/] }
                  },
                  {
                    type: "asset/source",
                    resourceQuery: /\?ngResource/
                  }
                ]
              },
              {
                use: [
                  {
                    loader: "resolve-url-loader",
                    options: { sourceMap: watch }
                  },
                  {
                    loader: "sass-loader",
                    options: {
                      implementation: sassImplementation,
                      sourceMap: true,
                      sassOptions: {
                        fiber: false,
                        precision: 8,
                        includePaths: [],
                        outputStyle: "expanded",
                        quietDeps: true,
                        verbose: watch ? undefined : false
                      }
                    }
                  }
                ]
              }
            ]
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip|pfx|pkl)$/,
            type: "asset/resource"
          }
        ]
      },
      plugins: [
        new NodePolyfillPlugin({
          excludeAliases: builderType === "electron" ? ["process"] : []
        }),
        new NamedChunksPlugin(),
        new DedupeModuleResolvePlugin(),
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
        }),
        ...watch ? [] : [
          new LicenseWebpackPlugin({
            stats: { warnings: false, errors: false },
            perChunkOutput: false,
            outputFilename: "3rdpartylicenses.txt",
            skipChildCompilers: true
          })
        ],
        new CopyWebpackPlugin({
          patterns: [
            ...["favicon.ico", "assets/", "manifest.json"].map((item) => ({
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
            })),
            ...builderType === "cordova" && watch ? this._cordova!.platforms.mapMany((platform) => [
              {
                context: this._cordova!.cordovaPath,
                to: `cordova-${platform}/plugins`,
                from: `platforms/${platform}/platform_www/plugins`,
                noErrorOnMissing: true
              },
              {
                context: this._cordova!.cordovaPath,
                to: `cordova-${platform}/cordova.js`,
                from: `platforms/${platform}/platform_www/cordova.js`
              },
              {
                context: this._cordova!.cordovaPath,
                to: `cordova-${platform}/cordova_plugins.js`,
                from: `platforms/${platform}/platform_www/cordova_plugins.js`,
                noErrorOnMissing: true
              },
              {
                context: this._cordova!.cordovaPath,
                to: `cordova-${platform}/config.xml`,
                from: `platforms/${platform}/www/config.xml`,
                noErrorOnMissing: true
              }
            ]) : []
          ]
        }),
        ...watch ? [
          new webpack.SourceMapDevToolPlugin({
            filename: "[file].map",
            include: [/js$/, /css$/],
            sourceRoot: "webpack:///",
            moduleFilenameTemplate: "[resource-path]",
            append: undefined
          })
        ] : [],
        new AngularWebpackPlugin({
          tsconfig: this._tsconfigFilePath,
          compilerOptions: {
            sourceMap: watch,
            declaration: false,
            declarationMap: false,
            preserveSymlinks: false
          },
          jitMode: false,
          emitNgModuleScope: watch,
          inlineStyleFileExtension: "scss"
        }),
        {
          apply: (compiler: webpack.Compiler) => {
            compiler.hooks.shutdown.tap("sass-worker", () => {
              sassImplementation.close();
            });
          }
        },
        new MiniCssExtractPlugin({ filename: "[name].css" }),
        new SuppressExtractedTextChunksWebpackPlugin(),
        new IndexHtmlWebpackPlugin({
          indexPath: path.resolve(this._rootPath, "src/index.html"),
          outputPath: "index.html",
          baseHref: publicPath,
          entrypoints: [
            ["runtime", !watch],
            ["polyfills", true],
            ["styles", false],
            ["vendor", true],
            ["main", true],
            ...builderType === "cordova" ? [
              ["cordova-entry", true] as Entrypoint
            ] : []
          ],
          deployUrl: undefined,
          sri: false,
          cache: {
            enabled: true,
            basePath: this._cacheBasePath,
            path: path.resolve(this._cacheBasePath, "webpack-html")
          },
          postTransform: undefined,
          optimization: {
            scripts: !watch,
            styles: { minify: !watch, inlineCritical: !watch },
            fonts: { inline: !watch }
          },
          crossOrigin: "none",
          lang: undefined
        }),
        new webpack.EnvironmentPlugin({
          SD_VERSION: this._getNpmConfig(this._rootPath)!.version,
          ...this._config.env,
          ...this._config.builder?.[builderType]?.env
        }),
        new ESLintWebpackPlugin({
          context: this._rootPath,
          eslintPath: path.resolve(this._projRootPath, "node_modules", "eslint"),
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
        })
      ] as any[]
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

        const modulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + moduleName, currPath, this._projRootPath).first();
        if (StringUtil.isNullOrEmpty(modulePath)) {
          continue;
        }

        if (FsUtil.glob(path.resolve(modulePath, "**/binding.gyp")).length > 0) {
          results.push({ name: moduleName, exists: true });
        }

        if (this._config.builder?.electron?.externalNodeModules?.includes(moduleName)) {
          results.push({ name: moduleName, exists: true });
        }

        fn(modulePath);
      }

      for (const optModuleName of deps.optionals) {
        if (loadedModuleNames.includes(optModuleName)) continue;
        loadedModuleNames.push(optModuleName);

        const optModulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + optModuleName, currPath, this._projRootPath).first();
        if (StringUtil.isNullOrEmpty(optModulePath)) {
          results.push({ name: optModuleName, exists: false });
          continue;
        }

        if (FsUtil.glob(path.resolve(optModulePath, "**/binding.gyp")).length > 0) {
          results.push({ name: optModuleName, exists: true });
        }

        if (this._config.builder?.electron?.externalNodeModules?.includes(optModuleName)) {
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
