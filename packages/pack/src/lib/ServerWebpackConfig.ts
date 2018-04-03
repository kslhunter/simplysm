import * as path from "path";
import * as webpack from "webpack";
import {ISimpackConfig} from "./ISimpackConfig";
import * as webpackMerge from "webpack-merge";
import * as fs from "fs-extra";
import {Safe} from "@simplism/core";

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
                        use: [
                            {
                                loader: "awesome-typescript-loader",
                                options: {
                                    configFileName: path.resolve(process.cwd(), "packages", config.server.package, "tsconfig.json"),
                                    silent: true
                                }
                            }
                        ]
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
                )
            ],

            externals: ["uws"]
        };
    }
}