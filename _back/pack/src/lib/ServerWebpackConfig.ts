import * as path from "path";
import * as webpack from "webpack";
import {ISimpackConfig} from "./ISimpackConfig";
import * as webpackMerge from "webpack-merge";
import * as fs from "fs-extra";
import {Logger, Safe} from "@simplism/core";

// tslint:disable-next-line:variable-name
const HappyPack = require("happypack");
// tslint:disable-next-line:variable-name
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

export class ServerWebpackConfig {
    static getForBuild(config: ISimpackConfig, env: string | undefined): webpack.Configuration {
        return webpackMerge(this._getCommon(config), {
            mode: "production",
            optimization: {
                noEmitOnErrors: true
            },

            plugins: [
                new webpack.DefinePlugin({
                    "process.env": {
                        SD_ENV: env ? JSON.stringify(env) : "undefined",
                        NODE_ENV: JSON.stringify("production"),
                        VERSION: JSON.stringify(fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version),
                        SOCKET_SERVER_PORT: JSON.stringify(config.server.port),
                        CLIENTS: JSON.stringify(Safe.arr(config.clients).filter(item => !item.cordova).map(item => item.name))
                    }
                })
            ]
        });
    }

    static getForStart(config: ISimpackConfig, env: string | undefined): webpack.Configuration {
        return webpackMerge(this._getCommon(config), {
            mode: "development",

            plugins: [
                /*new WebpackWatchTimefixPlugin(),*/

                new webpack.DefinePlugin({
                    "process.env": {
                        SD_ENV: env ? JSON.stringify(env) : "undefined",
                        NODE_ENV: JSON.stringify("development"),
                        VERSION: JSON.stringify(fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version),
                        SOCKET_SERVER_PORT: JSON.stringify(config.server.port),
                        CLIENTS: JSON.stringify(Safe.arr(config.clients).filter(item => !item.cordova).map(item => item.name))
                    }
                })
            ]
        });
    }

    private static _getCommon(config: ISimpackConfig): webpack.Configuration {
        return {
            target: "node",
            devtool: "source-map",

            entry: {
                app: path.resolve(process.cwd(), "packages", config.server.package, "src", "App.ts")
            },

            output: {
                path: config.dist,
                filename: "[name].js",
                chunkFilename: "[id].chunk.js"
            },

            resolve: {
                extensions: [".ts", ".js", ".json", ".node"]
            },

            module: {
                rules: [
                    {
                        test: /\.js$/,
                        use: ["source-map-loader"],
                        exclude: /reflect-metadata/,
                        enforce: "pre"
                    },
                    {
                        test: /\.ts$/,
                        loader: "happypack/loader?id=ts",
                        exclude: /node_modules/
                    },
                    {
                        test: /\.node$/,
                        use: require.resolve(path.resolve(process.cwd(), "node_modules/@simplism/pack/loaders/node-loader.js"))
                    },
                    {
                        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx|docx|pptx|pdf|apk|txt|hwp|sql)$/,
                        use: "file-loader?name=assets/[name].[hash].[ext]"
                    }
                ]
            },

            plugins: [
                new webpack.NormalModuleReplacementPlugin(
                    /^socket.io$/,
                    require.resolve(path.resolve(process.cwd(), "node_modules/@simplism/pack/replacements/socket.io.js"))
                ),

                new webpack.NormalModuleReplacementPlugin(
                    /^bindings$/,
                    require.resolve(path.resolve(process.cwd(), "node_modules/@simplism/pack/replacements/bindings.js"))
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
                    tsconfig: path.resolve(process.cwd(), `packages/${config.server.package}/tsconfig.json`),
                    tslint: true,
                    /*formatter: "codeframe",*/
                    logger: (() => {
                        const logger = new Logger(config.server.package);
                        return {
                            error: logger.error.bind(logger),
                            warn: logger.warn.bind(logger),
                            info: logger.log.bind(logger)
                        };
                    })()
                })
            ],

            externals: ["uws"]
        };
    }
}