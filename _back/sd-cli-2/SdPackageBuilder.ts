import {Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as webpack from "webpack";
import {SdWebpackTimeFixPlugin} from "@simplysm/sd-cli/dist/src/plugins/SdWebpackTimeFixPlugin";
import * as nodeExternals from "webpack-node-externals";
import * as os from "os";
// import * as ForkTsCheckerWebpackPlugin from "@simplysm/fork-ts-checker-webpack-plugin";
// import {NormalizedMessage} from "@simplysm/fork-ts-checker-webpack-plugin/lib/NormalizedMessage";

export class SdPackageBuilder {
  private constructor(private readonly _packagePath: string,
                      private readonly _mode: "development" | "production",
                      private readonly _tsConfigPath: string,
                      private readonly _isNode: boolean,
                      private readonly _isMulti: boolean,
                      private readonly _distPath: string,
                      private readonly _indexFilePath: string,
                      private readonly _hasIndexFile: boolean,
                      private readonly _binFilePath: string,
                      private readonly _hasBinFile: boolean,
                      private readonly _watch: boolean) {
  }

  public static async createAsync(argv: {
    tsConfigPath: string;
    mode: "development" | "production";
    watch: boolean;
  }): Promise<SdPackageBuilder> {
    const tsConfigPath = argv.tsConfigPath;
    const packagePath = path.dirname(argv.tsConfigPath);
    const mode = argv.mode;
    const isMulti = (await fs.readdir(packagePath)).filter((item) => /^tsconfig.*json$/.test(item)).length > 1;
    const watch = argv.watch;

    const tsConfig = await fs.readJson(tsConfigPath);
    const tsConfigOptions = tsConfig.compilerOptions;
    if (tsConfigOptions.baseUrl && tsConfigOptions.paths) {
      for (const tsPathKey of Object.keys(tsConfigOptions.paths)) {
        const result = [];
        for (const tsPathValue of tsConfigOptions.paths[tsPathKey] as string[]) {
          result.push(tsPathValue.replace(/\/src\/index\..*ts$/, ""));
        }
        tsConfigOptions.paths[tsPathKey] = result;
      }
    }

    if (
      isMulti &&
      (
        tsConfig.extends.startsWith("tsconfig") ||
        tsConfig.extends.startsWith("./tsconfig")
      )
    ) {
      const extendsExtName = path.extname(tsConfig.extends);
      const extendsBaseName = path.basename(tsConfig.extends, extendsExtName);
      tsConfig.extends = "./" + extendsBaseName + ".build" + extendsExtName;
    }

    const dirName = path.dirname(tsConfigPath);
    const extName = path.extname(tsConfigPath);
    const baseName = path.basename(tsConfigPath, extName);

    const tsConfigPathForBuildPath = path.resolve(dirName, baseName + ".build" + extName);
    await fs.writeJson(tsConfigPathForBuildPath, tsConfig, {spaces: 2, EOL: os.EOL});

    const parsedTsConfig = ts.parseJsonConfigFileContent(await fs.readJson(tsConfigPathForBuildPath), ts.sys, path.dirname(tsConfigPathForBuildPath));
    const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;

    const indexFilePath = path.resolve(packagePath, "src", "index.ts");
    const hasIndex = await fs.pathExists(indexFilePath);

    const binFilePath = path.resolve(packagePath, "src", "bin.ts");
    const hasBin = await fs.pathExists(binFilePath);

    const distPath = parsedTsConfig.options.outDir
      ? path.resolve(parsedTsConfig.options.outDir)
      : path.resolve(packagePath, "dist");

    return new SdPackageBuilder(
      packagePath,
      mode,
      tsConfigPathForBuildPath,
      isNode,
      isMulti,
      distPath,
      indexFilePath,
      hasIndex,
      binFilePath,
      hasBin,
      watch
    );
  }

  public async runAsync(): Promise<void> {
    const logger = Logger.get(
      [
        "simplysm",
        "sd-cli",
        "SdPackageBuilder",
        this._watch ? "watch" : "build",
        this._packagePath.split(/[\\\/]/).last()!,
        this._isMulti ? (this._isNode ? "node" : "browser") : undefined
      ].filterExists()
    );
    if (this._watch) {
      logger.log("빌드 및 변경감지를 시작합니다.");
    }
    else {
      logger.log("빌드를 시작합니다.");
    }

    const webpackConfig = await this._getWebpackConfigAsync(this._watch);

    const compiler = webpack(webpackConfig);

    if (this._watch) {
      compiler.hooks.invalid.tap("SdPackageBuilder", () => {
        logger.log("변경사항이 감지되었습니다.");
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
          logger.warn(
            "발생한 경고가 있습니다.\n",
            info.warnings
              .map((item) => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
              .join(os.EOL)
          );
        }

        if (stats.hasErrors()) {
          logger.error(
            "발생한 에러가 있습니다.\n",
            info.errors
              .map((item) => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
              .join(os.EOL)
          );
        }

        logger.log("빌드가 완료되었습니다.");
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
        ...watch ? [new SdWebpackTimeFixPlugin()] : []/*,
        new ForkTsCheckerWebpackPlugin({
          tsconfig: this._tsConfigPath,
          ...(this._isNode && this._isMulti) ? {} : {
            tslint: path.resolve(this._packagePath, "tslint.json")
          },
          async: false,
          silent: true,
          formatter: (message: NormalizedMessage, useColors: boolean) => {
            const json = message.toJSON();
            return `${json.file}(${json.line}, ${json.character}): ${json.content}`;
          },
          measureCompilationTime: false
        })*/
      ]
    };
  }

}
