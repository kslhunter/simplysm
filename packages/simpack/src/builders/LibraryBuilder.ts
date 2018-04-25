import * as fs from "fs-extra";
import * as path from "path";
import * as webpack from "webpack";
import "../../../core/src/extensions/ArrayExtensions";
import {Logger} from "../../../core/src/utils/Logger";

const HardSourceWebpackPlugin = require("hard-source-webpack-plugin"); // tslint:disable-line:variable-name

export class LibraryBuilder {
    private _logger = new Logger("simpack", `LibraryBuilder :: ${this._packageName}`);

    private _root(...args: string[]): string {
        return path.resolve.apply(path, [process.cwd(), `packages/${this._packageName}`].concat(args));
    }

    public constructor(private _packageName: string) {
    }

    public async runAsync(watch?: boolean): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            this._logger.log("빌드 시작");

            const nodeModules = fs.readdirSync(path.resolve(process.cwd(), "node_modules"))
                .filter((dir) => dir !== ".bin")
                .mapMany((dir) => dir.startsWith("@")
                    ? fs.readdirSync(path.resolve(process.cwd(), `node_modules/${dir}`))
                        .map((subDir) => path.join(dir, subDir).replace(/\\/g, "/"))
                    : [dir]
                );

            const packageJson = fs.readJsonSync(this._root("package.json"));

            const entry = (() => {
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
            })();

            const webpackConfig: webpack.Configuration = {
                target: packageJson.peerDependencies && Object.keys(packageJson.peerDependencies).some((dep) => dep.startsWith("@angular")) ? undefined : "node",
                devtool: "source-map",
                mode: watch ? "development" : "production",
                ...watch ? {
                    optimization: {
                        noEmitOnErrors: true
                    }
                } : {},
                entry,
                output: {
                    path: this._root(`dist`),
                    libraryTarget: "umd"
                },
                resolve: {
                    extensions: [".ts"]
                },
                module: {
                    rules: [
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
                                    loader: "awesome-typescript-loader",
                                    options: {
                                        configFileName: this._root("tsconfig.json"),
                                        silent: true,
                                        useCache: true,
                                        forceIsolatedModules: true
                                    }
                                },

                                ...packageJson.peerDependencies && Object.keys(packageJson.peerDependencies).some((dep) => dep.startsWith("@angular"))
                                    ? ["angular2-template-loader"]
                                    : []
                            ]
                        },

                        ...packageJson.peerDependencies && Object.keys(packageJson.peerDependencies).some((dep) => dep.startsWith("@angular"))
                            ? [
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
                    new HardSourceWebpackPlugin(),

                    ...packageJson.bin
                        ? [
                            new webpack.BannerPlugin({
                                banner: `#!/usr/bin/env node`,
                                raw: true,
                                entryOnly: true,
                                include: Object.keys(packageJson.bin).map((binName) => `${binName}.js`)
                            })
                        ]
                        : []
                ],
                externals: (context, request, callback) => {
                    if (nodeModules.includes(request)) {
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

                    callback(undefined, undefined);
                }
            };

            const compiler: webpack.Compiler = webpack(webpackConfig);
            const onCompileComplete: webpack.Compiler.Handler = (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }

                const info = stats.toJson();

                if (stats.hasWarnings()) {
                    for (const warning of info.warnings) {
                        this._logger.warn(
                            warning.replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]: `;
                            })
                        );
                    }
                }

                if (stats.hasErrors()) {
                    for (const error of info.errors) {
                        this._logger.error(
                            error.replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nERROR: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]: `;
                            })
                        );
                    }
                }

                this._logger.info("빌드 완료");
                resolve();
            };

            if (watch) {
                compiler.watch({}, onCompileComplete);
                compiler.hooks.watchRun.tap("LibraryBuilder", () => {
                    this._logger.log(`변경 감지`);
                });
            }
            else {
                compiler.run(onCompileComplete);
            }

            compiler.hooks.afterEmit.tap("LibraryBuilder", () => {
                if (fs.existsSync(this._root(`dist/${this._packageName}/src`))) {
                    fs.moveSync(this._root(`dist/${this._packageName}/src`), this._root(`dist/__${this._packageName}/src`));
                    fs.removeSync(this._root(`dist/${this._packageName}`));
                    fs.moveSync(this._root(`dist/__${this._packageName}/src`), this._root("dist"));
                    fs.removeSync(this._root(`dist/__${this._packageName}`));
                }
            });
        });
    }
}