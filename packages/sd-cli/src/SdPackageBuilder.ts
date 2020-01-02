import {Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as webpack from "webpack";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import * as nodeExternals from "webpack-node-externals";
import * as os from "os";

export class SdPackageBuilder {
  private readonly _packagePath: string;
  private readonly _options: string[];
  private readonly _mode: "development" | "production";

  public constructor(argv: {
    package: string;
    options: string;
    mode: "development" | "production";
  }) {
    this._packagePath = argv.package;
    this._options = argv.options?.split(",").map((item) => item.trim()).filter((item) => !!item) ?? [];
    this._mode = argv.mode;
  }

  private async _generateTsCompilerOptionsAsync(node?: true): Promise<string | undefined> {
    const tsConfigPath = path.resolve(this._packagePath, node ? "tsconfig-node.json" : "tsconfig.json");
    if (node && !await fs.pathExists(tsConfigPath)) {
      return undefined;
    }

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
      tsConfig.extends === "tsconfig" ||
      tsConfig.extends === "tsconfig.json" ||
      tsConfig.extends === "./tsconfig" ||
      tsConfig.extends === "./tsconfig.json"
    ) {
      tsConfig.extends = "./tsconfig.build.json";
    }

    const tsConfigPathForBuild = path.resolve(this._packagePath, node ? "tsconfig-node.build.json" : "tsconfig.build.json");
    await fs.writeJson(tsConfigPathForBuild, tsConfig, {spaces: 2, EOL: os.EOL});

    return tsConfigPathForBuild;
  }

  public async watchAsync(): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "watch", "SdPackageBuilder", this._packagePath.split("/").last()!]);
    logger.log("빌드 및 변경감지를 시작합니다.");

    const webpackConfigs = await this._getWebpackConfigsAsync();

    const compiler = webpack(webpackConfigs);

    compiler.hooks.invalid.tap("SdPackageBuilder", () => {
      logger.log("변경사항이 감지되었습니다.");
    });

    await new Promise<void>((resolve, reject) => {
      compiler.watch({}, (err, stats) => {
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

        logger.log("빌드가 완료되었습니다.");
        resolve();
      });
    });
  }


  private async _getWebpackConfigsAsync(): Promise<webpack.Configuration[]> {
    const tsConfigPaths = [
      await this._generateTsCompilerOptionsAsync(),
      await this._generateTsCompilerOptionsAsync(true)
    ].filterExists();

    const isDev = this._mode === "development";
    const isMulti = tsConfigPaths.length > 1;

    const indexFilePath = path.resolve(this._packagePath, "src", "index.ts");
    const hasIndex = await fs.pathExists(indexFilePath);
    const binFilePath = path.resolve(this._packagePath, "src", "bin.ts");
    const hasBin = await fs.pathExists(binFilePath);


    return await Promise.all(tsConfigPaths.map(async (tsConfigPath) => {
      const parsedTsConfig = ts.parseJsonConfigFileContent(await fs.readJson(tsConfigPath), ts.sys, path.dirname(tsConfigPath));

      const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;

      const distPath = parsedTsConfig.options.outDir
        ? path.resolve(parsedTsConfig.options.outDir)
        : path.resolve(this._packagePath, "dist");

      const webpackConfig: webpack.Configuration = {
        mode: this._mode,
        devtool: isDev ? "cheap-module-source-map" : "source-map",
        target: isNode ? "node" : "web",
        node: {
          __dirname: false
        },
        resolve: {
          extensions: [".ts", ".js"]
        },
        entry: {
          ...hasIndex ? {
            [isMulti && !isNode ? "index.browser" : "index"]: indexFilePath
          } : {},
          ...hasBin ? {
            bin: binFilePath
          } : {}
        },
        output: {
          path: distPath,
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
                ...hasBin ? ["shebang-loader"] : [],
                {
                  loader: "ts-loader",
                  options: {
                    configFile: tsConfigPath,
                    transpileOnly: isMulti && isNode
                    //TODO: transpileOnly & fork-ts-checker-webpack-plugin + declaration
                  }
                }
              ]
            }
          ]
        },
        plugins: [
          ...hasBin ? [
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
          new SdWebpackTimeFixPlugin()
        ]
      };

      return webpackConfig;
    }));
  }

  public async buildAsync(): Promise<void> {
    // TODO
    console.log(
      this._packagePath,
      this._options,
      this._mode
    );
  }
}
