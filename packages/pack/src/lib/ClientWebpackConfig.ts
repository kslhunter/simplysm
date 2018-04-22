import * as path from "path";
import * as webpack from "webpack";
import {ISimpackClientConfig, ISimpackServerConfig} from "./ISimpackConfig";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import * as fs from "fs-extra";
import * as ExtractTextPlugin from "extract-text-webpack-plugin";
import {Logger, Uuid} from "@simplism/core";

// tslint:disable-next-line:variable-name
const HappyPack = require("happypack");
// tslint:disable-next-line:variable-name
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

export class ClientWebpackConfig {
    static getForBuild(config: ISimpackClientConfig, serverConfig: ISimpackServerConfig | undefined, env: string | undefined, clientDistPath: string): webpack.Configuration {
        return webpackMerge(this._getCommon(config, serverConfig), {
            mode: "production",
            optimization: {
                noEmitOnErrors: true
            },

            entry: {
                "app": path.resolve(process.cwd(), "node_modules", "@simplism", "pack", "entry", "main.ts")
            },

            output: {
                path: clientDistPath,
                publicPath: config.cordova ? "/android_asset/www/" : undefined,
                filename: "[name].[hash].js",
                chunkFilename: "[id].[hash].js"
            },

            module: {
                rules: [
                    {
                        test: /\.scss$/,
                        exclude: /[\\\/]src[\\\/]/,
                        use: ExtractTextPlugin.extract({
                            fallback: "style-loader",
                            use: [
                                "css-loader?sourceMap",
                                "sass-loader?sourceMap"
                            ]
                        })
                    }
                ]
            },

            plugins: [
                new ExtractTextPlugin("[name].[hash].css"),

                new webpack.LoaderOptionsPlugin({
                    htmlLoader: {minimize: false}
                }),

                new HtmlWebpackPlugin({
                    template: path.resolve(process.cwd(), "node_modules", "@simplism", "pack", "entry", "index.ejs"),
                    NODE_ENV: "production",
                    PACKAGE_NAME: config.package,
                    NAME: config.name,
                    CORDOVA: !!config.cordova,
                    ELECTRON: !!config.electron
                }),

                new webpack.DefinePlugin({
                    "process.env": this._stringifyEnv({
                        NODE_ENV: "production",
                        SD_ENV: env,
                        PLATFORM: config.electron ? "desktop" : config.cordova ? config.cordova.platform : "web",
                        VERSION: fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version,
                        SERVER_HOST: serverConfig && serverConfig.host,
                        SERVER_PORT: serverConfig && serverConfig.port,
                        ...config.env
                    })
                })
            ]
        });
    }

    static getForStart(config: ISimpackClientConfig, serverConfig: ISimpackServerConfig, env: string | undefined, clientDistPath: string): webpack.Configuration {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommon(config, serverConfig), {
            mode: "development",

            entry: {
                "app": [
                    `webpack-dev-server/client?http://${serverConfig.host}:${serverConfig.port + 1}/`,
                    `webpack/hot/dev-server`,
                    path.resolve(process.cwd(), "node_modules", "@simplism", "pack", "entry", "main.ts")
                ]
            },

            output: {
                path: clientDistPath,
                filename: "[name].js",
                chunkFilename: "[id].chunk.js"
            },

            module: {
                rules: [
                    {
                        test: /\.scss$/,
                        exclude: /[\\\/]src[\\\/]/,
                        use: [
                            "style-loader",
                            "css-loader?sourceMap",
                            "sass-loader?sourceMap"
                        ]
                    }
                ]
            },

            plugins: [
                /*new WebpackWatchTimefixPlugin(),*/

                new HtmlWebpackPlugin({
                    template: path.resolve(process.cwd(), "node_modules", "@simplism", "pack", "entry", "index.ejs"),
                    NODE_ENV: "development",
                    PACKAGE_NAME: config.package,
                    NAME: config.name,
                    CORDOVA: !!config.cordova,
                    ELECTRON: !!config.electron
                }),

                new webpack.DefinePlugin({
                    "process.env": this._stringifyEnv({
                        NODE_ENV: "development",
                        SD_ENV: env,
                        PLATFORM: config.electron ? "desktop" : config.cordova ? config.cordova.platform : "web",
                        VERSION: fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version,
                        SERVER_HOST: serverConfig && serverConfig.host,
                        SERVER_PORT: serverConfig && serverConfig.port,
                        ...config.env
                    })
                }),

                new webpack.HotModuleReplacementPlugin()
            ]
        });

        //-- CORDOVA
        if (config.cordova) {
            webpackConfig.plugins!.push(
                new CopyWebpackPlugin([{
                    context: path.resolve(process.cwd(), ".cordova/platforms/" + config.cordova.platform + "/platform_www"),
                    from: "**/*"
                }])
            );
        }

        return webpackConfig;
    }

    private static _stringifyEnv(param: { [key: string]: any }): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        for (const key of Object.keys(param)) {
            result[key] = param[key] ? JSON.stringify(param[key]) : "undefined";
        }
        return result;
    }

    private static _getCommon(config: ISimpackClientConfig, serverConfig: ISimpackServerConfig | undefined): webpack.Configuration {
        return {
            devtool: "source-map",
            target: config.electron ? "electron-renderer" : undefined,

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
            },

            resolve: {
                extensions: [".ts", ".js"],
                alias: {
                    "@simplism": path.resolve(process.cwd(), "node_modules", "@simplism")
                }
            },

            module: {
                rules: [
                    {
                        test: /.js$/,
                        parser: {
                            system: true
                        }
                    } as any,
                    {
                        test: /\.js$/,
                        use: ["source-map-loader"],
                        enforce: "pre"
                    }, /*
                    {
                        test: /\.ts$/,
                        enforce: "pre",
                        loader: "tslint-loader",
                        exclude: /node_modules/,
                        options: {
                            emitErrors: true,
                            formatter: "prose"
                        }
                    },
                    {
                        test: /\.ts$/,
                        use: [{
                            loader: "awesome-typescript-loader",
                            options: {
                                configFileName: path.resolve(process.cwd(), "packages", config.package, "tsconfig.json"),
                                silent: true
                            }
                        }, "angular2-template-loader"],
                        exclude: /node_modules/
                    },*/
                    {
                        test: /\.ts$/,
                        loader: "happypack/loader?id=ts",
                        exclude: /node_modules/
                    },
                    {
                        test: /\.scss$/,
                        include: /[\\\/]src[\\\/]/,
                        use: ["raw-loader", "sass-loader?sourceMap"]
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
                                    plugins: (loader: any) => [
                                        require("postcss-import")({root: loader.resourcePath}),
                                        require("postcss-cssnext")()
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        test: /\.html$/,
                        use: "html-loader"
                    },
                    {
                        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
                        use: "file-loader?name=assets/[name].[hash].[ext]"
                    }
                ]
            },

            plugins: [
                new webpack.ContextReplacementPlugin(
                    /angular[\\/]core[\\/](@angular|esm5)/,
                    path.resolve(process.cwd(), "./src"),
                    {}
                ),

                new webpack.ProvidePlugin({
                    $: "jquery",
                    jQuery: "jquery",
                    JQuery: "jquery"
                }),

                new webpack.NormalModuleReplacementPlugin(
                    /^APP_MODULE_PATH$/,
                    require.resolve(path.resolve(process.cwd(), "packages", config.package, "src", "AppModule.ts"))
                ),

                new HappyPack({
                    id: "ts",
                    verbose: false,
                    loaders: [
                        {
                            loader: "ts-loader",
                            options: {silent: true, happyPackMode: true}
                        },
                        "angular2-template-loader"
                    ]
                }),

                new ForkTsCheckerWebpackPlugin({
                    checkSyntacticErrors: true,
                    tsconfig: path.resolve(process.cwd(), `packages/${config.package}/tsconfig.json`),
                    tslint: true,
                    /*formatter: "codeframe",*/
                    logger: (() => {
                        const logger = new Logger(config.package);
                        return {
                            error: logger.error.bind(logger),
                            warn: logger.warn.bind(logger),
                            info: logger.log.bind(logger)
                        };
                    })()
                }),

                new CopyWebpackPlugin([
                    {from: path.resolve(process.cwd(), `node_modules/@simplism/pack/assets/public`)}
                ])
            ],


            externals: [
                (context, request, callback) => {
                    if (serverConfig && new RegExp(serverConfig.package + "[\\\\\\/]src").test(request)) {
                        const classFileName = path.basename(request);
                        const className = classFileName[0].toUpperCase() + classFileName.slice(1).replace(/\.[a-z]/g, matched => matched[1].toUpperCase());
                        return callback(undefined, `{${className}: {name: '${className}'}} /*${Uuid.newUuid()}*/`);
                    }
                    else if (["fs", "fs-extra", "path"].includes(request)) {
                        return callback(undefined, `"${request}"`);
                    }
                    callback(undefined, undefined);
                }
            ]
        };
    }
}