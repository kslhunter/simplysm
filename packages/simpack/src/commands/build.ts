import * as fs from "fs-extra";
import * as path from "path";
import {SimpackBuilder} from "../builders/SimpackBuilder";
import {SimpackLocalUpdater} from "../builders/SimpackLocalUpdater";

export async function build(argv: { watch: boolean }): Promise<void> {
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
            promiseList.push(new SimpackLocalUpdater(dependencySimplismPackageName).runAsync(true));
        }
    }

    for (const packageName of fs.readdirSync(path.resolve(process.cwd(), `packages`))) {
        promiseList.push(new SimpackBuilder(packageName).runAsync(argv.watch));
    }
    await Promise.all(promiseList);
}