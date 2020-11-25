import { INpmConfig, ISdPackageBuildResult, ISdServerPackageConfig } from "../commons";
import * as webpack from "webpack";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { FsUtil } from "@simplysm/sd-core-node";
import * as ts from "typescript";
import * as path from "path";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdWebpackWriteFilePlugin } from "../utils/SdWebpackWriteFilePlugin";
import { EventEmitter } from "events";
import { SdServiceServer } from "@simplysm/sd-service-node";
import decache from "decache/decache";
import { SdWebpackUtil } from "../utils/SdWebpackUtil";

export class SdCliServerCompiler extends EventEmitter {
  private readonly _npmConfig: INpmConfig;

  private _server?: SdServiceServer;

  private get _mainFilePath(): string {
    if (this._npmConfig.main === undefined) {
      throw new Error("서버 패키지의 'package.json'에는 반드시 'main'이 설정되어야 합니다.");
    }
    return path.resolve(this._rootPath, this._npmConfig.main);
  }

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdServerPackageConfig) {
    super();

    const npmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(this._rootPath);
    this._npmConfig = FsUtil.readJson(npmConfigFilePath);
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[], server?: SdServiceServer) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async compileAsync(): Promise<void> {
    const webpackConfig = await this._getWebpackConfigAsync(false);

    const compiler = webpack(webpackConfig);

    await new Promise<void>((resolve, reject) => {
      try {
        compiler.hooks.run.tap("SdCliServerCompiler", () => {
          this.emit("change");
        });

        compiler.run((err, stats) => {
          const results = SdWebpackUtil.getWebpackResults(err, stats);
          this.emit("complete", results);
          resolve();
        });
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async watchAsync(): Promise<void> {
    const webpackConfig = await this._getWebpackConfigAsync(true);

    const compiler = webpack(webpackConfig);

    await new Promise<void>((resolve, reject) => {
      try {
        compiler.hooks.watchRun.tapAsync("SdCliServerCompiler", async (params, callback) => {
          this.emit("change");
          await this._stopServerAsync();
          callback();
        });

        compiler.hooks.failed.tap("SdCliServerCompiler", (err) => {
          const results = SdWebpackUtil.getWebpackResults(err);
          this.emit("complete", results);
          reject(err);
        });

        compiler.watch({}, (err: Error | null, stats) => {
          const results = SdWebpackUtil.getWebpackResults(err, stats);

          if (err == null) {
            results.push(...this._startServer());
          }

          this.emit("complete", results, this._server);
          resolve();
        });
      }
      catch (err) {
        reject(err);
      }
    });
  }

  private async _stopServerAsync(): Promise<void> {
    if (this._server) {
      await this._server.closeAsync();
      delete this._server;
    }
    const mainFilePath = this._mainFilePath;
    decache(mainFilePath);
  }

  private _startServer(): ISdPackageBuildResult[] {
    if (this._server !== undefined) {
      return [];
    }

    const mainFilePath = this._mainFilePath;
    this._server = require(mainFilePath) as SdServiceServer | undefined;
    if (!this._server) {
      return [
        {
          type: "compile",
          filePath: mainFilePath,
          severity: "error",
          message: `${mainFilePath}(0, 0): 'SdServiceServer'를 'export'해야 합니다.`
        }
      ];
    }

    return [];
  }

  private async _getWebpackConfigAsync(watch: boolean): Promise<webpack.Configuration> {
    // ENTRY 구성
    const tsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this._rootPath, "node");
    const tsconfig = await FsUtil.readJsonAsync(tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);

    const entryFiles = parsedTsconfig.fileNames;

    const entry = entryFiles.toObject(
      (item) => path.basename(item, path.extname(item)),
      (item) => path.resolve(this._rootPath, item)
    );

    const distPath = SdCliPathUtil.getDistPath(this._rootPath);

    // DIST에 COPY할 NPM 설정 구성
    const distNpmConfig = ObjectUtil.clone(this._npmConfig);
    if (distNpmConfig.main === undefined) throw new Error("서버 package.json에는 반드시  'main'필드가 설정되어야 합니다.");

    const loadedModuleNames: string[] = [];
    const nodeGypModuleNames: string[] = [];
    const fn = (moduleName: string): void => {
      if (loadedModuleNames.includes(moduleName)) return;
      loadedModuleNames.push(moduleName);

      const modulePath = path.resolve(process.cwd(), "node_modules", moduleName);
      if (FsUtil.exists(path.resolve(modulePath, "binding.gyp"))) {
        nodeGypModuleNames.push(moduleName);
      }

      const moduleNpmConfig = FsUtil.readJson(SdCliPathUtil.getNpmConfigFilePath(modulePath));
      for (const depModuleName of Object.keys(moduleNpmConfig.dependencies ?? {})) {
        fn(depModuleName);
      }
    };
    for (const key of Object.keys(distNpmConfig.dependencies ?? {})) {
      fn(key);
    }

    distNpmConfig.dependencies = {};
    for (const nodeGypModuleName of nodeGypModuleNames) {
      distNpmConfig.dependencies[nodeGypModuleName] = "*";
    }
    delete distNpmConfig.devDependencies;
    delete distNpmConfig.peerDependencies;

    distNpmConfig.main = path.relative(distPath, path.resolve(this._rootPath, distNpmConfig.main));

    const mainFilePath = this._mainFilePath;

    // WEBPACK Config

    return {
      ...watch ? {
        mode: "development",
        devtool: "cheap-module-source-map",
        optimization: {
          minimize: false
        }
      } : {
        mode: "production",
        devtool: "source-map",
        profile: false,
        performance: { hints: false },
        optimization: {
          noEmitOnErrors: true,
          minimizer: [
            new webpack.HashedModuleIdsPlugin()
          ]
        }
      },
      target: "node",
      node: {
        __dirname: false
      },
      resolve: {
        extensions: [".ts", ".js", ".json"]
      },
      entry,
      output: {
        path: distPath,
        filename: "[name].js",
        libraryTarget: "umd"
      },
      module: {
        strictExportPresence: true,
        rules: [
          {
            test: /\.js$/,
            enforce: "pre",
            loader: "source-map-loader",
            exclude: [
              /node_modules[\\/](?!@simplysm)/
            ]
          },
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: "ts-loader",
            options: {
              configFile: tsconfigFilePath,
              transpileOnly: true
            }
          },
          {
            test: {
              or: [
                /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip|pfx|pkl)$/,
                /assets/
              ]
            },
            loader: "file-loader",
            options: {
              name: `[name].[ext]`,
              outputPath: "assets/",
              publicPath: "assets/",
              esModule: false
            }
          }
        ]
      },
      plugins: [
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(distPath, ".configs.json"),
            content: JSON.stringify(this._config.configs ?? {}, undefined, 2)
          },
          ...watch ? [] : [
            {
              path: path.resolve(distPath, "package.json"),
              content: JSON.stringify(distNpmConfig, undefined, 2)
            },
            {
              path: path.resolve(distPath, "pm2.json"),
              content: JSON.stringify({
                name: distNpmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
                script: path.basename(mainFilePath),
                watch: true,
                interpreter: "node@" + process.versions.node,
                env: {
                  NODE_ENV: "production",
                  VERSION: distNpmConfig.version,
                  TZ: "Asia/Seoul",
                  ...this._config.env ? this._config.env : {}
                }
              }, undefined, 2)
            }
          ]
        ])
      ],
      externals: [
        (context, request, callback): void => {
          if (nodeGypModuleNames.includes(request)) {
            const req = request.replace(/^.*?\/node_modules\//, "") as string;
            if (req.startsWith("@")) {
              callback(null, `commonjs ${req.split("/", 2).join("/")}`);
              return;
            }

            callback(null, `commonjs ${req.split("/")[0]}`);
            return;
          }

          if (request === "fsevents") {
            const req = request.replace(/^.*?\/node_modules\//, "") as string;
            callback(null, `commonjs ${req.split("/")[0]}`);
            return;
          }

          callback();
        }
      ]
    };
  }
}