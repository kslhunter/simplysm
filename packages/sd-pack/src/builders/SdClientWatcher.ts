import {Logger} from "../../../sd-core/src/utils/Logger";
import * as path from "path";
import {ISimpackClientConfig} from "../commons/ISimpackConfig";
import * as chokidar from "chokidar";
import * as glob from "glob";
import * as fs from "fs-extra";
import * as webpack from "webpack";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";

export class SdClientBuilder {
    private readonly _logger: Logger;

    public constructor(private _packageName: string) {
        this._logger = new Logger("@simplism/sd-pack", `${this.constructor.name} :: ${this._packageName}`);
    }

    private _root(...args: string[]): string {
        return path.resolve.apply(path, [process.cwd(), `packages/${this._packageName}`].concat(args));
    }

    public async runAsync(config: ISimpackClientConfig, watch: boolean): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this._logger.log(`빌드 시작`);

            this._generateClientDefinitionsFile((config as ISimpackClientConfig).defaultRoute);

            if (watch) {
                chokidar.watch(this._root("src/**/*.ts").replace(/\\/g, "/"))
                    .on("add", () => {
                        this._generateClientDefinitionsFile(config.defaultRoute);
                    })
                    .on("unlink", () => {
                        this._generateClientDefinitionsFile(config.defaultRoute);
                    });
            }

            const webpackConfig: webpack.Configuration = {
                context: this._root(),

                entry: {
                    app: [
                        `webpack-dev-server/client?http://${config.host}:${config.port}/`,
                        `webpack/hot/only-dev-server`,
                        path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/app.ts")
                    ]
                },

                devtool: "source-map",

                mode: process.env.NODE_ENV,

                resolve: {
                    extensions: [".ts", ".js", ".json"]
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
                            enforce: "pre",
                            use: ["source-map-loader"],
                            exclude: /node_modules[\\/](?!@simplism)/
                        },
                        {
                            test: /\.ts$/,
                            enforce: "pre",
                            loader: "tslint-loader",
                            exclude: /node_modules[\\/](?!@simplism)/,
                        },
                        {
                            test: /\.ts$/,
                            loaders: [
                                {
                                    loader: "awesome-typescript-loader",
                                    options: {
                                        useCache: true,
                                        forceIsolatedModules: true
                                    }
                                }
                                , "angular2-template-loader"
                            ],
                            exclude: /node_modules[\\/](?!@simplism)/,
                        },
                        {
                            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
                            use: "file-loader?name=assets/[name].[hash].[ext]"
                        },
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
                            test: /\.scss$/,
                            use: [
                                "style-loader",
                                "css-loader?sourceMap",
                                "sass-loader?sourceMap"
                            ]
                        }
                    ]
                },

                plugins: [
                    new (require("hard-source-webpack-plugin"))(),

                    new webpack.ContextReplacementPlugin(
                        /angular[\\/]core[\\/](@angular|esm5|fesm5)/,
                        this._root("src"),
                        {}
                    ),

                    new CopyWebpackPlugin([
                        {from: path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/public")}
                    ]),

                    new webpack.ProvidePlugin({
                        $: "jquery",
                        jQuery: "jquery",
                        JQuery: "jquery"
                    }),

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

                    new webpack.DefinePlugin({
                        "process.env": this._stringifyEnv({
                            SD_PACK_TITLE: (config as ISimpackClientConfig).title,
                            SD_PACK_SERVER_HOST: (config as ISimpackClientConfig).server.host,
                            SD_PACK_SERVER_PORT: (config as ISimpackClientConfig).server.port.toString(),
                            SD_PACK_VERSION: fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version,
                            ...(config as ISimpackClientConfig).env
                        })
                    }),
                ],

                optimization: {
                    noEmitOnErrors: process.env.NODE_ENV === "production",
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
                    }
                }
            };
        });
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

const modals: any[] = ${JSON.stringify(modals, undefined, 4).replace(/"/g, "")};

const printTemplates: any[] = ${JSON.stringify(printTemplates, undefined, 4).replace(/"/g, "")};

const providers: any[] = ${JSON.stringify(providers, undefined, 4).replace(/"/g, "")};

export {routes, routeDeclarations, controls, modals, printTemplates, providers};`);

        /*const dt = new Date().addSeconds(-1);
        fs.utimesSync(path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/client/definitions.ts"), dt, dt);*/
    }
}