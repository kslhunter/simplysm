import * as webpack from "webpack";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import {Logger, ProcessManager} from "@simplysm/sd-core-node";
import * as nodeExternals from "webpack-node-externals";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import {ISdPackageConfig} from "./common";
import {NotImplementError} from "@simplysm/sd-core-common";

export class SdPackageBuilder {
  private readonly _packagePath: string;

  public constructor(private readonly _packageKey: string,
                     private readonly _config: ISdPackageConfig) {
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

  public async watchAsync(): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "watch", this._packageKey]);
    logger.log("빌드 및 변경감지를 시작합니다.");

    const packageTsConfigPath = path.resolve(this._packagePath, "tsconfig.build.json");
    const packageTsConfigForNodePath = path.resolve(this._packagePath, "tsconfig-node.build.json");

    const webpackConfigs = [await this._getWebpackConfigAsync(packageTsConfigPath)];
    if (await fs.pathExists(packageTsConfigForNodePath)) {
      webpackConfigs.push(await this._getWebpackConfigAsync(packageTsConfigForNodePath));
    }

    const compiler = webpack(webpackConfigs);

    compiler.hooks.invalid.tap("SdAngularCompiler", () => {
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

  public async publishAsync(): Promise<void> {
    const packageLogger = Logger.get(["simplysm", "sd-cli", "publish", this._packageKey]);
    const publishConfig = this._config.publish!;

    if (publishConfig === "npm") {
      await ProcessManager.spawnAsync(
        "yarn publish --access public",
        {cwd: this._packagePath},
        (message) => {
          packageLogger.log(message);
        },
        (errorMessage) => {
          packageLogger.error(errorMessage);
        }
      );
    }
    else {
      throw new NotImplementError();
    }
  }

  private async _getWebpackConfigAsync(tsConfigPath: string, watch?: true): Promise<webpack.Configuration> {
    // dist 경로 확인
    const packageTsConfig = await fs.readJson(tsConfigPath);
    const packageParsedTsConfig = ts.parseJsonConfigFileContent(packageTsConfig, ts.sys, this._packagePath);
    const distPath = packageParsedTsConfig.options.outDir ? path.resolve(packageParsedTsConfig.options.outDir) : path.resolve(this._packagePath, "dist");

    // entry 구성
    const entry: { [key: string]: string } = {};

    const indexFilePath = path.resolve(this._packagePath, "src", "index.ts");
    if (await fs.pathExists(indexFilePath)) {
      if (await fs.pathExists(path.resolve(this._packagePath, "tsconfig-node.build.json"))) {
        if (path.basename(tsConfigPath).includes("-node")) {
          entry.index = indexFilePath;
        }
        else {
          entry["index.browser"] = indexFilePath;
        }
      }
      else {
        entry.index = indexFilePath;
      }
    }

    const binFilePath = path.resolve(this._packagePath, "src", "bin.ts");
    if (await fs.pathExists(binFilePath)) {
      entry.bin = binFilePath;
    }

    const appFilePath = path.resolve(this._packagePath, "src", "app.ts");
    if (await fs.pathExists(appFilePath)) {
      entry.app = appFilePath;
    }

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


    return {
      mode: watch ? "development" : "production",
      devtool: watch ? "cheap-module-source-map" : false,
      target,
      resolve: {
        extensions: [".ts", ".js"]
      },
      entry,
      output: {
        path: distPath
      },
      externals: [
        nodeExternals()
      ],
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: [
              "shebang-loader",
              {
                loader: "ts-loader",
                options: {
                  configFile: tsConfigPath
                }
              }
            ]
          }
        ]
      },
      plugins: [
        new webpack.BannerPlugin({
          banner: "#!/usr/bin/env node",
          raw: true,
          entryOnly: true,
          include: ["bin.js"]
        }),
        new SdWebpackTimeFixPlugin()
      ]
    };
  }
}