import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as fs from "fs-extra";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as path from "path";
import * as webpack from "webpack";
import * as WebpackDevServer from "webpack-dev-server";
import * as glob from "glob";
import * as child_process from "child_process";
import * as chokidar from "chokidar";
import {ISimpackClientConfig, ISimpackConfig, ISimpackServerConfig} from "../commons/ISimpackConfig";
import {SdTypescriptDtsPlugin} from "../plugins/SdTypescriptDtsPlugin";
import {Logger} from "../../../sd-core/src";

export class SdPackageBuilder {
    private _logger = new Logger("@simplism/sd-pack", `SdPackageBuilder :: ${this._packageName}`);

    private _root(...args: string[]): string {
        return path.resolve.apply(path, [process.cwd(), `packages/${this._packageName}`].concat(args));
    }

    public constructor(private _packageName: string) {
    }

    public async runAsync(config: ISimpackConfig | undefined, watch: boolean): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this._logger.log(`빌드 시작`);

            let packageJson;
            if (fs.existsSync(this._root("package.json"))) {
                packageJson = fs.readJsonSync(this._root("package.json"));
            }

            const isLibrary = !!packageJson;
            const isAngular = (config && config.type === "client") || (packageJson && packageJson.peerDependencies && Object.keys(packageJson.peerDependencies).some((dep) => dep.startsWith("@angular")));

            if (isLibrary) {
                fs.removeSync(this._root("dist"));
            }

            if (!isLibrary && !isAngular) {
                this._generateServerDefinitionsFile();

                if (watch) {
                    chokidar.watch(this._root("src/**/*Service.ts").replace(/\\/g, "/"))
                        .on("add", () => {
                            this._generateServerDefinitionsFile();
                        })
                        .on("unlink", () => {
                            this._generateServerDefinitionsFile();
                        });
                }
            }

            if (!isLibrary && isAngular) {
                this._generateClientDefinitionsFile((config as ISimpackClientConfig).defaultRoute);

                if (watch) {
                    chokidar.watch(this._root("src/**/*.ts").replace(/\\/g, "/"))
                        .on("add", () => {
                            this._generateClientDefinitionsFile((config as ISimpackClientConfig).defaultRoute);
                        })
                        .on("unlink", () => {
                            this._generateClientDefinitionsFile((config as ISimpackClientConfig).defaultRoute);
                        });
                }
            }

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
                    const tsConfigJson = fs.readJsonSync(this._root("tsconfig.json"));
                    for (const fileName of tsConfigJson.files) {
                        const basename = path.basename(fileName, path.extname(fileName));
                        result[basename] = this._root(fileName);
                    }

                    return result;
                }
                else if (config!.type === "client") {
                    return {
                        app: [
                            ...watch
                                ? [
                                    `webpack-dev-server/client?http://${(config as ISimpackClientConfig).host}:${(config as ISimpackClientConfig).port}/`,
                                    `webpack/hot/only-dev-server`
                                ]
                                : [],
                            path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/app.ts")
                        ]
                    };
                }
                else if (config!.type === "server") {
                    return {
                        app: path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/server/app.ts")
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

                ...(!isLibrary && isAngular)
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
                                        test: /[\\/]node_modules[\\/]@simplism/,
                                        name: "simplism",
                                        chunks: "initial",
                                        enforce: true
                                    }
                                }
                            },
                            minimize: false
                        }
                    }
                    : {
                        optimization: {
                            minimize: false
                        }
                    },

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

                        {
                            test: /\.ts$/,
                            loader: "happypack/loader?id=ts",
                            exclude: /node_modules[\\/](?!@simplism)/,
                        },

                        ...!isLibrary
                            ? [
                                {
                                    test: /\.js$/,
                                    use: ["source-map-loader"],
                                    exclude: /node_modules[\\/](?!@simplism)/,
                                    enforce: "pre"
                                },
                                {
                                    test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
                                    use: "file-loader?name=assets/[name].[hash].[ext]"
                                }
                            ]
                            : [],

                        ...isAngular
                            ? [
                                {
                                    test: /\.html$/,
                                    use: "html-loader"
                                },
                                {
                                    test: /\.pcss$/,
                                    include: /[\\\/]src[\\\/]/,
                                    use: [
                                        "to-string-loader",
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
                                },
                                {
                                    test: /\.pcss$/,
                                    exclude: /[\\\/]src[\\\/]/,
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
                                },
                                {
                                    test: /\.scss$/,
                                    use: [
                                        "style-loader",
                                        "css-loader?sourceMap",
                                        "sass-loader?sourceMap"
                                    ]
                                }
                            ]
                            : [],

                        ...(!isLibrary && !isAngular)
                            ? [

                                {
                                    test: /\.node$/,
                                    use: path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/loaders/node-loader.js")
                                }
                            ]
                            : []
                    ]
                },
                plugins: [
                    new (require("happypack"))({
                        id: "ts",
                        verbose: false,
                        loaders: [
                            {
                                loader: "ts-loader",
                                options: {silent: true, happyPackMode: true, configFile: this._root("tsconfig.json")}
                            },
                            ...isAngular ? ["angular2-template-loader"] : []
                        ]
                    }),

                    /*...!isLibrary ? [
                        new (require("hard-source-webpack-plugin"))()
                    ] : [],*/

                    new SdTypescriptDtsPlugin({context: this._root(), logger: this._logger}),

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
                                /^APP_PAGE_PATH$/,
                                this._root("src/AppPage.ts")
                            ),

                            new HtmlWebpackPlugin({
                                template: path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/index.ejs"),
                                NODE_ENV: eval(`process.env.NODE_ENV`),
                                PACKAGE_NAME: this._packageName,
                                TITLE: (config as ISimpackClientConfig).title
                            }),

                            new CopyWebpackPlugin([
                                {from: path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/public")}
                            ]),

                            new webpack.ProvidePlugin({
                                $: "jquery",
                                jQuery: "jquery",
                                JQuery: "jquery"
                            }),

                            new webpack.DefinePlugin({
                                "process.env": this._stringifyEnv({
                                    SD_PACK_TITLE: (config as ISimpackClientConfig).title,
                                    SD_PACK_SERVER_HOST: (config as ISimpackClientConfig).server.host,
                                    SD_PACK_SERVER_PORT: (config as ISimpackClientConfig).server.port.toString(),
                                    SD_PACK_VERSION: fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version,
                                    ...(config as ISimpackClientConfig).env
                                })
                            }),
                        ]
                        : [],

                    ...(!isLibrary && isAngular && watch)
                        ? [new webpack.HotModuleReplacementPlugin()]
                        : [],

                    ...(!isLibrary && !isAngular)
                        ? [
                            new webpack.NormalModuleReplacementPlugin(
                                /^APP_ENTRY_PATH$/,
                                this._root("src/AppEntry.ts")
                            ),

                            new webpack.DefinePlugin({
                                "process.env": this._stringifyEnv({
                                    SD_PACK_HOST: (config as ISimpackServerConfig).host,
                                    SD_PACK_PORT: (config as ISimpackServerConfig).port.toString(),
                                    SD_PACK_CLIENTS: (config as ISimpackServerConfig).clients.join("|"),
                                    ...(config as ISimpackServerConfig).env
                                })
                            }),

                            new webpack.NormalModuleReplacementPlugin(
                                /^socket.io$/,
                                path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/replacements/socket.io.js")
                            ),

                            new webpack.NormalModuleReplacementPlugin(
                                /^bindings$/,
                                path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/replacements/bindings.js")
                            )
                        ]
                        : []
                ],
                externals: [
                    (context, request, callback) => {
                        request = request.split("!").last();

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

                            if (isAngular && ["fs", "fs-extra", "path", "socket.io"].includes(request)) {
                                return callback(undefined, `"${request}"`);
                            }
                        }

                        callback(undefined, undefined);
                    },
                    "uws"
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
                    this._logger.info(`빌드 완료: http://${(config as ISimpackClientConfig).host}:${(config as ISimpackClientConfig).port}`);
                }
                else {
                    this._logger.info("빌드 완료");
                }
                resolve();
            };

            if (!isLibrary && !isAngular && watch) {
                let spawnProcess: child_process.ChildProcess | undefined;
                compiler.hooks.done.tap(this.constructor.name, () => {
                    try {
                        if (spawnProcess) {
                            child_process.spawnSync("taskkill", ["/F", "/T", "/PID", spawnProcess.pid.toString()], {
                                stdio: "pipe",
                                shell: true
                            });
                            spawnProcess = undefined;
                        }

                        spawnProcess = child_process.spawn("node", ["-r", "source-map-support/register", "app.js"], {
                            stdio: "pipe",
                            shell: true,
                            cwd: path.resolve(process.cwd(), `dist`)
                        });
                        spawnProcess.stdout.on("data", (data) => {
                            if (data.toString().trim()) {
                                console.log(data.toString().trim());
                            }
                        });
                        spawnProcess.stderr.on("data", (data) => {
                            if (data.toString().trim()) {
                                console.error(data.toString().trim());
                            }
                        });
                    }
                    catch (err) {
                        this._logger.error(err);
                        throw err;
                    }
                });
            }

            /*if (isLibrary) {
                compiler.hooks.afterEmit.tap(this.constructor.name, () => {
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
            }*/

            if (watch) {
                if (!isLibrary && isAngular) {
                    const server = new WebpackDevServer(compiler, {
                        hot: true,
                        inline: true,
                        quiet: true
                    });
                    server.listen((config as ISimpackClientConfig).port, (config as ISimpackClientConfig).host);
                    compiler.hooks.failed.tap(this._packageName, (error) => onCompileComplete(error, undefined));
                    compiler.hooks.done.tap(this._packageName, (stats) => onCompileComplete(undefined, stats));
                }
                else {
                    compiler.watch({}, onCompileComplete.bind(this));
                }
                compiler.hooks.watchRun.tap(this.constructor.name, () => {
                    this._logger.log(`변경 감지`);
                });
            }
            else {
                compiler.run(onCompileComplete.bind(this));
            }
        });
    }

    private _generateServerDefinitionsFile(): void {
        let importString = ``;

        const services: string[] = [];
        const serviceFilePaths = glob.sync(this._root("src/**/*Service.ts"))
            .orderBy((item) => item.split(/[\\\/]/g).length);
        for (const serviceFilePath of serviceFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/server"), serviceFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last()!.slice(0, -3);
            services.push(typeName);
            importString += `import {${typeName}} from "${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        fs.writeFileSync(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/server/definitions.ts"), `${importString}
const services: any[] = ${JSON.stringify(services, undefined, 4).replace(/"/g, "")};
export {services};`);

        /*const dt = new Date().addSeconds(-1);
        fs.utimesSync(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/server/definitions.ts"), dt, dt);*/
    }

    private _generateClientDefinitionsFile(defaultRoute: string): void {
        let importString = `import {SimgularHelpers, SdCanDeactivateGuardProvider} from "@simplism/sd-angular";\r\n`;
        const routes: any[] = [
            {path: "", redirectTo: defaultRoute, pathMatch: "full"}
        ];

        const routeFilePaths = glob.sync(this._root("src/routes/**/*Page.ts")).orderBy((item) => item.split(/[\\\/]/g).length);

        for (const routeFilePath of routeFilePaths) {
            const relativePath = path.relative(this._root("src/routes"), routeFilePath);

            const splitList = relativePath.split(/[\\\/]/g);
            let parentChildren = routes;
            for (const splitItem of splitList) {
                if (!splitItem.match(/Page\.ts$/)) {
                    let parent = parentChildren.single((item) => item.path === splitItem);
                    if (!parent) {
                        parent = {
                            path: splitItem
                        };
                        parentChildren.push(parent);
                    }

                    if (!parent.children) {
                        parent.children = [];
                    }
                    parentChildren = parent.children;
                }
                else {
                    const typeName = splitItem.slice(0, -3);
                    parentChildren.push({
                        path: typeName[0].toLowerCase() + typeName.slice(1, -4).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
                        component: typeName,
                        canDeactivate: "[SdCanDeactivateGuardProvider]"
                    });

                    const importRelativePath = path.relative(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client"), routeFilePath);
                    importString += `import {${typeName}} from "${importRelativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
                }
            }
        }

        const routeString = JSON.stringify(routes, undefined, 4)
            .replace(/"component": ".*"/g, (item) => `"component": ${item.slice(14, -1)}`)
            .replace(/"\[SdCanDeactivateGuardProvider]"/g, () => `[SdCanDeactivateGuardProvider]`)
            .replace(/"(.*)":/g, (...args: string[]) => {
                return `${args[1]}:`;
            });

        const controls: string[] = [];
        const controlFilePaths = glob.sync(this._root("src", "**", "*Control.ts"))
            .orderBy((item) => item.split(/[\\\/]/g).length);
        for (const controlFilePath of controlFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client"), controlFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last()!.slice(0, -3);
            controls.push(typeName);
            importString += `import {${typeName}} from "${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        const components: string[] = [];
        const componentFilePaths = glob.sync(this._root("src", "**", "*Component.ts"))
            .orderBy((item) => item.split(/[\\\/]/g).length);
        for (const componentFilePath of componentFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client"), componentFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last()!.slice(0, -3);
            components.push(typeName);
            importString += `import {${typeName}} from "${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        const modals: string[] = [];
        const modalFilePaths = glob.sync(this._root("src/**/*Modal.ts"))
            .orderBy((item) => item.split(/[\\\/]/g).length);
        for (const modalFilePath of modalFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client"), modalFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last()!.slice(0, -3);
            modals.push(typeName);
            importString += `import {${typeName}} from "${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        const printTemplates: string[] = [];
        const printTemplateFilePaths = glob.sync(this._root("src/**/*PrintTemplate.ts"))
            .orderBy((item) => item.split(/[\\\/]/g).length);
        for (const printTemplateFilePath of printTemplateFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client"), printTemplateFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last()!.slice(0, -3);
            printTemplates.push(typeName);
            importString += `import {${typeName}} from "${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        const providers: string[] = [];
        const providerFilePaths = glob.sync(this._root("src", "**", "*Provider.ts"))
            .orderBy((item) => item.split(/[\\\/]/g).length);
        for (const providerFilePath of providerFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client"), providerFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last()!.slice(0, -3);
            providers.push(typeName);
            importString += `import {${typeName}} from "${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        fs.writeFileSync(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/definitions.ts"), `${importString}
const routes: any[] = ${routeString};

const routeDeclarations: any[] = SimgularHelpers.getRouteDeclarations(routes);

const controls: any[] = ${JSON.stringify(controls, undefined, 4).replace(/"/g, "")};

const components: any[] = ${JSON.stringify(components, undefined, 4).replace(/"/g, "")};

const modals: any[] = ${JSON.stringify(modals, undefined, 4).replace(/"/g, "")};

const printTemplates: any[] = ${JSON.stringify(printTemplates, undefined, 4).replace(/"/g, "")};

const providers: any[] = ${JSON.stringify(providers, undefined, 4).replace(/"/g, "")};

export {routes, routeDeclarations, controls, components, modals, printTemplates, providers};`);

        /*const dt = new Date().addSeconds(-1);
        fs.utimesSync(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/definitions.ts"), dt, dt);*/
    }

    private _stringifyEnv(param: { [key: string]: string | undefined }): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        for (const key of Object.keys(param)) {
            result[key] = param[key] == undefined ? "undefined" : JSON.stringify(param[key]);
        }
        return result;
    }
}
