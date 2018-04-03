import {TsLinter} from "../lib/TsLinter";
import * as path from "path";
import {ISimpackConfig} from "../lib/ISimpackConfig";
import {Logger} from "@simplism/core";
import * as fs from "fs";

export async function lint(argv: { config: string; fix: boolean }): Promise<void> {
    require("ts-node/register");
    const configPath = path.resolve(process.cwd(), argv.config);
    const config: ISimpackConfig = require(configPath);
    const packagePathList = [];

    const testsPath = path.resolve(process.cwd(), "tests");
    const testPath = path.resolve(process.cwd(), "test");
    const serverPath = path.resolve(process.cwd(), "packages", config.server.package);

    if (fs.existsSync(testsPath)) packagePathList.push(testsPath);
    if (fs.existsSync(testPath)) packagePathList.push(testPath);
    if (fs.existsSync(serverPath)) packagePathList.push(serverPath);

    if (config.clients && config.clients.length > 0) {
        for (const client of config.clients) {
            const clientPath = path.resolve(process.cwd(), "packages", client.package);
            if (fs.existsSync(clientPath)) {
                packagePathList.push(clientPath);
            }
        }
    }

    for (const projectPath of packagePathList) {
        Logger.getLogger("lint").log(projectPath);
        await TsLinter.lint(projectPath, argv.fix);
    }
}