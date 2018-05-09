import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as webpack from "webpack";
import * as webpackMerge from "webpack-merge";

import {Exception} from "../../../sd-core/src/exceptions/Exception";
import {Logger} from "../../../sd-core/src/utils/Logger";
import {SdTypescriptDtsPlugin} from "../plugins/SdTypescriptDtsPlugin";

const HappyPack = require("happypack"); // tslint:disable-line:variable-name

export class SdLibraryPackageBuilder {
  private readonly _logger = new Logger("@simplism/sd-pack", `SdPackageBuilder :: ${this._packageName}`);

  public constructor(private readonly _packageName: string) {
  }

  public async buildAsync(): Promise<void> {
    this._logger.log("building...");

    fs.removeSync(this._packagePath("dist"));

    const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
      mode: "production",
      optimization: {
        noEmitOnErrors: true,
        minimize: false
      }
    });

    return new Promise<void>((resolve, reject) => {
      webpack(webpackConfig, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._writeStatsToConsole(stats);

        this._logger.info("build completed");
        resolve();
      });
    });
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("building...");

    fs.removeSync(this._packagePath("dist"));

    const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
      mode: "development"
    });
    return new Promise<void>((resolve, reject) => {
      const compiler = webpack(webpackConfig);

      compiler.watch({}, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._writeStatsToConsole(stats);

        this._logger.info("build completed");
        resolve();
      });

      compiler.hooks.watchRun.tap(this._packageName, () => {
        this._logger.log("building...");
      });
    });
  }

  public async publishAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._logger.log("publishing...");

      // 최상위 package.json 설정 가져오기
      const rootPackageJson = fs.readJsonSync(this._rootPath("package.json"));

      // package.json 설정 가져오기
      const packageJson = fs.readJsonSync(this._packagePath("package.json"));

      // 의존성 버전 재구성
      const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
      for (const depTypeName of depTypeNames) {
        for (const depName of Object.keys(packageJson[depTypeName] || {})) {
          if (depName.startsWith("@simplism")) {
            packageJson[depTypeName][depName] = `^${rootPackageJson.version}`;
          }
          else if (rootPackageJson.dependencies[depName]) {
            packageJson[depTypeName][depName] = rootPackageJson.dependencies[depName];
          }
          else {
            throw new Exception(`'${this._packageName}'패키지의 의존성 패키지 정보가 루트 패키지에 없습니다.`);
          }
        }
      }

      // package.json 파일 다시쓰기
      fs.writeJsonSync(this._packagePath("package.json"), packageJson, {spaces: 2});

      // 새 버전으로 배포
      const shell = child_process.spawn("yarn", ["publish", "--new-version", rootPackageJson.version, "--access", "public", "--no-git-tag-version"], {
        shell: true,
        stdio: "pipe",
        cwd: this._packagePath()
      });

      shell.stderr.on("data", chunk => {
        const message = chunk.toString()
          .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
          .trim();

        if (message) {
          this._logger.error(message);
          reject();
        }
      });

      shell.on("exit", () => {
        this._logger.info(`publish complete: v${rootPackageJson.version}`);
        resolve();
      });
    });
  }

  private _getCommonConfig(): webpack.Configuration {
    let packageJson;
    if (fs.existsSync(this._packagePath("package.json"))) {
      packageJson = fs.readJsonSync(this._packagePath("package.json"));
    }

    fs.removeSync(this._packagePath("dist"));

    const nodeModules = fs.readdirSync(path.resolve(process.cwd(), "node_modules"))
      .filter(dir => dir !== ".bin")
      .mapMany(dir => dir.startsWith("@")
        ? fs.readdirSync(path.resolve(process.cwd(), `node_modules/${dir}`))
          .map(subDir => path.join(dir, subDir).replace(/\\/g, "/"))
        : [dir]
      );

    const entry = (() => {
      const result: { [key: string]: string } = {};
      const tsConfigJson = fs.readJsonSync(this._packagePath("tsconfig.json"));
      for (const fileName of tsConfigJson.files) {
        const basename = path.basename(fileName, path.extname(fileName));
        result[basename] = this._packagePath(fileName);
      }

      return result;
    })();

    return {
      target: "node",
      devtool: "inline-source-map",
      entry,
      output: {
        path: this._packagePath("dist"),
        libraryTarget: "umd"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"]
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: "happypack/loader?id=ts"
          }
        ]
      },
      plugins: [
        new HappyPack({
          id: "ts",
          verbose: false,
          threads: 2,
          loaders: [
            {
              loader: "ts-loader",
              options: {
                silent: true,
                happyPackMode: true,
                configFile: this._packagePath("tsconfig.json")
              }
            }
          ]
        }),

        new SdTypescriptDtsPlugin({context: this._packagePath(), logger: this._logger}),

        ...(packageJson.bin)
          ? [
            new webpack.BannerPlugin({
              banner: "#!/usr/bin/env node",
              raw: true,
              entryOnly: true,
              include: Object.keys(packageJson.bin).map(binName => `${binName}.js`)
            })
          ]
          : []
      ],
      externals: [
        (context, request, callback) => {
          const currRequest = request.split("!").last();

          if (nodeModules.some(item => currRequest.startsWith(item))) {
            callback(undefined, `commonjs ${currRequest}`);
            return;
          }

          if (
            !path.resolve(context, currRequest).startsWith(this._packagePath()) &&
            path.resolve(context, currRequest).startsWith(this._packagePath(".."))
          ) {
            const targetPackageName = path.relative(this._packagePath(".."), path.resolve(context, currRequest)).split(/[\\/]/)[0];
            callback(undefined, `commonjs @simplism/${targetPackageName}`);
            return;
          }

          callback(undefined, undefined);
        }
      ]
    };
  }

  private _writeStatsToConsole(stats: webpack.Stats): void {
    const info = stats.toJson();

    if (stats.hasWarnings()) {
      for (const warning of info.warnings) {
        this._logger.warn(warning);
      }
    }

    if (stats.hasErrors()) {
      for (const error of info.errors) {
        this._logger.error(error);
      }
    }
  }

  private _rootPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return path.resolve(process.cwd(), `packages/${this._packageName}`, ...args);
  }
}
