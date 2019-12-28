import * as webpack from "webpack";
import * as path from "path";
import {Logger} from "@simplysm/sd-core-node";
import {NotImplementError} from "@simplysm/sd-core-common";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import {AngularCompilerPlugin, PLATFORM} from "@ngtools/webpack";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import {NextHandleFunction} from "connect";

export class SdAngularBuilder {
  private readonly _packagePath: string;

  public constructor(private readonly _packageKey: string) {
    this._packagePath = path.resolve(process.cwd(), "packages", this._packageKey);
  }

  public async buildAsync(): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "build", this._packageKey]);
    logger.log("빌드를 시작합니다.");

    const packageTsConfigPath = path.resolve(this._packagePath, "tsconfig.build.json");
    const packageTsConfigForNodePath = path.resolve(this._packagePath, "tsconfig-node.build.json");

    const webpackConfigs = [await this._getWebpackConfigAsync(packageTsConfigPath)];
    if (await fs.pathExists(packageTsConfigForNodePath)) {
      webpackConfigs.push(await this._getWebpackConfigAsync(packageTsConfigForNodePath));
    }

    const compiler = webpack(webpackConfigs);

    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

        if (stats.hasWarnings()) {
          for (const warning of info.warnings) {
            logger.warn(warning);
          }
        }

        if (stats.hasErrors()) {
          for (const error of info.errors) {
            logger.error(error);
          }
        }

        resolve();
      });
    });

    logger.log("빌드가 완료되었습니다.");
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    const logger = Logger.get(["simplysm", "sd-cli", "watch", this._packageKey]);
    logger.log("빌드 및 변경감지를 시작합니다.");

    const packageTsConfigPath = path.resolve(this._packagePath, "tsconfig.build.json");
    const packageTsConfigForNodePath = path.resolve(this._packagePath, "tsconfig-node.build.json");

    const webpackConfigs = [await this._getWebpackConfigAsync(packageTsConfigPath)];
    if (await fs.pathExists(packageTsConfigForNodePath)) {
      webpackConfigs.push(await this._getWebpackConfigAsync(packageTsConfigForNodePath));
    }

    const compiler = webpack(webpackConfigs);

    compiler.hooks.invalid.tap("SdPackageBuilder", () => {
      logger.log("변경사항이 감지되었습니다.");
    });

    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      const devMiddleware = WebpackDevMiddleware(compiler, {
        publicPath: webpackConfigs[0].output!.publicPath!,
        logLevel: "silent"
      });

      const hotMiddleware = WebpackHotMiddleware(compiler, {
        path: `/${this._packageKey}/__webpack_hmr`,
        log: false
      });

      compiler.hooks.done.tap("SdAngularBuilder", async (multiStats) => {
        for (const stats of multiStats.stats) {
          const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

          if (stats.hasWarnings()) {
            for (const warning of info.warnings) {
              logger.warn(warning);
            }
          }

          if (stats.hasErrors()) {
            for (const error of info.errors) {
              logger.error(error);
            }
          }
        }


        logger.log("빌드가 완료되었습니다.");
        resolve([devMiddleware, hotMiddleware]);
      });
    });
  }

  public async publishAsync(): Promise<void> {
    throw new NotImplementError();
  }

  private async _getWebpackConfigAsync(tsConfigPath: string, watch?: true): Promise<webpack.Configuration> {
    // dist 경로 확인
    const packageTsConfig = await fs.readJson(tsConfigPath);
    const packageParsedTsConfig = ts.parseJsonConfigFileContent(packageTsConfig, ts.sys, this._packagePath);
    const distPath = packageParsedTsConfig.options.outDir ? path.resolve(packageParsedTsConfig.options.outDir) : path.resolve(this._packagePath, "dist");

    // target 확인
    let target: "web" | "node";
    if (await fs.pathExists(path.resolve(this._packagePath, "tsconfig-node.build.json"))) {
      if (path.basename(tsConfigPath).startsWith("tsconfig-node")) {
        target = "node";
      }
      else {
        target = "web";
      }
    }
    else {
      if (packageParsedTsConfig.options.target === ts.ScriptTarget.ES5) {
        target = "web";
      }
      else {
        target = "node";
      }
    }

    // main entry 경로 확인
    let mainEntryPath: string | string[];
    if (watch) {
      if (target === "web") {
        mainEntryPath = [
          `webpack-hot-middleware/client?path=/${this._packageKey}/__webpack_hmr&timeout=20000&reload=true`,
          path.resolve(__dirname, "../lib/main.dev.js")
        ];
      }
      else {
        mainEntryPath = path.resolve(__dirname, "../lib/main.server.dev.js");
      }
    }
    else {
      if (target === "web") {
        mainEntryPath = path.resolve(__dirname, "../lib/main.prod.js");
      }
      else {
        mainEntryPath = path.resolve(__dirname, "../lib/main.server.prod.js");
      }
    }

    // appModuleClass 경로 확인
    let appModulePath;
    if (target === "web") {
      appModulePath = path.resolve(this._packagePath, "src/AppModule");
    }
    else {
      appModulePath = path.resolve(this._packagePath, "src/AppServerModule");
    }

    return {
      mode: watch ? "development" : "production",
      devtool: watch ? "cheap-module-source-map" : false,
      target,
      node: false,
      resolve: {
        extensions: [".ts", ".js"],
        alias: {
          "SD_APP_MODULE_FACTORY": appModulePath + ".ngfactory"
        },
        aliasFields: [target === "web" ? "browser" : "main"]
      },
      entry: {
        main: mainEntryPath
      },
      output: {
        publicPath: `/${this._packageKey}/`,
        path: distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      optimization: watch ? {} : {
        noEmitOnErrors: true,
        minimizer: [
          new webpack.HashedModuleIdsPlugin()
        ]
      },
      module: {
        rules: [
          {
            test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
            loaders: [
              "@angular-devkit/build-optimizer/webpack-loader",
              "@ngtools/webpack"
            ]
          },
          {
            test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
            parser: {system: true}
          }
        ]
      },
      plugins: [
        new SdWebpackTimeFixPlugin(),
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, `../lib/index.ejs`),
          BASE_HREF: `/${this._packageKey}/`
        }),
        new AngularCompilerPlugin({
          mainPath: mainEntryPath instanceof Array ? mainEntryPath.last() : mainEntryPath,
          entryModule: appModulePath + "#" + appModulePath.split("/").last(),
          platform: PLATFORM.Server,
          sourceMap: false,
          nameLazyFiles: false,
          forkTypeChecker: true,
          directTemplateLoading: true,
          tsConfigPath,
          skipCodeGeneration: false,
          compilerOptions: {
            fullTemplateTypeCheck: true,
            strictInjectionParameters: true,
            rootDir: undefined,
            disableTypeScriptVersionCheck: true
          }
        }),
        new webpack.ContextReplacementPlugin(/@angular(\\|\/)core(\\|\/)/)
      ]
    };
  }
}
