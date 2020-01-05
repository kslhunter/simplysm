import {Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as webpack from "webpack";
import * as nodeExternals from "webpack-node-externals";
import * as os from "os";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";

export class SdTypescriptCompiler {
  private constructor(private readonly _mode: "development" | "production",
                      private readonly _tsConfigPath: string,
                      private readonly _isNode: boolean,
                      private readonly _isMulti: boolean,
                      private readonly _distPath: string,
                      private readonly _indexFilePath: string,
                      private readonly _hasIndexFile: boolean,
                      private readonly _binFilePath: string,
                      private readonly _hasBinFile: boolean,
                      private readonly _watch: boolean,
                      private readonly _logger: Logger) {
  }

  public static async createAsync(argv: {
    tsConfigPath: string;
    mode: "development" | "production";
    watch: boolean;
  }): Promise<SdTypescriptCompiler> {
    const tsConfigPath = argv.tsConfigPath;
    const packagePath = path.dirname(argv.tsConfigPath);
    const mode = argv.mode;
    const isMulti = (await fs.readdir(packagePath)).filter((item) => /^tsconfig.*json$/.test(item)).length > 1;
    const watch = argv.watch;

    const parsedTsConfig = ts.parseJsonConfigFileContent(await fs.readJson(tsConfigPath), ts.sys, path.dirname(tsConfigPath));
    const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;

    const indexFilePath = path.resolve(packagePath, "src", "index.ts");
    const hasIndex = await fs.pathExists(indexFilePath);

    const binFilePath = path.resolve(packagePath, "src", "bin.ts");
    const hasBin = await fs.pathExists(binFilePath);

    const distPath = parsedTsConfig.options.outDir
      ? path.resolve(parsedTsConfig.options.outDir)
      : path.resolve(packagePath, "dist");

    const logger = Logger.get(
      [
        "simplysm",
        "sd-cli",
        path.basename(packagePath),
        isNode ? "node" : "browser"
      ]
    );

    return new SdTypescriptCompiler(
      mode,
      tsConfigPath,
      isNode,
      isMulti,
      distPath,
      indexFilePath,
      hasIndex,
      binFilePath,
      hasBin,
      watch,
      logger
    );
  }

  public async runAsync(): Promise<void> {
    if (this._watch) {
      this._logger.log("컴파일 및 변경감지를 시작합니다.");
    }
    else {
      this._logger.log("컴파일를 시작합니다.");
    }

    const webpackConfig = await this._getWebpackConfigAsync(this._watch);

    const compiler = webpack(webpackConfig);

    if (this._watch) {
      compiler.hooks.invalid.tap("SdPackageBuilder", () => {
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

      if (this._watch) {
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
      entry: {
        ...this._hasIndexFile ? {
          [this._isMulti && !this._isNode ? "index.browser" : "index"]: this._indexFilePath
        } : {},
        ...this._hasBinFile ? {
          bin: this._binFilePath
        } : {}
      },
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
            banner: "require(\"source-map-support/register\");",
            raw: true,
            entryOnly: true,
            include: ["bin.js"]
          }),
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
