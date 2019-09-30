import * as events from "events";
import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import {SdWebpackWriteFilePlugin} from "./plugins/SdWebpackWriteFilePlugin";
import {SdCliUtils} from "./commons/SdCliUtils";
import * as webpackMerge from "webpack-merge";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import * as CircularDependencyPlugin from "circular-dependency-plugin";
import * as webpackNodeExternals from "webpack-node-externals";

export class SdWebpackServerCompiler extends events.EventEmitter {
  private readonly _contextPath: string;
  private readonly _tsConfigPath: string;

  private _projectNpmConfig_: any;

  private get _projectNpmConfig(): any {
    if (!this._projectNpmConfig_) {
      this._projectNpmConfig_ = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    }
    return this._projectNpmConfig_;
  }

  private _tsConfig_: any;

  private get _tsConfig(): any {
    if (!this._tsConfig_) {
      this._tsConfig_ = fs.readJsonSync(this._tsConfigPath);
    }
    return this._tsConfig_;
  }

  private _parsedTsConfig_?: ts.ParsedCommandLine;

  private get _parsedTsConfig(): ts.ParsedCommandLine {
    if (!this._parsedTsConfig_) {
      this._parsedTsConfig_ = ts.parseJsonConfigFileContent(this._tsConfig, ts.sys, this._contextPath);
    }
    return this._parsedTsConfig_;
  }

  private _distPath_?: string;

  private get _distPath(): string {
    if (!this._distPath_) {
      this._distPath_ = this._parsedTsConfig.options.outDir ? path.resolve(this._parsedTsConfig.options.outDir) : path.resolve(this._contextPath, "dist");
    }
    return this._distPath_;
  }

  private _alias_?: { [key: string]: string };

  private get _alias(): { [key: string]: string } {
    if (!this._alias_) {
      const tsOptions = this._parsedTsConfig.options;
      const alias = {};
      if (tsOptions && tsOptions.paths) {
        for (const tsPathKey of Object.keys(tsOptions.paths)) {
          if (tsOptions.paths[tsPathKey].length !== 1) {
            throw new Error("'tsconfig'의 'paths'옵션에서, 하나의 명칭에 반드시 하나의 목적지를 지정해야 합니다.");
          }
          alias[tsPathKey] = path.resolve(this._contextPath, tsOptions.paths[tsPathKey][0]);
        }
      }
      this._alias_ = alias;
    }
    return this._alias_;
  }

  public constructor(private readonly _packageKey: string,
                     private readonly _options?: string[]) {
    super();

    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._tsConfigPath = path.resolve(this._contextPath, "tsconfig.build.json");
  }

  private _sourceCompileConfigs(): webpack.Configuration {
    return {
      module: {
        rules: [
          {
            test: /\.ts$/,
            loaders: [
              require.resolve("./loaders/ts-transpile-loader")
            ]
          }
        ]
      },
      plugins: [
        new CircularDependencyPlugin({
          exclude: /[\\\/]node_modules[\\\/]/,
          include: new RegExp("^" + this._contextPath.replace(/\\/g, "\\\\"))
        } as any)
      ]
    };
  }

  private _assetsFileConfigs(opt: { hash: boolean }): webpack.Configuration {
    return {
      module: {
        rules: [
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|pfx|zip)$/,
            loader: "file-loader",
            options: {
              name: `assets/[name].[ext]${opt.hash ? "?[hash]" : ""}`
            }
          }
        ]
      }
    };
  }

  private _entryConfigs(): webpack.Configuration {
    return {
      entry: {
        app: path.resolve(this._contextPath, "src/app.ts")
      }
    };
  }

  private _getWebpackCommonConfig(): webpack.Configuration {
    return {
      output: {
        path: this._distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: this._alias
      },
      target: "node",
      node: {
        __dirname: false
      },
      module: {
        strictExportPresence: true,
        rules: []
      },
      plugins: [
        new webpack.DefinePlugin({
          "process.env.VERSION": `"${this._projectNpmConfig.version}"`
        })
      ],
      externals: [
        webpackNodeExternals({
          whitelist: Object.keys(this._alias)
        })
      ]
    };
  }

  public async runAsync(): Promise<void> {
    const projectConfig = SdCliUtils.getConfigObj("production", this._options);
    const config = projectConfig.packages[this._packageKey];

    const packageNpmConfig = fs.readJsonSync(path.resolve(this._contextPath, "package.json"));
    delete packageNpmConfig.devDependencies;
    for (const depKey of Object.keys(packageNpmConfig.dependencies)) {
      if (depKey.startsWith("@" + this._projectNpmConfig.name)) {
        delete packageNpmConfig.dependencies[depKey];
      }
    }

    const webpackConfig = webpackMerge(this._getWebpackCommonConfig(),
      {
        mode: "production",
        devtool: false,
        profile: false,
        performance: {
          hints: false
        },
        optimization: {
          noEmitOnErrors: true,
          minimizer: [
            new webpack.HashedModuleIdsPlugin()
          ]
        },
        plugins: [
          new SdWebpackWriteFilePlugin([
            {
              path: path.resolve(this._distPath, ".configs.json"),
              content: JSON.stringify({env: "production", ...config.configs}, undefined, 2)
            },
            {
              path: path.resolve(this._distPath, "package.json"),
              content: JSON.stringify(packageNpmConfig, undefined, 2)
            },
            {
              path: path.resolve(this._distPath, "pm2.json"),
              content: JSON.stringify({
                name: packageNpmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
                script: "app.js",
                watch: false,
                env: {
                  NODE_ENV: "production",
                  VERSION: this._projectNpmConfig.version
                }
              }, undefined, 2)
            }
          ])
        ]
      },
      this._entryConfigs(),
      this._assetsFileConfigs({hash: false}),
      this._sourceCompileConfigs()
    );

    const compiler = webpack(webpackConfig);

    compiler.hooks.run.tap("SdPackageCompiler", () => {
      this.emit("run");
    });

    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._emitWebpackCompilerStats(stats);
        resolve();
      });
    });
  }

  public async watchAsync(): Promise<void> {
    const webpackConfig = webpackMerge(this._getWebpackCommonConfig(),
      {
        mode: "development",
        devtool: "cheap-module-source-map",
        output: {
          pathinfo: false
        },
        optimization: {
          removeAvailableModules: true,
          removeEmptyChunks: false,
          splitChunks: false
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              enforce: "pre",
              loader: "source-map-loader",
              exclude: [
                /node_modules[\\/](?!@simplysm)/
              ]
            }
          ]
        },
        plugins: [
          new SdWebpackTimeFixPlugin(),
          new SdWebpackWriteFilePlugin([
            {
              path: path.resolve(this._distPath, ".configs.json"),
              content: async () => {
                const currProjectConfig = SdCliUtils.getConfigObj("development", this._options);
                const currConfig = currProjectConfig.packages[this._packageKey];
                return JSON.stringify({env: "development", ...currConfig.configs}, undefined, 2);
              }
            }
          ])
        ]
      },
      this._entryConfigs(),
      this._assetsFileConfigs({hash: true}),
      this._sourceCompileConfigs()
    );

    this.emit("run");

    const compiler = webpack(webpackConfig);

    let first = true;
    compiler.hooks.invalid.tap("SdPackageCompiler", () => {
      if (first) {
        first = false;
        this.emit("run");
      }
    });

    await new Promise<void>((resolve, reject) => {
      compiler.watch({}, (err, stats) => {
        if (err) {
          this.emit("error", err);
          reject(err);
          return;
        }

        first = true;
        this._emitWebpackCompilerStats(stats);
        resolve();
      });
    });
  }

  private _emitWebpackCompilerStats(stats: webpack.Stats): void {
    const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

    if (stats.hasWarnings()) {
      for (const warning of info.warnings) {
        this.emit("warning", warning);
      }
    }

    if (stats.hasErrors()) {
      for (const error of info.errors) {
        this.emit("error", error);
      }
    }

    this.emit("done");
  }
}
