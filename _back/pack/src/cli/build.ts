import {ISimpackConfig} from "../lib/ISimpackConfig";
import {host} from "../lib/helpers";
import * as path from "path";
import * as fs from "fs-extra";
import {ServerBuilder} from "../lib/ServerBuilder";
import {ClientBuilder} from "../lib/ClientBuilder";
import {spawnSync} from "child_process";
import {DatabaseFileGenerator} from "../lib/DatabaseFileGenerator";
import * as semver from "semver";

export async function build(argv: { config: string; env: string | undefined }): Promise<void> {
    const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const newVersion = semver.inc(packageConfig.version, "patch")!;
    spawnSync("yarn", ["version", "--new-version", newVersion], {
        shell: true,
        stdio: "inherit"
    });

    process.env.NODE_ENV = "production";
    process.env.SD_ENV = argv.env;

    require("ts-node/register");
    const configPath = path.resolve(process.cwd(), argv.config);
    const config: ISimpackConfig = require(configPath);

    if (config.server) {
        config.server.host = host(config.server.host);
    }

    if (config.databases) {
        for (const databaseConfig of config.databases) {
            await DatabaseFileGenerator.generateModelFirst(databaseConfig);
        }
    }

    fs.removeSync(config.dist);
    fs.mkdirsSync(config.dist);

    //-- 서버 빌드
    if (config.server) {
        await ServerBuilder.build(config, argv.env);
    }

    if (config.clients) {
        for (const clientConfig of config.clients) {
            //-- 클라이언트 빌드
            await ClientBuilder.build(clientConfig, config.server, argv.env, config.dist);
        }
    }
}