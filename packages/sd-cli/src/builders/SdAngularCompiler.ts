import {Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as webpack from "webpack";
import * as os from "os";
import {SdWebpackTimeFixPlugin} from "../plugins/SdWebpackTimeFixPlugin";
import {EventEmitter} from "events";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import {AngularCompilerPlugin, PLATFORM} from "@ngtools/webpack";

export class SdAngularCompiler extends EventEmitter {
  private constructor(private readonly _mode: "development" | "production",
                      private readonly _tsConfigPath: string,
                      private readonly _distPath: string,
                      private readonly _logger: Logger,
                      private readonly _packagePath: string) {
    super();
  }

  public static async createAsync(argv: {
    tsConfigPath: string;
    mode: "development" | "production";
  }): Promise<SdAngularCompiler> {
    const tsConfigPath = argv.tsConfigPath;
    const mode = argv.mode;

    const packagePath = path.dirname(argv.tsConfigPath);

    const tsConfig = await fs.readJson(tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));

    if (!tsConfig.files) {
      throw new Error("'angular' 클라이언트는 'tsConfig.json'에 'files'가 정의되어 있지 않아야 합니다.");
    }

    const distPath = parsedTsConfig.options.outDir
      ? path.resolve(parsedTsConfig.options.outDir)
      : path.resolve(packagePath, "dist");

    const logger = Logger.get(
      [
        "simplysm",
        "sd-cli",
        path.basename(packagePath),
        "angular",
        "compile"
      ]
    );

    return new SdAngularCompiler(
      mode,
      tsConfigPath,
      distPath,
      logger,
      packagePath
    );
  }

  public async runAsync(watch: boolean): Promise<void> {
    if (watch) {
      this._logger.log("컴파일 및 변경감지를 시작합니다.");
    }
    else {
      this._logger.log("컴파일를 시작합니다.");
    }

    const webpackConfig = await this._getWebpackConfigAsync(watch);

    const compiler = webpack(webpackConfig);

    if (watch) {
      compiler.hooks.invalid.tap("SdServerCompiler", () => {
        this.emit("change");
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

        this.emit("complete");
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

  private async _getWebpackConfigAsync(watch: boolean): Promise<webpack.Configuration> {
    const packageKey = path.basename(this._packagePath);
    const mainPath = path.resolve(__dirname, "../lib/main." + (watch ? "dev" : "prod") + ".js");
    const indexPath = path.resolve(__dirname, `../lib/index.ejs`);

    const tsConfig = await fs.readJson(this._tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(this._tsConfigPath));

    const loaders: webpack.RuleSetUse = ["@ngtools/webpack"];

    if (!watch) {
      loaders.unshift({
        loader: "@angular-devkit/build-optimizer/webpack-loader",
        options: {
          sourceMap: parsedTsConfig.options.sourceMap
        }
      });
    }

    return {
      mode: this._mode,
      devtool: this._mode === "development" ? "cheap-module-source-map" : "source-map",
      target: "web",
      resolve: {
        extensions: [".ts", ".js"],
        alias: {
          // "SD_APP_MODULE": path.resolve(this._packagePath, "src/AppModule")
          "SD_APP_MODULE_FACTORY": path.resolve(this._packagePath, "src/AppModule.ngfactory")
        }
      },
      optimization: {
        minimize: false
      },
      entry: {
        main: watch
          ? [
            `webpack-hot-middleware/client?path=/${packageKey}/__webpack_hmr&timeout=20000&reload=true`,
            mainPath
          ]
          : mainPath
      },
      output: {
        path: this._distPath,
        filename: "[name].js"
      },
      module: {
        rules: [
          {
            test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
            loaders
          },
          {
            test: /(\\|\/)@angular(\\|\/)core(\\|\/).+\.js$/,
            parser: {system: true}
          }
        ]
      },
      plugins: [
        ...watch ? [
          new SdWebpackTimeFixPlugin(),
          new webpack.HotModuleReplacementPlugin()
        ] : [],
        new HtmlWebpackPlugin({
          template: indexPath,
          BASE_HREF: `/${packageKey}/`
        }),
        new AngularCompilerPlugin({
          mainPath,
          entryModule: path.resolve(this._packagePath, "src/AppModule") + "#AppModule",
          platform: PLATFORM.Browser,
          sourceMap: parsedTsConfig.options.sourceMap,
          nameLazyFiles: watch,
          forkTypeChecker: true,
          directTemplateLoading: true,
          tsConfigPath: this._tsConfigPath,
          skipCodeGeneration: watch,
          compilerOptions: {
            fullTemplateTypeCheck: true,
            strictInjectionParameters: true,
            disableTypeScriptVersionCheck: true
          }
        }),
        new webpack.ContextReplacementPlugin(
          /(.+)?angular(\\|\/)core(.+)?/,
          path.join(__dirname, "src"),
          {}
        )
      ]
    };
  }
}
