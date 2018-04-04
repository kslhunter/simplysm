import * as path from "path";
import * as webpack from "webpack";
import {ISimpackClientConfig, ISimpackServerConfig} from "./ISimpackConfig";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import * as fs from "fs-extra";
import * as ExtractTextPlugin from "extract-text-webpack-plugin";
import {Uuid} from "@simplism/core";
import * as UglifyJsPlugin from "uglifyjs-webpack-plugin";

export class ClientWebpackConfig {
    static getForBuild(config: ISimpackClientConfig, serverConfig: ISimpackServerConfig | undefined, env: string | undefined, clientDistPath: string): webpack.Configuration {
        return webpackMerge(this._getCommon(config, serverConfig), {
            mode: "production",
            optimization: {
                noEmitOnErrors: true,
                minimizer: [
                    new UglifyJsPlugin({
                        uglifyOptions: {
                            keep_fnames: true
                        }
                    })
                ]
            },

            output: {
                path: clientDistPath,
                publicPath: config.cordova ? "/android_asset/www/" : undefined,
                filename: "[name].[hash].js",
                chunkFilename: "[id].[hash].js"
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

    static getForStart(config: ISimpackClientConfig, serverConfig: ISimpackServerConfig | undefined, env: string | undefined, clientDistPath: string): webpack.Configuration {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommon(config, serverConfig), {
            mode: "development",

            output: {
                path: clientDistPath,
                filename: "[name].js",
                chunkFilename: "[id].chunk.js"
            },

            plugins: [
                new ExtractTextPlugin("[name].css"),

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
                })
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

            entry: {
                "app": path.resolve(process.cwd(), "node_modules", "@simplism", "pack", "entry", "main.ts")
            },

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
                    },
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
                        }, "angular2-template-loader"]
                    },
                    {
                        test: /\.html$/,
                        use: "html-loader"
                    },
                    {
                        test: /\.scss$/,
                        exclude: /[\\\/]src[\\\/]/,
                        use: ExtractTextPlugin.extract({
                            fallback: "style-loader",
                            use: ["css-loader?sourceMap", "sass-loader?sourceMap"]
                        })
                    },
                    {
                        test: /\.scss$/,
                        include: /[\\\/]src[\\\/]/,
                        use: ["raw-loader", "sass-loader?sourceMap"]
                    },
                    {
                        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
                        use: "file-loader?name=assets/[name].[hash].[ext]"
                    }
                ]
            },

            plugins: [
                new webpack.ContextReplacementPlugin(
                    /angular(\\|\/)core(\\|\/)(@angular|esm5)/,
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
                )
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