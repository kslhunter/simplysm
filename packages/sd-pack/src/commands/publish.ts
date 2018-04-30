import {spawnSync} from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import {SdPackagePublisher} from "../builders/SdPackagePublisher";
import {ISimpackConfig} from "../commons/ISimpackConfig";

export async function publish(argv: { env: { [key: string]: any } }): Promise<void> {
    Object.assign(process.env, argv.env);

    const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const newVersion = semver.inc(packageConfig.version, "patch")!;
    spawnSync("yarn", ["version", "--new-version", newVersion], {
        shell: true,
        stdio: "inherit"
    });

    const promiseList: Promise<void>[] = [];
    for (const packageName of fs.readdirSync(path.resolve(process.cwd(), `packages`))) {
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

        promiseList.push(new SdPackagePublisher(packageName).runAsync(config));
    }
    await Promise.all(promiseList);
}