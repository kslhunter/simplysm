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
import { HmrLoader } from "@angular-devkit/build-angular/src/webpack/plugins/hmr/hmr-loader";
import wdm from "webpack-dev-middleware";
import whm from "webpack-hot-middleware";
import { NextHandleFunction } from "connect";
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
import LintResult = ESLint.LintResult;

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger: Logger;

  private readonly _tsconfigFilePath: string;
  private readonly _parsedTsconfig: ts.ParsedCommandLine;
  private readonly _npmConfigMap = new Map<string, INpmConfig>();
  private readonly _ngModuleGenerator: SdCliNgModuleGenerator;

  private readonly _cordova?: SdCliCordova;

  private readonly _hasAngularRoute: boolean;

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdCliClientPackageConfig,
                     private readonly _workspaceRootPath: string) {
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

  public async watchAsync(): Promise<NextHandleFunction[]> {
    // DIST 비우기
    await FsUtil.removeAsync(path.resolve(this._rootPath, ".electron"));
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // NgModule 생성
    await this._ngModuleGenerator.runAsync();

    // CORDOVA
    if (this._cordova) {
      this._logger.debug("CORDOVA 구성...");
      await this._cordova.initializeAsync();
    }

    // 빌드 준비
    const webpackConfigs = (Object.keys(this._config.builder ?? { web: {} }) as ("web" | "cordova" | "electron")[])
      .map((builderType) => this._getWebpackConfig(true, builderType));
    const multiCompiler = webpack(webpackConfigs);
    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      multiCompiler.hooks.invalid.tap(this.constructor.name, (fileName) => {
        if (fileName != null) {
          this._logger.debug("파일변경 감지", fileName);
          // NgModule 캐시 삭제
          this._ngModuleGenerator.removeCaches([path.resolve(fileName)]);
        }
      });

      multiCompiler.hooks.watchRun.tapAsync(this.constructor.name, async (args, callback) => {
        this.emit("change");

        // NgModule 생성
        await this._ngModuleGenerator.runAsync();

        callback();

        this._logger.debug("Webpack 빌드 수행...");
      });

      for (const compiler of multiCompiler.compilers) {
        compiler.hooks.failed.tap(this.constructor.name, (err) => {
          this.emit("complete", [{
            filePath: undefined,
            line: undefined,
            char: undefined,
            code: undefined,
            severity: "error",
            message: err.stack
          }]);
          reject(err);
          return;
        });
      }

      multiCompiler.hooks.done.tap(this.constructor.name, async (multiStats) => {
        // 결과 반환
        const results = multiStats.stats.mapMany((stats) => SdCliBuildResultUtil.convertFromWebpackStats(stats));

        // .config.json 파일 쓰기
        const npmConfig = this._getNpmConfig(this._rootPath)!;
        const packageKey = npmConfig.name.split("/").last()!;

        const configDistPath = typeof this._config.server === "string"
          ? path.resolve(this._workspaceRootPath, "packages", this._config.server, "dist/www", packageKey, ".config.json")
          : path.resolve(this._parsedTsconfig.options.outDir!, ".config.json");
        await FsUtil.writeFileAsync(configDistPath, JSON.stringify(this._config.configs ?? {}, undefined, 2));

        // 마무리
        this._logger.debug("Webpack 빌드 완료");
        resolve(middlewares);

        this.emit("complete", results);
      });

      const middlewares = multiCompiler.compilers.mapMany((compiler) => [
        wdm(compiler, {
          publicPath: compiler.options.output.publicPath,
          index: "index.html",
          stats: false
        }),
        whm(compiler, {
          path: `${compiler.options.output.publicPath}__webpack_hmr`,
          log: false
        })
      ]);
    });
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    // DIST 비우기
    await FsUtil.removeAsync(path.resolve(this._rootPath, ".electron"));
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // NgModule 생성
    await this._ngModuleGenerator.runAsync();

    // 빌드
    this._logger.debug("Webpack 빌드 수행...");
    const builderTypes = (Object.keys(this._config.builder ?? { web: {} }) as ("web" | "cordova" | "electron")[]);
    const webpackConfigs = builderTypes.map((builderType) => this._getWebpackConfig(false, builderType));
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
        PathUtil.posix(path.relative(this._workspaceRootPath, this._rootPath)) as any,
        PathUtil.posix(path.relative(this._workspaceRootPath, path.resolve(this._parsedTsconfig.options.outDir!))) as any,
        `/${packageKey}/`,
        PathUtil.posix(path.relative(this._workspaceRootPath, path.resolve(this._rootPath, "ngsw-config.json")))
      );
    }

    // CORDOVA
    if (this._cordova) {
      this._logger.debug("CORDOVA 구성...");
      await this._cordova.initializeAsync();

      this._logger.debug("CORDOVA 빌드...");
      await this._cordova.buildAsync(path.resolve(this._parsedTsconfig.options.outDir!, "cordova"));
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

      const electronSrcPath = path.resolve(this._rootPath, `.electron/src`);
      const electronDistPath = path.resolve(this._rootPath, `.electron/dist`);

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
          "dotenv": dotenvVersion
        }
      });

      await FsUtil.writeFileAsync(path.resolve(electronSrcPath, `.env`), [
        "NODE_ENV=production",
        `SD_VERSION=${npmConfig.version}`,
        (this._config.builder.electron.icon !== undefined) ? `SD_ELECTRON_ICON=${this._config.builder.electron.icon}` : `SD_ELECTRON_ICON=favicon.ico`,
        ...(this._config.env !== undefined) ? Object.keys(this._config.env).map((key) => `${key}=${this._config.env![key]}`) : []
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
          nsis: {},
          directories: {
            app: electronSrcPath,
            output: electronDistPath
          }
        }
      });

      await FsUtil.copyAsync(
        path.resolve(this._rootPath, `.electron/dist/${npmConfig.description} Setup ${npmConfig.version}.exe`),
        path.resolve(this._parsedTsconfig.options.outDir!, `electron/${npmConfig.description}-v${npmConfig.version}.exe`)
      );
      await FsUtil.copyAsync(
        path.resolve(this._rootPath, `.electron/dist/${npmConfig.description} Setup ${npmConfig.version}.exe`),
        path.resolve(this._parsedTsconfig.options.outDir!, `electron/${npmConfig.description}-latest.exe`)
      );
    }

    // 마무리
    this._logger.debug("Webpack 빌드 완료");
    return buildResults;
  }

  private _getInternalModuleCachePaths(workspaceName: string): string[] {
    return [
      ...FsUtil.findAllParentChildDirPaths("node_modules/*/package.json", this._rootPath, this._workspaceRootPath),
      ...FsUtil.findAllParentChildDirPaths(`node_modules/!(@simplysm|@${workspaceName})/*/package.json`, this._rootPath, this._workspaceRootPath),
    ].map((p) => path.dirname(p));
  }

  private _getWebpackConfig(watch: boolean, builderType: "web" | "cordova" | "electron"): webpack.Configuration {
    const workspaceNpmConfig = this._getNpmConfig(this._workspaceRootPath)!;
    const workspaceName = workspaceNpmConfig.name;

    const internalModuleCachePaths = watch ? this._getInternalModuleCachePaths(workspaceName) : undefined;

    const npmConfig = this._getNpmConfig(this._rootPath)!;
    // const pkgVersion = npmConfig.version;
    // const ngVersion = this._getNpmConfig(FsUtil.findAllParentChildDirPaths("node_modules/@angular/core", this._rootPath, this._workspaceRootPath)[0])!.version;

    const workspacePkgLockContent = FsUtil.readFile(path.resolve(this._workspaceRootPath, "package-lock.json"));

    const pkgKey = npmConfig.name.split("/").last()!;
    const publicPath = builderType === "web" ? `/${pkgKey}/` : watch ? `/${pkgKey}/${builderType}/` : ``;

    const cacheBasePath = path.resolve(this._rootPath, ".cache");
    // const cachePath = path.resolve(cacheBasePath, pkgVersion);

    const distPath = (builderType === "cordova" && !watch) ? path.resolve(this._cordova!.cordovaPath, "www")
      : (builderType === "electron" && !watch) ? path.resolve(this._rootPath, ".electron/src")
        : builderType === "web" ? this._parsedTsconfig.options.outDir
          : `${this._parsedTsconfig.options.outDir}/${builderType}`;

    const sassImplementation = new SassWorkerImplementation();

    const mainFilePath = path.resolve(this._rootPath, "src/main.ts");
    const polyfillsFilePath = path.resolve(this._rootPath, "src/polyfills.ts");
    const stylesFilePath = path.resolve(this._rootPath, "src/styles.scss");

    let prevProgressMessage = "";
    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: builderType === "electron" ? ["electron-renderer", "es2015"] : ["web", "es2015"],
      profile: false,
      resolve: {
        roots: [this._rootPath],
        extensions: [".ts", ".tsx", ".mjs", ".cjs", ".js"],
        symlinks: true,
        modules: [this._workspaceRootPath, "node_modules"],
        mainFields: ["es2015", "browser", "module", "main"],
        conditionNames: ["es2015", "..."],
      },
      resolveLoader: {
        symlinks: true
      },
      context: this._workspaceRootPath,
      entry: {
        main: [
          ...watch ? [
            `webpack-hot-middleware/client?path=${publicPath}__webpack_hmr&timeout=20000&reload=true&overlay=true`
          ] : [],
          mainFilePath
        ],
        ...FsUtil.exists(polyfillsFilePath) ? { polyfills: polyfillsFilePath } : {},
        ...FsUtil.exists(stylesFilePath) ? { styles: stylesFilePath } : {}
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
      watchOptions: { poll: undefined, ignored: undefined },
      performance: { hints: false },
      ignoreWarnings: [
        /Failed to parse source map from/,
        /Add postcss as project dependency/,
        /"@charset" must be the first rule in the file/
      ],
      experiments: { backCompat: false, syncWebAssembly: true, asyncWebAssembly: true },
      infrastructureLogging: { level: "error" },
      stats: "errors-warnings",
      cache: {
        type: "filesystem",
        profile: watch ? undefined : false,
        cacheDirectory: path.resolve(cacheBasePath, "angular-webpack"),
        maxMemoryGenerations: 1,
        name: createHash("sha1")
          .update(workspacePkgLockContent)
          // .update(pkgVersion)
          // .update(ngVersion)
          .update(JSON.stringify(this._parsedTsconfig.options))
          // .update(this._workspaceRootPath)
          // .update(this._rootPath)
          .update(JSON.stringify(this._config))
          .update(watch.toString())
          .digest("hex")
      },
      // cache: { type: "memory", maxGenerations: 1 },
      ...watch ? {
        snapshot: {
          immutablePaths: internalModuleCachePaths,
          managedPaths: internalModuleCachePaths
        }
      } : {},
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
            ], { path: this._workspaceRootPath })
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
          ...watch ? [
            {
              loader: HmrLoader,
              include: [mainFilePath]
            }
          ] : [],
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
            test: /\.[cm]?[tj]sx?$/,
            resolve: { fullySpecified: false },
            exclude: [/[/\\](?:core-js|@babel|tslib|web-animations-js|web-streams-polyfill)[/\\]/],
            use: [
              {
                loader: "@angular-devkit/build-angular/src/babel/webpack-loader",
                options: {
                  cacheDirectory: path.resolve(cacheBasePath, "babel-webpack"),
                  scriptTarget: ts.ScriptTarget.ES2017,
                  aot: true,
                  optimize: !watch,
                  instrumentCode: undefined
                }
              }
            ]
          },
          {
            test: /\.[cm]?tsx?$/,
            loader: "@ngtools/webpack",
            exclude: [/[/\\](?:css-loader|mini-css-extract-plugin|webpack-dev-server|webpack)[/\\]/]
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
        // new AnyComponentStyleBudgetChecker(watch ? [] : [
        //   { type: Type.AnyComponentStyle, maximumWarning: "2kb", maximumError: "4kb" }
        // ]),
        {
          apply: (compiler: webpack.Compiler) => {
            compiler.hooks.shutdown.tap("sass-worker", () => {
              sassImplementation.close();
            });
          }
        },
        new MiniCssExtractPlugin({ filename: "[name].css" }),
        new SuppressExtractedTextChunksWebpackPlugin(),
        // NgBuildAnalyticsPlugin,
        new IndexHtmlWebpackPlugin({
          indexPath: path.resolve(this._rootPath, "src/index.html"),
          outputPath: "index.html",
          baseHref: publicPath,
          entrypoints: [
            ["runtime", true],
            ["polyfills", true],
            ["styles", false],
            ["vendor", true],
            ["main", true]
          ],
          deployUrl: undefined,
          sri: false,
          cache: {
            enabled: true,
            basePath: cacheBasePath,
            path: path.resolve(cacheBasePath, "index-webpack")
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
        ...watch ? [
          new webpack.HotModuleReplacementPlugin()
        ] : [],
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
        })
      ] as any[]
    };
  }

  private _getNpmConfig(pkgPath: string): INpmConfig | undefined {
    if (!this._npmConfigMap.has(pkgPath)) {
      this._npmConfigMap.set(pkgPath, FsUtil.readJson(path.resolve(pkgPath, "package.json")));
    }
    return this._npmConfigMap.get(pkgPath);
  }
}
