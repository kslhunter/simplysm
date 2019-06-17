import * as events from "events";
import * as webpack from "webpack";
import * as ts from "typescript";
import * as fs from "fs-extra";
import * as path from "path";
import * as webpackNodeExternals from "webpack-node-externals";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import {NextHandleFunction} from "@simplysm/sd-service";
import {SdWebpackWriteFilePlugin} from "./plugins/SdWebpackWriteFilePlugin";
import {SdCliUtil} from "./commons/SdCliUtil";
import {ISdPackageConfig} from "./commons/interfaces";
import * as TerserPlugin from "terser-webpack-plugin";
import {Generator} from "@angular/service-worker/config";
import {ArgumentError, JsonConvert} from "@simplysm/sd-core";
import {NodeFilesystem} from "./service-worker/filesystem";
import {AngularCompilerPlugin} from "@ngtools/webpack";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";
import {GenerateSW} from "workbox-webpack-plugin";

const VueLoaderPlugin = require('vue-loader/lib/plugin'); // tslint:disable-line

export class SdPackageCompiler extends events.EventEmitter {
  private readonly _contextPath: string;
  private readonly _tsConfigPath: string;

  private _projectNpmConfig_: any;

  private get _projectNpmConfig(): any {
    if (!this._projectNpmConfig_) {
      this._projectNpmConfig_ = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    }
    return this._projectNpmConfig_;
  }

  private _npmConfig_: any;

  private get _npmConfig(): any {
    if (!this._npmConfig_) {
      this._npmConfig_ = fs.readJsonSync(path.resolve(this._contextPath, "package.json"));
    }
    return this._npmConfig_;
  }

  private _tsConfig_: any;

  private get _tsConfig(): any {
    if (!this._tsConfig_) {
      this._tsConfig_ = fs.readJsonSync(this._tsConfigPath);
    }
    return this._tsConfig_;
  }

  private _parsedTsConfig_?: ts.ParsedCommandLine;

  private get _parsedTsConfig(): ts.ParsedCommandLine {
    if (!this._parsedTsConfig_) {
      this._parsedTsConfig_ = ts.parseJsonConfigFileContent(this._tsConfig, ts.sys, this._contextPath);
    }
    return this._parsedTsConfig_;
  }

  private _distPath_?: string;

  private get _distPath(): string {
    if (!this._distPath_) {
      this._distPath_ = this._parsedTsConfig.options.outDir ? path.resolve(this._parsedTsConfig.options.outDir) : path.resolve(this._contextPath, "dist");
    }
    return this._distPath_;
  }

  private _alias_?: { [key: string]: string };

  private get _alias(): { [key: string]: string } {
    if (!this._alias_) {
      const tsOptions = this._parsedTsConfig.options;
      const alias = {};
      if (tsOptions && tsOptions.paths) {
        for (const tsPathKey of Object.keys(tsOptions.paths)) {
          if (tsOptions.paths[tsPathKey].length !== 1) {
            throw new Error("'tsconfig'의 'paths'옵션에서, 하나의 명칭에 반드시 하나의 목적지를 지정해야 합니다.");
          }
          alias[tsPathKey] = path.resolve(this._contextPath, tsOptions.paths[tsPathKey][0]);
        }
      }
      this._alias_ = alias;
    }
    return this._alias_;
  }

  public constructor(private readonly _packageKey: string,
                     private readonly _options?: string[]) {
    super();

    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._tsConfigPath = path.resolve(this._contextPath, "tsconfig.build.json");
  }

  private _mergeStyleConfigs(webpackConfig: webpack.Configuration, opt: { sourceMap: boolean; extract: boolean; vue: boolean }): void {
    webpackConfig.module = webpackConfig.module || {rules: []};

    const styleLoader = opt.extract ? MiniCssExtractPlugin.loader
      : opt.vue ? {
          loader: "vue-style-loader",
          options: {sourceMap: opt.sourceMap}
        }
        : {
          loader: "style-loader",
          options: {sourceMap: opt.sourceMap}
        };

    webpackConfig.module.rules = webpackConfig.module.rules.concat(
      [
        {
          test: /\.scss$/,
          use: [
            styleLoader,
            {
              loader: "css-loader",
              options: {sourceMap: opt.sourceMap}
            },
            {
              loader: "resolve-url-loader",
              options: {sourceMap: opt.sourceMap}
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: true,
                sourceMapContents: false
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: [
            styleLoader,
            {
              loader: "css-loader",
              options: {sourceMap: opt.sourceMap}
            }
          ]
        }
      ]
    );

    if (opt.extract) {
      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins = webpackConfig.plugins.concat([new MiniCssExtractPlugin()]);
    }
  }

  private _mergeSourceCompileConfigs(webpackConfig: webpack.Configuration, opt: { type: "node" | "vue" | "angular" | "angular-aot" }): void {
    webpackConfig.module = webpackConfig.module || {rules: []};

    if (opt.type === "node" || opt.type === "angular") {
      webpackConfig.module.rules.push(
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            configFile: this._tsConfigPath
          }
        }
      );
    }
    else if (opt.type === "vue") {
      webpackConfig.module.rules.pushRange([
        {
          test: /\.vue$/,
          loader: "vue-loader"
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            configFile: this._tsConfigPath,
            appendTsSuffixTo: [/\.vue$/]
          }
        }
      ]);

      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(new VueLoaderPlugin());
    }
    else if (opt.type === "angular-aot") {
      webpackConfig.module!.rules.push(
        {
          test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
          loader: [
            "@angular-devkit/build-optimizer/webpack-loader",
            "@ngtools/webpack"
          ]
        }
      );
    }

    if (opt.type.startsWith("angular")) {
      webpackConfig.module.rules.push(
        {
          test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
          parser: {system: true}
        }
      );

      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          path.resolve(this._contextPath, "src"),
          {}
        )
      );
    }
  }

  private _mergeIndexHtmlConfigs(webpackConfig: webpack.Configuration, opt: { framework: "angular" | "vue" }): void {
    webpackConfig.plugins = webpackConfig.plugins || [];
    webpackConfig.plugins.push(
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, `../lib/index${opt.framework === "vue" ? ".vue" : ""}.ejs`),
        chunksSortMode: "none",
        BASE_HREF: `/${this._packageKey}/`,
        inject: true
      })
    );
  }

  private _mergeExternalConfigs(webpackConfig: webpack.Configuration, opt: { target: "node" | "web"; nodeModules: boolean }): void {
    webpackConfig.externals = (webpackConfig.externals || []) as webpack.ExternalsElement[];

    webpackConfig.externals.push(
      (context, request, callback) => {
        if (["fsevents"].includes(request)) {
          callback(undefined, `{}`);
          return;
        }

        callback(undefined, undefined);
      }
    );

    if (opt.nodeModules) {
      webpackConfig.externals.pushRange([
        (context, request, callback) => {
          if (this._alias[request]) {
            callback(undefined, `commonjs ${request}`);
            return;
          }

          callback(undefined, undefined);
        },
        webpackNodeExternals()
      ]);
    }

    if (opt.target === "web") {
      webpackConfig.externals.push(
        (context, request, callback) => {
          if (["tedious", "chokidar", "nodemailer", "fs-extra", "fs", "child_process", "net", "tls"].includes(request)) {
            callback(undefined, `{}`);
            return;
          }

          if (request === "ws") {
            callback(undefined, `WebSocket`);
            return;
          }

          callback(undefined, undefined);
        }
      );
    }
  }

  private _mergeAssetsFileConfigs(webpackConfig: webpack.Configuration, opt: { hash: boolean }): void {
    webpackConfig.module = webpackConfig.module || {rules: []};
    webpackConfig.module.rules.pushRange([
      {
        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?)$/,
        loader: "file-loader",
        options: {
          name: `assets/[name].[ext]${opt.hash ? "?[hash]" : ""}`
        }
      }
    ]);
  }

  private _mergeEntryConfigs(webpackConfig: webpack.Configuration, opt: { type: "node" | "vue" | "angular"; prod: boolean }): void {
    webpackConfig.entry = webpackConfig.entry || {};
    if (opt.type === "node") {
      if (!this._tsConfig.files || this._tsConfig.files.length < 1) {
        for (const jsFilePath of [this._npmConfig.main, ...Object.values(this._npmConfig.bin || {})]) {
          const tsFilePath = jsFilePath.replace(/dist\//g, "src/").replace(/\.js$/, ".ts");
          const basename = path.basename(tsFilePath, path.extname(tsFilePath));
          webpackConfig.entry[basename] = path.resolve(this._contextPath, tsFilePath);
        }
      }
      else {
        for (const tsFilePath of this._parsedTsConfig.fileNames) {
          const basename = path.basename(tsFilePath, path.extname(tsFilePath));
          webpackConfig.entry[basename] = tsFilePath;
        }
      }
    }
    else {
      webpackConfig.entry = {
        main: path.resolve(__dirname, `../lib/main.${opt.type === "vue" ? ".vue" : ""}${opt.prod ? ".prod" : ""}.js`)
      };
    }
  }

  private _mergeHotMiddlewareConfigs(webpackConfig: webpack.Configuration): void {
    if (!webpackConfig.entry || typeof webpackConfig.entry !== "object" || !webpackConfig.entry["main"] || (typeof webpackConfig.entry["main"] !== "string" && !(webpackConfig.entry["main"] instanceof Array))) {
      throw new Error("'webpackConfig.entry.main'이 잘못되었습니다.");
    }

    const hotMiddlewareEntry = `webpack-hot-middleware/client?path=/${this._packageKey}/__webpack_hmr&timeout=20000&reload=true`;
    if (webpackConfig.entry["main"] instanceof Array) {
      webpackConfig.entry["main"].insert(0, hotMiddlewareEntry);
    }
    else {
      webpackConfig.entry["main"] = [
        hotMiddlewareEntry,
        webpackConfig.entry["main"]
      ];
    }

    webpackConfig.plugins = webpackConfig.plugins || [];
    webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());


  }

  private _getWebpackCommonConfig(config: ISdPackageConfig): webpack.Configuration {
    const webpackConfig: webpack.Configuration = {
      output: {
        path: this._distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      optimization: {},
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: this._alias
      },
      module: {
        rules: []
      },
      plugins: [],
      externals: []
    };

    // 빌드 타입별, 기본 설정 수정
    if (config.type === "library" || config.type === "server") {
      if (!config.framework) {
        webpackConfig.target = "node";
      }

      webpackConfig.node = {__dirname: false};
      webpackConfig.output!.libraryTarget = "umd";
      webpackConfig.optimization!.nodeEnv = false;

      if (this._npmConfig["bin"]) {
        webpackConfig.plugins!.push(new webpack.BannerPlugin({
          banner: "#!/usr/bin/env node",
          raw: true,
          entryOnly: true,
          include: Object.keys(this._npmConfig["bin"])
            .map(key => path.relative(this._distPath, path.resolve(this._contextPath, this._npmConfig["bin"][key])))
        }));
      }
    }
    else {
      if (!config.framework) {
        throw new ArgumentError({framework: config.framework});
      }

      webpackConfig.output!.publicPath = `/${this._packageKey}/`;

      this._mergeIndexHtmlConfigs(webpackConfig, {framework: config.framework});
    }

    // env 설정
    if (config.type !== "library") {
      webpackConfig.plugins!.push(
        new webpack.DefinePlugin({
          "process.env.VERSION": `"${this._projectNpmConfig.version}"`,
          "process.env.BASE_HREF": `"/${this._packageKey}/"`
        })
      );
    }

    // 빌드 타입별, external 설정
    if (config.type === "library") {
      this._mergeExternalConfigs(webpackConfig, {target: "node", nodeModules: true});
    }
    else if (config.type === "server") {
      this._mergeExternalConfigs(webpackConfig, {target: "node", nodeModules: false});
    }
    else {
      this._mergeExternalConfigs(webpackConfig, {target: "web", nodeModules: false});
    }

    // 서버 SSL 파일로더
    if (config.type === "server") {
      webpackConfig.module!.rules.push(
        {
          test: /\.(pfx|crt|pem)$/,
          loader: "file-loader",
          options: {
            name: "ssl/[name].[ext]"
          }
        }
      );
    }

    return webpackConfig;
  }

  public async runAsync(): Promise<void> {
    const projectConfig = await SdCliUtil.getConfigObjAsync("production", this._options);
    const config = projectConfig.packages[this._packageKey];

    const webpackConfig = this._getWebpackCommonConfig(config);
    webpackConfig.mode = "production";
    this._mergeAssetsFileConfigs(webpackConfig, {hash: false});

    webpackConfig.optimization!.noEmitOnErrors = true;

    if (config.type === "library" || config.type === "server") {
      this._mergeEntryConfigs(webpackConfig, {type: "node", prod: true});
    }
    else {
      if (!config.framework) {
        throw new ArgumentError({framework: config.framework});
      }

      if (config.framework === "vue") {
        this._mergeEntryConfigs(webpackConfig, {type: "vue", prod: true});
      }
      else if (config.framework === "angular") {
        this._mergeEntryConfigs(webpackConfig, {type: "angular", prod: true});
      }
    }

    // optimization: library
    if (config.type === "library") {
      webpackConfig.devtool = "source-map";
      webpackConfig.module!.rules.push(
        {
          enforce: "pre",
          test: /\.js$/,
          use: ["source-map-loader"],
          exclude: /node_modules[\\/](?!@simplysm|rxjs|@angular|zone\.js|@?vue)/
        }
      );
      webpackConfig.optimization!.minimizer = [
        new TerserPlugin({
          sourceMap: true,
          cache: true,
          parallel: true,
          terserOptions: {
            keep_fnames: true
          }
        })
      ];
    }
    // optimization: client/server
    else {
      webpackConfig.devtool = false;
      webpackConfig.optimization!.minimizer = [
        new TerserPlugin({
          sourceMap: false,
          cache: true,
          parallel: true,
          terserOptions: {
            keep_fnames: true
          }
        })
      ];
    }

    // optimization: client
    if (config.type !== "library" && config.type !== "server") {
      webpackConfig.optimization!.runtimeChunk = "single";
      webpackConfig.optimization!.splitChunks = {
        chunks: "all",
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: (module: any) => {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
              return `libs/${packageName.replace("@", "")}`;
            }
          }
        }
      };
      webpackConfig.optimization!.minimizer.push(
        new webpack.HashedModuleIdsPlugin(),
        new OptimizeCSSAssetsPlugin()
      );

      webpackConfig.performance = {
        hints: false
      };
    }

    // rules
    if (config.type !== "library" && config.type !== "server") {
      if (config.framework === "vue") {
        if (this._npmConfig.sideEffects === false) {
          throw new Error("'vue' 클라이언트를 빌드할때는, 'package.json'의 'sideEffects'옵션이 'false'일 수 없습니다.");
        }

        this._mergeSourceCompileConfigs(webpackConfig, {type: "vue"});
        this._mergeStyleConfigs(webpackConfig, {sourceMap: false, extract: false, vue: true});
      }
      else if (config.framework === "angular") {
        this._mergeSourceCompileConfigs(webpackConfig, {type: "angular-aot"});
        this._mergeStyleConfigs(webpackConfig, {sourceMap: false, extract: true, vue: false});
      }
      else {
        throw new Error("미구현");
      }

      if (config.framework === "vue") {
        webpackConfig.resolve!.alias!["SIMPLYSM_CLIENT_MAIN"] = path.resolve(this._contextPath, "src", "main.ts");
        webpackConfig.plugins!.push(new GenerateSW());
      }
      else if (config.framework === "angular") {
        if (this._parsedTsConfig.fileNames.length < 1) {
          throw new Error("'tsconfig.json'의 'files' 설정이 잘못되었습니다. (첫번째 파일이 모듈로 설정되어있어야함.)");
        }

        const modulePath = this._parsedTsConfig.fileNames[0].replace(/\.ts$/, "");
        webpackConfig.resolve!.alias!["SIMPLYSM_CLIENT_APP_MODULE_NGFACTORY"] = modulePath + ".ngfactory";
        webpackConfig.plugins!.pushRange([
          new AngularCompilerPlugin({
            tsConfigPath: path.resolve(this._contextPath, "tsconfig.build.json"),
            entryModule: modulePath + "#" + path.basename(modulePath),
            mainPath: path.resolve(__dirname, "../lib/main.prod.js"),
            basePath: process.cwd(),
            sourceMap: false,
            forkTypeChecker: false,
            compilerOptions: {
              ...this._parsedTsConfig.options,
              rootDir: undefined,
              declaration: false,
              removeComments: true,
              disableTypeScriptVersionCheck: true,
              skipLibCheck: false,
              skipTemplateCodegen: false,
              strictMetadataEmit: true,
              fullTemplateTypeCheck: true,
              strictInjectionParameters: true,
              enableResourceInlining: true
            }
          })
        ]);
      }
      else {
        throw new Error("미구현");
      }
    }
    else {
      if (config.framework === "vue") {
        this._mergeSourceCompileConfigs(webpackConfig, {type: "vue"});
        this._mergeStyleConfigs(webpackConfig, {sourceMap: false, extract: false, vue: true});
      }
      else {
        this._mergeSourceCompileConfigs(webpackConfig, {type: "angular"});
      }
    }

    // '.configs.json'파일 생성
    webpackConfig.plugins!.push(
      new SdWebpackWriteFilePlugin([
        {
          path: path.resolve(this._distPath, ".configs.json"),
          content: async () => {
            const currProjectConfig = await SdCliUtil.getConfigObjAsync("production", this._options);
            const currConfig = currProjectConfig.packages[this._packageKey];
            return JSON.stringify({
              env: "production",
              ...currConfig.configs
            }, undefined, 2);
          }
        }
      ])
    );

    // 서버일때, 'pm2.json' 파일 생성
    if (config.type === "server") {
      webpackConfig.plugins!.push(
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(this._distPath, "pm2.json"),
            content: JSON.stringify({
              name: this._projectNpmConfig.name + "-" + this._packageKey,
              script: "app.js",
              watch: false,
              env: {
                "NODE_ENV": "production"
              }
            }, undefined, 2)
          }
        ])
      );
    }

    const compiler = webpack(webpackConfig);

    compiler.hooks.run.tap("SdPackageCompiler", () => {
      this.emit("run");
    });

    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

        if (stats.hasWarnings()) {
          for (const warning of info.warnings) {
            this.emit("warning", warning);
          }
        }

        if (stats.hasErrors()) {
          for (const error of info.errors) {
            this.emit("error", error);
          }
        }

        this.emit("done");
        resolve();
      });
    });

    // ngsw 구성
    if (config.type !== "library" && config.type !== "server" && config.framework === "angular") {
      const gen = new Generator(new NodeFilesystem(this._distPath), `/${this._packageKey}/`);

      const control = await gen.process({
        index: "/index.html",
        assetGroups: [
          {
            "name": "app",
            "installMode": "prefetch",
            "resources": {
              "files": [
                "/favicon.ico",
                "/index.html",
                "/libs/*.js",
                "/*.css",
                "/*.js"
              ]
            }
          },
          {
            "name": "assets",
            "installMode": "lazy",
            "updateMode": "prefetch",
            "resources": {
              "files": [
                "/assets/**"
              ]
            }
          }
        ]
      });

      await fs.writeFile(path.resolve(this._distPath, "ngsw.json"), JsonConvert.stringify(control, {space: 2}));

      await fs.copyFile(
        path.resolve(process.cwd(), "node_modules", "@angular", "service-worker", "ngsw-worker.js"),
        path.resolve(this._distPath, "ngsw-worker.js")
      );
    }
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    const projectConfig = await SdCliUtil.getConfigObjAsync("development", this._options);
    const config = projectConfig.packages[this._packageKey];

    const webpackConfig = this._getWebpackCommonConfig(config);
    webpackConfig.mode = "development";
    webpackConfig.devtool = "cheap-module-source-map";
    webpackConfig.module!.rules.push(
      {
        enforce: "pre",
        test: /\.js$/,
        use: ["source-map-loader"],
        exclude: [
          /node_modules[\\/](?!@simplysm|rxjs|@angular|zone\.js|@?vue)/,
          /\.ngfactory\.js$/,
          /\.ngstyle\.js$/
        ]
      }
    );
    this._mergeAssetsFileConfigs(webpackConfig, {hash: true});

    webpackConfig.output!.pathinfo = false;
    webpackConfig.plugins!.push(new SdWebpackTimeFixPlugin());
    webpackConfig.optimization!.removeAvailableModules = false;
    webpackConfig.optimization!.removeEmptyChunks = false;
    webpackConfig.optimization!.splitChunks = false;

    if (config.type === "library" || config.type === "server") {
      this._mergeEntryConfigs(webpackConfig, {type: "node", prod: false});

      if (config.framework === "vue") {
        this._mergeSourceCompileConfigs(webpackConfig, {type: "vue"});
        this._mergeStyleConfigs(webpackConfig, {sourceMap: true, extract: false, vue: true});
      }
      else {
        this._mergeSourceCompileConfigs(webpackConfig, {type: "node"});
      }
    }
    else {
      if (config.framework === "vue") {
        this._mergeEntryConfigs(webpackConfig, {type: "vue", prod: false});
      }
      else if (config.framework === "angular") {
        this._mergeEntryConfigs(webpackConfig, {type: "angular", prod: false});
      }
      else {
        throw new Error("미구현");
      }

      if (config.framework === "vue") {
        this._mergeSourceCompileConfigs(webpackConfig, {type: "vue"});
        this._mergeStyleConfigs(webpackConfig, {sourceMap: true, extract: false, vue: true});
      }
      else if (config.framework === "angular") {
        this._mergeSourceCompileConfigs(webpackConfig, {type: "node"});
        this._mergeStyleConfigs(webpackConfig, {sourceMap: true, extract: false, vue: false});
      }
      else {
        throw new Error("미구현");
      }

      if (config.framework === "vue") {
        webpackConfig.resolve!.alias!["SIMPLYSM_CLIENT_MAIN"] = path.resolve(this._contextPath, "src", "main.ts");
      }
      else if (config.framework === "angular") {
        if (this._parsedTsConfig.fileNames.length < 1) {
          throw new Error("'tsconfig.json'의 'files' 설정이 잘못되었습니다. (첫번째 파일이 모듈로 설정되어있어야함.)");
        }

        webpackConfig.resolve!.alias!["SIMPLYSM_CLIENT_APP_MODULE"] = this._parsedTsConfig.fileNames[0].replace(/\.ts$/, "");
      }
      else {
        throw new Error("미구현");
      }

      this._mergeHotMiddlewareConfigs(webpackConfig);
    }

    // '.configs.json'파일 생성
    webpackConfig.plugins!.push(
      new SdWebpackWriteFilePlugin([
        {
          path: path.resolve(this._distPath, ".configs.json"),
          content: JSON.stringify({
            env: "development",
            ...config.configs
          }, undefined, 2)
        }
      ])
    );

    const compiler = webpack(webpackConfig);

    compiler.hooks.watchRun.tap("SdPackageCompiler", () => {
      this.emit("run");
    });

    if (config.type !== "library" && config.type !== "server") {
      return await new Promise<NextHandleFunction[]>((resolve, reject) => {
        const devMiddleware = WebpackDevMiddleware(compiler, {
          publicPath: webpackConfig.output!.publicPath!,
          logLevel: "silent"
        });

        const hotMiddleware = WebpackHotMiddleware(compiler, {
          path: `/${this._packageKey}/__webpack_hmr`,
          log: false
        });

        compiler.hooks.failed.tap("SdPackageCompiler", err => {
          this.emit("error", err);
          reject(err);
        });

        compiler.hooks.done.tap("SdPackageCompiler", stats => {
          const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

          if (stats.hasWarnings()) {
            for (const warning of info.warnings) {
              this.emit("warning", warning);
            }
          }

          if (stats.hasErrors()) {
            for (const error of info.errors) {
              this.emit("error", error);
            }
          }

          this.emit("done");
          resolve([devMiddleware, hotMiddleware]);
        });
      });
    }
    else {
      await new Promise<void>((resolve, reject) => {
        compiler.watch({}, (err, stats) => {
          if (err) {
            reject(err);
            return;
          }

          const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

          if (stats.hasWarnings()) {
            for (const warning of info.warnings) {
              this.emit("warning", warning);
            }
          }

          if (stats.hasErrors()) {
            for (const error of info.errors) {
              this.emit("error", error);
            }
          }

          this.emit("done");
          resolve();
        });
      });

      return [];
    }
  }
}
