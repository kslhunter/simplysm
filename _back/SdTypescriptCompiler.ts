import {Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as webpack from "webpack";
import * as nodeExternals from "webpack-node-externals";
import * as os from "os";
import {SdWebpackTimeFixPlugin} from "../plugins/SdWebpackTimeFixPlugin";
import {TSdFramework} from "../commons";

export class SdTypescriptCompiler {
  private constructor(private readonly _mode: "development" | "production",
                      private readonly _tsConfigPath: string,
                      private readonly _isNode: boolean,
                      private readonly _distPath: string,
                      private readonly _entry: { [key: string]: string },
                      private readonly _hasBinFile: boolean,
                      private readonly _framework: TSdFramework | undefined,
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

    const tsConfig = await fs.readJson(tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));
    const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;

    const npmConfigPath = path.resolve(packagePath, "package.json");
    const npmConfig = await fs.readJson(npmConfigPath);
    const hasBin = npmConfig.bin;

    if (!tsConfig.files) {
      throw new Error("라이브러리 패키지의 'tsConfig.json'에는 'files'가 반드시 정의되어야 합니다.");
    }

    const entry = (tsConfig.files as string[]).toObject(
      (item) => npmConfig.browser && !isNode
        ? (path.basename(item, path.extname(item)) + ".browser")
        : path.basename(item, path.extname(item)),
      (item) => path.resolve(packagePath, item)
    );

    const distPath = parsedTsConfig.options.outDir
      ? path.resolve(parsedTsConfig.options.outDir)
      : path.resolve(packagePath, "dist");

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
      distPath,
      entry,
      hasBin,
      framework,
      logger
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
              ...this._framework?.startsWith("angular") ? [
                require.resolve("../loaders/inline-sass-loader"),
                {
                  loader: require.resolve("../loaders/ng-metadata-loader"),
                  options: {
                    configFile: this._tsConfigPath
                  }
                }
              ] : [],
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
