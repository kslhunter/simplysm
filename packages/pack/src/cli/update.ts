import * as path from "path";
import * as fs from "fs-extra";
import {FileWatcher} from "../lib/FileWatcher";
import {Logger} from "@simplism/core";

export async function update(argv: { path: string; watch: boolean }): Promise<void> {
    const logger = new Logger("simpack.update");

    const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const dependencies = {
        ...packageConfig.dependencies,
        ...packageConfig.devDependencies
    };

    const simplismPackageNames = Object.keys(dependencies).filter(item => item.startsWith("@simplism"));

    const sourcesPath = path.resolve(process.cwd(), argv.path);

    for (const simplismPackageName of simplismPackageNames) {
        const logTitle = simplismPackageName.split("/").slice(-1)[0].padEnd(15, " ");

        const sourcePackagePath = path.resolve(sourcesPath, "packages", simplismPackageName.split("/")[1]);
        if (fs.existsSync(sourcePackagePath)) {

            const targetPackagePath = path.resolve(process.cwd(), "node_modules", simplismPackageName);

            const subDirNames = fs.readdirSync(sourcePackagePath).filter(fileName => fs.lstatSync(path.resolve(sourcePackagePath, fileName)).isDirectory());
            for (const subDirName of subDirNames) {
                fs.removeSync(path.resolve(targetPackagePath, subDirName));
                fs.copySync(
                    path.resolve(sourcePackagePath, subDirName),
                    path.resolve(targetPackagePath, subDirName)
                );
            }

            if (argv.watch) {
                FileWatcher.watch(
                    path.resolve(sourcePackagePath, "**", "*"),
                    {},
                    async (events) => {
                        if (events.every(item => item.type === "ready")) {
                            logger.info(`${logTitle}: 변경감지`);
                            return;
                        }


                        logger.warn(`${logTitle}: 변경감지`);
                        const targetPackagePath = path.resolve(process.cwd(), "node_modules", simplismPackageName);

                        for (const event of events) {
                            logger.log(`${logTitle}: ${event.type.padEnd(8, " ")}: ${event.filePath}`);
                            if (event.type === "unlink") {
                                const sourceFilePath = event.filePath!;
                                const relativeChangedFilePath = path.relative(sourcePackagePath, sourceFilePath);
                                const targetFilePath = path.resolve(targetPackagePath, relativeChangedFilePath);

                                await fs.remove(targetFilePath);
                            }
                            else {
                                const sourceFilePath = event.filePath!;
                                const relativeChangedFilePath = path.relative(sourcePackagePath, sourceFilePath);
                                const targetFilePath = path.resolve(targetPackagePath, relativeChangedFilePath);

                                await fs.copy(sourceFilePath, targetFilePath);
                            }
                        }

                        logger.warn(`${logTitle}: 업데이트됨`);
                    }
                );
            }
        }
    }
}
