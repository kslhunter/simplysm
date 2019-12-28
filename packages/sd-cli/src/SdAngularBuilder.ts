import * as webpack from "webpack";
import * as path from "path";
import {Logger} from "@simplysm/sd-core-node";
import {NotImplementError} from "@simplysm/sd-core-common";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import {AngularCompilerPlugin, PLATFORM} from "@ngtools/webpack";

export class SdAngularBuilder {
  private readonly _packagePath: string;

  public constructor(private readonly _packageKey: string) {
    this._packagePath = path.resolve(process.cwd(), "packages", this._packageKey);
  }

  public async buildAsync(): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "build", this._packageKey]);
    logger.log("빌드를 시작합니다.");

    const packageTsConfigPath = path.resolve(this._packagePath, "tsconfig.build.json");

    const webpackConfig = await this._getWebpackConfigAsync(packageTsConfigPath);
    const compiler = webpack(webpackConfig);

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

  public async watchAsync(): Promise<void> {
    throw new NotImplementError();
  }

  public async publishAsync(): Promise<void> {
    throw new NotImplementError();
  }

  private async _getWebpackConfigAsync(tsConfigPath: string, watch?: true): Promise<webpack.Configuration> {
    // dist 경로 확인
    const packageTsConfig = await fs.readJson(tsConfigPath);
    const packageParsedTsConfig = ts.parseJsonConfigFileContent(packageTsConfig, ts.sys, this._packagePath);
    const distPath = packageParsedTsConfig.options.outDir ? path.resolve(packageParsedTsConfig.options.outDir) : path.resolve(this._packagePath, "dist");

    return {
      mode: watch ? "development" : "production",
      devtool: watch ? "cheap-module-source-map" : false,
      target: "web",
      resolve: {
        extensions: [".ts", ".js"],
        alias: {
          "SD_APP_MODULE_FACTORY": path.resolve(this._packagePath, "src/AppModule.ngfactory")
        },
        aliasFields: ["browser"]
      },
      entry: {
        main: path.resolve(__dirname, "../lib/main.prod.js")
      },
      output: {
        publicPath: `/${this._packageKey}/`,
        path: distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      optimization: {
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
          mainPath: path.resolve(__dirname, "../lib/main.prod.js"),
          entryModule: path.resolve(this._packagePath, "src/AppModule") + "#AppModule",
          platform: PLATFORM.Browser,
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
        new webpack.ContextReplacementPlugin(
          /(.+)?angular(\\|\/)core(.+)?/,
          path.join(this._packagePath, "src"),
          {}
        )
      ]
    };
  }
}
