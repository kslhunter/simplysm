import {ISimpackClientConfig, ISimpackServerConfig} from "./ISimpackConfig";
import {Logger} from "@simplism/core";
import * as path from "path";
import * as fs from "fs-extra";
import * as webpack from "webpack";
import {ClientWebpackConfig} from "./ClientWebpackConfig";
import * as childProcess from "child_process";
import {FileWatcher} from "./FileWatcher";
import * as glob from "glob";

export class ClientBuilder {
    static async watch(config: ISimpackClientConfig, serverConfig: ISimpackServerConfig, env: string | undefined, distPath: string): Promise<void> {
        const logger = Logger.getLogger(config.package);

        if (config.cordova) {
            this._initCordova(config);
        }

        return await new Promise<void>((resolve, reject) => {
            logger.info("감지시작");

            const clientDistPath = path.resolve(distPath, "www", config.package);
            fs.removeSync(clientDistPath);

            FileWatcher.watch(path.resolve(process.cwd(), "packages", config.package, "src", "(controls|modals|print-templates|providers|routes)", "**", "*.ts"), {}, async (events) => {
                if (!events.some(item => item.type === "ready" || item.type === "add" || item.type === "unlink")) {
                    return;
                }

                this._generateAppModuleDefinitionFile(config.package, config.defaultRoute);
            });

            const webpackConfig = ClientWebpackConfig.getForStart(config, serverConfig, env, clientDistPath);
            const compiler = webpack(webpackConfig);
            compiler.watch({
                aggregateTimeout: 300,
                poll: 1000
            }, (err, stats) => {
                if (err) {
                    reject();
                    return;
                }

                const info = stats.toJson();

                if (stats.hasErrors()) {
                    for (const error of info.errors) {
                        logger.error(error
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nERROR: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                if (stats.hasWarnings()) {
                    for (const warning of info.warnings) {
                        logger.warn(warning
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                logger.info(`빌드완료: http://${serverConfig.host}:${serverConfig.port}/${config.package}`);
                resolve();
            });
            compiler.hooks.watchRun.tap(config.package, () => {
                logger.info("변경감지");
            });
        });
    }

    static async build(config: ISimpackClientConfig, serverConfig: ISimpackServerConfig | undefined, env: string | undefined, distPath: string): Promise<void> {
        const logger = Logger.getLogger(config.package);

        if (config.cordova) {
            this._initCordova(config);
        }

        const clientDistPath = config.cordova ? path.resolve(process.cwd(), ".cordova", "www") : path.resolve(distPath, "www", config.package);
        fs.removeSync(clientDistPath);


        logger.info(`빌드시작`);
        this._generateAppModuleDefinitionFile(config.package, config.defaultRoute);

        const webpackConfig = ClientWebpackConfig.getForBuild(config, serverConfig, env, clientDistPath);
        const compiler = webpack(webpackConfig);
        await new Promise<void>((resolve, reject) => {
            compiler.run((err, stats) => {
                if (err) {
                    logger.error(err);
                    reject(err);
                    return;
                }

                const info = stats.toJson();

                if (stats.hasErrors()) {
                    for (const error of info.errors) {
                        logger.error(error
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nERROR: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                if (stats.hasWarnings()) {
                    for (const warning of info.warnings) {
                        logger.warn(warning
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                logger.info(`빌드 완료`);
                resolve();
            });
        });

        if (config.cordova) {
            logger.log(`CORDOVA  : 빌드`);

            if (config.cordova.platform === "android" && config.cordova.sign) {
                fs.copySync(config.cordova.sign, path.resolve(process.cwd(), ".cordova", "platforms", "android"));
            }

            if (config.cordova.icon) {
                fs.copySync(config.cordova.icon, path.resolve(process.cwd(), ".cordova", "res", "icon", "icon.png"));
            }

            const version = fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version;
            let configFileContent = fs.readFileSync(path.resolve(process.cwd(), ".cordova", "config.xml"), "utf-8");
            configFileContent = configFileContent.replace(/<allow-navigation href="[^"]"\s?\/>/g, "");
            configFileContent = configFileContent.replace(/version="[^"]*"/g, `version="${version}"`);
            if (config.cordova.icon && !configFileContent.includes("<icon")) {
                configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
            }
            fs.writeFileSync(path.resolve(process.cwd(), ".cordova", "config.xml"), configFileContent, "utf-8");

            const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");
            childProcess.spawnSync(cordovaBinPath, [
                "build",
                config.cordova.platform,
                "--release"
            ], {
                shell: true,
                stdio: "inherit",
                cwd: path.resolve(process.cwd(), ".cordova")
            });

            if (config.cordova.platform === "android") {
                fs.mkdirsSync(path.resolve(distPath, "www", "files", config.package));

                const packageVersion = fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version;
                const apkFileName = config.cordova.sign ? "app-release.apk" : "app-release-unsigned.apk";
                const distApkFileName = `${config.name.replace(/ /g, "_")}${config.cordova.sign ? "" : "-unsigned"}-v${packageVersion}.apk`;
                fs.copyFileSync(
                    path.resolve(process.cwd(), ".cordova", "platforms", "android", "app", "build", "outputs", "apk", "release", apkFileName),
                    path.resolve(distPath, "www", "files", config.package, distApkFileName)
                );
            }
        }
    }

    private static _initCordova(config: ISimpackClientConfig): void {
        const logger = Logger.getLogger(config.name);

        const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");
        if (!fs.existsSync(path.resolve(process.cwd(), ".cordova"))) {
            logger.log(`CORDOVA  : 프로젝트 생성`);
            childProcess.spawnSync(cordovaBinPath, [
                "create",
                ".cordova",
                config.cordova!.appId,
                `"${config.name}"`
            ], {
                shell: true,
                stdio: "inherit"
            });
        }

        fs.mkdirsSync(path.resolve(process.cwd(), ".cordova", "www"));

        if (!fs.existsSync(path.resolve(process.cwd(), ".cordova", "platforms", config.cordova!.platform))) {
            logger.log(`CORDOVA  : 플랫폼 생성    : ${config.cordova!.platform}`);
            childProcess.spawnSync(cordovaBinPath, [
                "platform",
                "add",
                config.cordova!.platform
            ], {
                shell: true,
                stdio: "inherit",
                cwd: path.resolve(process.cwd(), ".cordova")
            });
        }

        const prevPlugins = Object.values(fs.readJsonSync(path.resolve(process.cwd(), ".cordova", "plugins", "fetch.json"))).map(item => item["source"].id ? item["source"].id.replace(/@.*$/, "") : item["source"].url);

        // 에러 수정을 위한 플러그인 설치
        if (!prevPlugins.includes("cordova-android-support-gradle-release")) {
            logger.log(`CORDOVA  : 플러그인 설치  : cordova-android-support-gradle-release`);
            childProcess.spawnSync(cordovaBinPath, [
                "plugin",
                "add",
                "cordova-android-support-gradle-release"
            ], {
                shell: true,
                stdio: "inherit",
                cwd: path.resolve(process.cwd(), ".cordova")
            });
        }

        if (config.cordova!.plugins) {
            for (const plugin of config.cordova!.plugins!) {
                if (!prevPlugins.includes(plugin)) {
                    logger.log(`CORDOVA  : 플러그인 설치  : ${plugin}`);
                    childProcess.spawnSync(cordovaBinPath, [
                        "plugin",
                        "add",
                        plugin
                    ], {
                        shell: true,
                        stdio: "inherit",
                        cwd: path.resolve(process.cwd(), ".cordova")
                    });
                }
            }
        }
    }

    private static _generateAppModuleDefinitionFile(packageName: string, defaultRoute: string): void {
        let importString = `import {SimgularHelpers, SdCanDeactivateGuardProvider} from "@simplism/angular";\r\n`;
        const routes: any[] = [
            {path: "", redirectTo: defaultRoute, pathMatch: "full"}
        ];

        const routeFilePaths = glob.sync(path.resolve(process.cwd(), "packages", packageName, "src", "routes", "**", "*Page.ts"))
            .orderBy(item => item.split(/[\\\/]/g).length);

        for (const routeFilePath of routeFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "packages", packageName, "src", "routes"), routeFilePath);

            const splitList = relativePath.split(/[\\\/]/g);
            let parentChildren = routes;
            for (const splitItem of splitList) {
                if (!splitItem.match(/Page\.ts$/)) {
                    let parent = parentChildren.singleOr(undefined, item => item.path === splitItem);
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
                        path: typeName[0].toLowerCase() + typeName.slice(1, -4).replace(/[A-Z]/g, c => "-" + c.toLowerCase()),
                        component: typeName,
                        canDeactivate: "[SdCanDeactivateGuardProvider]"
                    });
                    importString += `import {${typeName}} from "./routes/${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
                }
            }
        }

        const routeString = JSON.stringify(routes, undefined, 4)
            .replace(/"component": ".*"/g, item => `"component": ${item.slice(14, -1)}`)
            .replace(/"\[SdCanDeactivateGuardProvider]"/g, () => `[SdCanDeactivateGuardProvider]`);


        const controls: string[] = [];
        const controlFilePaths = glob.sync(path.resolve(process.cwd(), "packages", packageName, "src", "**", "*Control.ts"))
            .orderBy(item => item.split(/[\\\/]/g).length);
        for (const controlFilePath of controlFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "packages", packageName, "src"), controlFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last().slice(0, -3);
            controls.push(typeName);
            importString += `import {${typeName}} from "./${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        const modals: string[] = [];
        const modalFilePaths = glob.sync(path.resolve(process.cwd(), "packages", packageName, "src", "**", "*Modal.ts"))
            .orderBy(item => item.split(/[\\\/]/g).length);
        for (const modalFilePath of modalFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "packages", packageName, "src"), modalFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last().slice(0, -3);
            modals.push(typeName);
            importString += `import {${typeName}} from "./${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        const printTemplates: string[] = [];
        const printTemplateFilePaths = glob.sync(path.resolve(process.cwd(), "packages", packageName, "src", "**", "*PrintTemplate.ts"))
            .orderBy(item => item.split(/[\\\/]/g).length);
        for (const printTemplateFilePath of printTemplateFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "packages", packageName, "src"), printTemplateFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last().slice(0, -3);
            printTemplates.push(typeName);
            importString += `import {${typeName}} from "./${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        const providers: string[] = [];
        const providerFilePaths = glob.sync(path.resolve(process.cwd(), "packages", packageName, "src", "**", "*Provider.ts"))
            .orderBy(item => item.split(/[\\\/]/g).length);
        for (const providerFilePath of providerFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), "packages", packageName, "src"), providerFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last().slice(0, -3);
            providers.push(typeName);
            importString += `import {${typeName}} from "./${relativePath.replace(/\\/g, "/").slice(0, -3)}";\r\n`;
        }

        fs.writeFileSync(path.resolve(process.cwd(), "packages", packageName, "src", "AppModuleDefinitions.ts"), `${importString}
const routes: any[] = ${routeString};

const routeDeclarations: any[] = SimgularHelpers.getRouteDeclarations(routes);

const controls: any[] = ${JSON.stringify(controls, undefined, 4).replace(/"/g, "")};

const modals: any[] = ${JSON.stringify(modals, undefined, 4).replace(/"/g, "")};

const printTemplates: any[] = ${JSON.stringify(printTemplates, undefined, 4).replace(/"/g, "")};

const providers: any[] = ${JSON.stringify(providers, undefined, 4).replace(/"/g, "")};

export {routes, routeDeclarations, controls, modals, printTemplates, providers};`);
    }
}