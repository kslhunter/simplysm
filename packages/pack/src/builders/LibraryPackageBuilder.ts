import * as fs from "fs-extra";
import * as path from "path";
import {ILibraryPackageConfig} from "../commons/IProjectConfig";
import {Exception, Logger} from "@simplism/core";
import * as child_process from "child_process";
import {TsFriendlyLoggerPlugin} from "../plugins/TsFriendlyLoggerPlugin";
import * as webpack from "webpack";
import * as ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import * as nodeExternals from "webpack-node-externals";
import * as HappyPack from "happypack";
import {TsDeclarationPlugin} from "../plugins/TsDeclarationPlugin";

export class LibraryPackageBuilder {
  private readonly _logger = new Logger("@simplism/pack", `LibraryPackageBuilder`);

  public constructor(private readonly _config: ILibraryPackageConfig) {
  }

  public async buildAsync(): Promise<void> {
    this._logger.log(`${this._config.name} building...`);

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

    await new Promise<void>((resolve, reject) => {
      const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
        mode: "production",
        devtool: "source-map",
        optimization: {
          noEmitOnErrors: true,
          minimize: false
        }
      });

      webpack(webpackConfig, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public async watchAsync(): Promise<void> {
    this._logger.log(`${this._config.name} watching...`);

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

    await new Promise<void>((resolve, reject) => {
      const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
        mode: "development",
        devtool: "source-map"
      });

      const compiler = webpack(webpackConfig);

      compiler.watch({}, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  public async publishAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._logger.log(`${this._config.name} publishing...`);

      // 최상위 package.json 설정 가져오기
      const rootPackageJson = fs.readJsonSync(this._projectPath("package.json"));

      // package.json 설정 가져오기
      const packageJson = fs.readJsonSync(this._packagePath("package.json"));

      // 의존성 버전 재구성
      const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
      for (const depTypeName of depTypeNames) {
        for (const depName of Object.keys(packageJson[depTypeName] || {})) {
          if (depName.startsWith("@" + rootPackageJson.name)) {
            packageJson[depTypeName][depName] = `^${rootPackageJson.version}`;
          }
          else if (rootPackageJson.devDependencies[depName]) {
            packageJson[depTypeName][depName] = rootPackageJson.devDependencies[depName];
          }
          else {
            throw new Exception(`'${this._config.name}'패키지의 의존성 패키지 정보가 루트 패키지에 없습니다.`);
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

      let errorMessage = "";
      shell.stderr.on("data", chunk => {
        errorMessage += chunk.toString();
      });

      shell.on("exit", () => {
        if (errorMessage.trim()) {
          this._logger.error(`${this._config.name} error occurred`, errorMessage.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").trim());
          reject();
          return;
        }

        this._logger.info(`${this._config.name} publish complete: v${rootPackageJson.version}`);
        resolve();
      });
    });
  }

  private _getCommonConfig(): webpack.Configuration {
    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    const alias = {};
    if (tsconfig.compilerOptions.paths) {
      for (const key of Object.keys(tsconfig.compilerOptions.paths)) {
        alias[key] = this._packagePath(tsconfig.compilerOptions.paths[key][0].replace(/[\\/]src[\\/]([^\\/.]*)\.ts$/, ""));
      }
    }

    const packageJson = fs.readJsonSync(this._packagePath("package.json"));

    const entry: { [key: string]: string } = {};
    for (const fileName of tsconfig.files) {
      const basename = path.basename(fileName, path.extname(fileName));
      entry[basename] = this._packagePath(fileName);
    }

    return {
      target: "node",
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias
      },
      entry,
      output: {
        path: this._packagePath(tsconfig.compilerOptions.outDir || "dist"),
        filename: "[name].js",
        libraryTarget: "umd"
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"],
            include: /node_modules[\\/]@simplism/
          },
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
            },
            this._loadersPath("inline-sass-loader.js"),
            this._loadersPath("shebang-loader.js")
          ]
        }),
        new TsDeclarationPlugin({
          configFile: this._packagePath("tsconfig.json")
        }),
        new ForkTsCheckerWebpackPlugin({
          tsconfig: this._packagePath("tsconfig.json"),
          tslint: this._packagePath("tslint.json"),
          silent: true,
          checkSyntacticErrors: true
        }),
        new TsFriendlyLoggerPlugin({
          error: message => this._logger.error(this._config.name + " " + message),
          warn: message => this._logger.warn(this._config.name + " " + message),
          info: message => this._logger.info(this._config.name + " " + message),
          log: message => this._logger.log(this._config.name + " " + message)
        }),
        ...(packageJson.bin)
          ? [
            new webpack.BannerPlugin({
              banner: "#!/usr/bin/env node",
              raw: true,
              entryOnly: true,
              include: Object.keys(packageJson.bin).map(key => path.relative(this._packagePath(tsconfig.compilerOptions.outDir || "dist"), this._packagePath(packageJson.bin[key])))
            })
          ]
          : []
      ],
      externals: [
        (context, request, callback) => {
          if (alias[request]) {
            callback(undefined, `commonjs ${request}`);
            return;
          }

          callback(undefined, undefined);
        },
        nodeExternals()
      ]
    };
  }

  private _loadersPath(...args: string[]): string {
    return fs.existsSync(path.resolve(process.cwd(), "node_modules/@simplism/pack/loaders"))
      ? path.resolve(process.cwd(), "node_modules/@simplism/pack/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  }

  private _projectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return path.resolve(process.cwd(), `packages/${this._config.name}`, ...args);
  }
}
