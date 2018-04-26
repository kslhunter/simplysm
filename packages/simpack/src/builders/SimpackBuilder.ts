import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as fs from "fs-extra";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as path from "path";
import * as webpack from "webpack";
import * as WebpackDevServer from "webpack-dev-server";
import "../../../core/src/extensions/ArrayExtensions";
import {Logger} from "../../../core/src/utils/Logger";
import {ISimpackConfig} from "../commons/ISimpackConfig";

export class LibraryBuilder {
    private _logger = new Logger("simpack", `LibraryBuilder :: ${this._packageName}`);

    private _root(...args: string[]): string {
        return path.resolve.apply(path, [process.cwd(), `packages/${this._packageName}`].concat(args));
    }

    public constructor(private _packageName: string) {
    }

    public async runAsync(watch: boolean): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this._logger.log(`빌드 시작`);

            let config: ISimpackConfig | undefined;
            if (fs.existsSync(this._root("simpack.config.ts"))) {
                eval(`require("ts-node/register")`);
                const configFilePath = this._root("simpack.config.ts");
                if (!configFilePath) throw new Error();
                config = eval(`require(configFilePath)`);
            }

            let packageJson;
            if (fs.existsSync(this._root("package.json"))) {
                packageJson = fs.readJsonSync(this._root("package.json"));
            }

            const isLibrary = !!packageJson;
            const isAngular = (config && config.type === "client") || (packageJson && packageJson.peerDependencies && Object.keys(packageJson.peerDependencies).some((dep) => dep.startsWith("@angular")));

            const nodeModules = isLibrary
                ? fs.readdirSync(path.resolve(process.cwd(), "node_modules"))
                    .filter((dir) => dir !== ".bin")
                    .mapMany((dir) => dir.startsWith("@")
                        ? fs.readdirSync(path.resolve(process.cwd(), `node_modules/${dir}`))
                            .map((subDir) => path.join(dir, subDir).replace(/\\/g, "/"))
                        : [dir]
                    )
                : [];

            const entry = (() => {
                if (isLibrary) {
                    const result: { [key: string]: string } = {};

                    if (packageJson.main) {
                        const basename = path.basename(packageJson.main, path.extname(packageJson.main));
                        const sourcePath = packageJson.main.replace("dist", "src").replace(".js", ".ts");
                        result[basename] = this._root(sourcePath);
                    }

                    if (packageJson.bin) {
                        for (const basename of Object.keys(packageJson.bin)) {
                            const sourcePath = packageJson.bin[basename].replace("dist", "src").replace(".js", ".ts");
                            result[basename] = this._root(sourcePath);
                        }
                    }

                    return result;
                }
                else if (config!.type === "client") {
                    return {
                        main: [
                            ...watch
                                ? [
                                    `webpack-dev-server/client?http://${config!["host"]}:${config!["port"]}/`,
                                    `webpack/hot/only-dev-server`
                                ]
                                : [],
                            path.resolve(process.cwd(), "node_modules/@simplism/simpack/assets/main.ts")
                        ]
                    };
                }
                else if (config!.type === "server") {
                    return {
                        app: this._root("src/app.ts")
                    };
                }
            })();

            const webpackConfig: webpack.Configuration = {
                target: isAngular ? undefined : "node",
                devtool: "source-map",
                mode: eval(`process.env.NODE_ENV`) === "production" ? "production" : "development",
                ...eval(`process.env.NODE_ENV`) === "production" ? {
                    optimization: {
                        noEmitOnErrors: true
                    }
                } : {},
                entry,
                output: {
                    path: isLibrary
                        ? this._root(`dist`)
                        : isAngular
                            ? path.resolve(process.cwd(), `dist/www/${this._packageName}`)
                            : path.resolve(process.cwd(), `dist`),
                    libraryTarget: isLibrary ? "umd" : undefined
                },

                ...!isLibrary
                    ? {
                        optimization: {
                            splitChunks: {
                                cacheGroups: {
                                    vendor: {
                                        test: /[\\/]node_modules[\\/](?!@simplism)/,
                                        name: "vendor",
                                        chunks: "initial",
                                        enforce: true
                                    },
                                    simplism: {
                                        test: /[\\/]node_modules[\\/]@simplism[\\/](?!pack)/,
                                        name: "simplism",
                                        chunks: "initial",
                                        enforce: true
                                    }
                                }
                            }
                        }
                    }
                    : {},

                resolve: {
                    extensions: [
                        ".ts", ".js", ".json",
                        ...(config && config.type === "server") ? [".node"] : []
                    ]
                },
                module: {
                    rules: [
                        ...(!isLibrary && isAngular)
                            ? [
                                {
                                    test: /.js$/,
                                    parser: {
                                        system: true
                                    }
                                } as any
                            ]
                            : [],

                        ...!isLibrary
                            ? [
                                {
                                    test: /\.js$/,
                                    use: ["source-map-loader"],
                                    exclude: /node_modules[\\/](?!@simplism)/,
                                    enforce: "pre"
                                },
                                {
                                    test: /\.ts$/,
                                    loader: "happypack/loader?id=ts",
                                    exclude: /node_modules/
                                },
                                {
                                    test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
                                    use: "file-loader?name=assets/[name].[hash].[ext]"
                                }
                            ]
                            : [
                                {
                                    enforce: "pre",
                                    test: /\.ts$/,
                                    exclude: /node_modules/,
                                    loader: "tslint-loader",
                                    options: {
                                        formatter: "prose"
                                    }
                                },
                                {
                                    test: /\.ts$/,
                                    exclude: /node_modules/,
                                    use: [
                                        {
                                            loader: "ts-loader",
                                            options: {
                                                configFile: this._root("tsconfig.json"),
                                                silent: true
                                            }
                                        },
                                        ...isAngular ? ["angular2-template-loader"] : []
                                    ]
                                }
                            ],

                        ...isAngular
                            ? [
                                {
                                    test: /\.html$/,
                                    use: "html-loader"
                                },
                                {
                                    test: /\.pcss$/,
                                    use: [
                                        "style-loader",
                                        {
                                            loader: "css-loader",
                                            options: {importLoaders: 1}
                                        },
                                        {
                                            loader: "postcss-loader",
                                            options: {
                                                plugins: [
                                                    require("postcss-import")(),
                                                    require("postcss-cssnext")()
                                                ]
                                            }
                                        }
                                    ]
                                }
                            ]
                            : []
                    ]
                },
                plugins: [
                    ...!isLibrary ? [
                        new (require("hard-source-webpack-plugin"))(),

                        new (require("happypack"))({
                            id: "ts",
                            verbose: false,
                            loaders: [
                                {
                                    loader: "ts-loader",
                                    options: {silent: true, happyPackMode: true}
                                },
                                ...isAngular ? ["angular2-template-loader"] : []
                            ]
                        }),

                        new (require("fork-ts-checker-webpack-plugin"))({
                            checkSyntacticErrors: true,
                            tsconfig: this._root("tsconfig.json"),
                            tslint: this._root("tslint.json"),
                            /*formatter: "codeframe",*/
                            logger: (() => {
                                return {
                                    error: this._logger.error.bind(this._logger),
                                    warn: this._logger.warn.bind(this._logger),
                                    info: this._logger.log.bind(this._logger)
                                };
                            })()
                        })
                    ] : [],

                    ...(isLibrary && packageJson.bin)
                        ? [
                            new webpack.BannerPlugin({
                                banner: `#!/usr/bin/env node`,
                                raw: true,
                                entryOnly: true,
                                include: Object.keys(packageJson.bin).map((binName) => `${binName}.js`)
                            })
                        ]
                        : [],

                    ...(!isLibrary && isAngular)
                        ? [
                            new webpack.ContextReplacementPlugin(
                                /angular[\\/]core[\\/](@angular|esm5|fesm5)/,
                                this._root("src"),
                                {}
                            ),

                            new webpack.NormalModuleReplacementPlugin(
                                /^APP_MODULE_PATH$/,
                                this._root("src/AppModule.ts")
                            ),

                            new HtmlWebpackPlugin({
                                template: path.resolve(process.cwd(), "node_modules/@simplism/simpack/assets/index.ejs"),
                                NODE_ENV: eval(`process.env.NODE_ENV`),
                                PACKAGE_NAME: this._packageName,
                                TITLE: config!["title"]
                            }),

                            new CopyWebpackPlugin([
                                {from: path.resolve(process.cwd(), "node_modules/@simplism/simpack/assets/public")}
                            ])
                        ]
                        : [],

                    ...(!isLibrary && isAngular && watch)
                        ? [new webpack.HotModuleReplacementPlugin()]
                        : []
                ],
                externals: [
                    (context, request, callback) => {
                        if (isLibrary) {
                            if (nodeModules.some((item) => request.startsWith(item))) {
                                callback(undefined, `commonjs ${request}`);
                                return;
                            }

                            if (
                                !path.resolve(context, request).startsWith(this._root()) &&
                                path.resolve(context, request).startsWith(this._root(".."))
                            ) {
                                const targetPackageName = path.relative(this._root(".."), path.resolve(context, request)).split(/[\\/]/)[0];
                                callback(undefined, `commonjs @simplism/${targetPackageName}`);
                                return;
                            }
                        }
                        else {
                            if (
                                !path.resolve(context, request).startsWith(this._root()) &&
                                path.resolve(context, request).startsWith(this._root(".."))
                            ) {
                                const className = path.basename(request, path.extname(request));
                                return callback(undefined, `{${className}: {name: '${className}'}}`);
                            }

                            if (isAngular && ["fs", "fs-extra", "path"].includes(request)) {
                                return callback(undefined, `"${request}"`);
                            }
                        }

                        callback(undefined, undefined);
                    }
                ]
            };

            const compiler: webpack.Compiler = webpack(webpackConfig);
            const onCompileComplete = (err?: Error, stats?: webpack.Stats) => {
                if (err) {
                    reject(err);
                    return;
                }

                const info = stats!.toJson();

                if (stats!.hasWarnings()) {
                    for (const warning of info.warnings) {
                        this._logger.warn(warning);
                        /*this._logger.warn(
                            warning.replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*!/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]: `;
                            })
                        );*/
                    }
                }

                if (stats!.hasErrors()) {
                    for (const error of info.errors) {
                        this._logger.error(error);
                        /*this._logger.error(
                            error.replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*!/g, (...matches: string[]) => {
                                return `${matches[1]}\nERROR: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]: `;
                            })
                        );*/
                    }
                }

                if (!isLibrary && isAngular && watch) {
                    this._logger.info(`빌드 완료: http://${config!["host"]}:${config!["port"]}`);
                }
                else {
                    this._logger.info("빌드 완료");
                }
                resolve();
            };

            if (watch) {
                if (!isLibrary && isAngular) {
                    const server = new WebpackDevServer(compiler, {
                        hot: true,
                        /*inline: true,*/
                        quiet: true
                    });
                    server.listen(config!["port"], config!["host"]);
                    compiler.hooks.failed.tap(this._packageName, (error) => onCompileComplete(error, undefined));
                    compiler.hooks.done.tap(this._packageName, (stats) => onCompileComplete(undefined, stats));
                }
                else {
                    compiler.watch({}, onCompileComplete.bind(this));
                    compiler.hooks.watchRun.tap("LibraryBuilder", () => {
                        this._logger.log(`변경 감지`);
                    });
                }
            }
            else {
                compiler.run(onCompileComplete.bind(this));
            }

            compiler.hooks.afterEmit.tap("LibraryBuilder", () => {
                if (fs.existsSync(this._root("dist/packages"))) {
                    if (fs.existsSync(this._root(`dist/packages/${this._packageName}/dist/${this._packageName}/src`))) {
                        fs.copySync(this._root(`dist/packages/${this._packageName}/dist/${this._packageName}/src`), this._root(`dist`));
                    }
                    else {
                        fs.copySync(this._root(`dist/packages/${this._packageName}/dist`), this._root(`dist`));
                    }
                    fs.removeSync(this._root(`dist/packages`));
                }
            });
        });
    }
}