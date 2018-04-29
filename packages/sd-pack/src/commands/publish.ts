import {spawnSync} from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import {SimpackPublisher} from "../builders/SimpackPublisher";

export async function publish(): Promise<void> {
    const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const newVersion = semver.inc(packageConfig.version, "patch")!;
    spawnSync("yarn", ["version", "--new-version", newVersion], {
        shell: true,
        stdio: "inherit"
    });

    const promiseList: Promise<void>[] = [];
    for (const packageName of fs.readdirSync(path.resolve(process.cwd(), `packages`))) {
        promiseList.push(new SimpackPublisher(packageName).runAsync());
    }
    await Promise.all(promiseList);
}