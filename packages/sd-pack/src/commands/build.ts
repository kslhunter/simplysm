import * as fs from "fs-extra";
import * as path from "path";
import {SdLocalUpdater} from "../builders/SdLocalUpdater";
import {SdPackageBuilder} from "../builders/SdPackageBuilder";
import {ISimpackConfig} from "../commons/ISimpackConfig";
import {SdModelGenerator} from "../builders/SdModelGenerator";

export async function build(argv: { watch: boolean; env: { [key: string]: any }; production: boolean; package: string }): Promise<void> {
    Object.assign(process.env, argv.env);
    eval(`process.env.NODE_ENV = argv.production ? "production" : "development"`);

    const promiseList: Promise<void>[] = [];
    if (
        argv.watch &&
        path.basename(process.cwd()) !== "simplism" &&
        fs.existsSync(path.resolve(process.cwd(), "../simplism"))
    ) {
        const rootPackageJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
        const dependencySimplismPackageNameList = [
            ...rootPackageJson.dependencies ? Object.keys(rootPackageJson.dependencies) : [],
            ...rootPackageJson.devDependencies ? Object.keys(rootPackageJson.devDependencies) : []
        ].filter((item) => item.startsWith("@simplism")).map((item) => item.slice(10));

        for (const dependencySimplismPackageName of dependencySimplismPackageNameList) {
            promiseList.push(new SdLocalUpdater(dependencySimplismPackageName).runAsync(true));
        }
    }

    const runBuildAsync = (packageName: string) => {
        const configFilePath = path.resolve(process.cwd(), "packages", packageName, "sd.config.ts");
        let config: ISimpackConfig | undefined;
        if (fs.existsSync(configFilePath)) {
            eval(`require("ts-node/register")`);
            if (!configFilePath) throw new Error();
            config = eval(`require(configFilePath)`);
            config!["env"] = {
                ...config!["env"] || {},
                ...argv.env
            };
        }

        if (config && config.type === "model") {
            promiseList.push(new SdModelGenerator(packageName).runAsync(config, argv.watch));
        }
        else {
            promiseList.push(new SdPackageBuilder(packageName).runAsync(config, argv.watch));
        }
    };

    if (!argv.package) {
        for (const packageName of fs.readdirSync(path.resolve(process.cwd(), `packages`))) {
            await runBuildAsync(packageName);
        }
    }
    else {
        await runBuildAsync(argv.package);
    }
    await Promise.all(promiseList);

}