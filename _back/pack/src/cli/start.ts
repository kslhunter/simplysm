import * as path from "path";
import {ISimpackConfig} from "../lib/ISimpackConfig";
import {ServerBuilder} from "../lib/ServerBuilder";
import {ClientBuilder} from "../lib/ClientBuilder";
import {host} from "../lib/helpers";
import {DatabaseFileGenerator} from "../lib/DatabaseFileGenerator";
import * as fs from "fs-extra";

export async function start(argv: { config: string; env: string | undefined; client: string | undefined; serverOnly: boolean | undefined; databaseOnly: boolean | undefined }): Promise<void> {
    process.env.NODE_ENV = "development";
    process.env.SD_ENV = argv.env;

    require("ts-node/register");
    const configPath = path.resolve(process.cwd(), argv.config);
    const config: ISimpackConfig = require(configPath);
    if (config.server) {
        config.server.host = host(config.server.host);
    }

    fs.removeSync(config.dist);
    fs.mkdirsSync(config.dist);

    if (config.databases) {
        for (const databaseConfig of config.databases) {
            //-- 모델 변경 감지 (데이타베이스 파일 생성)
            await DatabaseFileGenerator.watchModelFirst(databaseConfig);
        }
    }


    //-- 서버 코드 변경 감지 (tslint 수행 및 서버 재시작)
    if (!argv.databaseOnly && config.server) {
        await ServerBuilder.watch(config, argv.env);
    }

    if (!argv.databaseOnly && !argv.serverOnly && config.clients) {
        for (const clientConfig of config.clients) {
            if (argv.client && clientConfig.package !== argv.client) {
                continue;
            }

            //-- 클라이언트 코드 변경 감지 (Webpack watch - live reload 수행)
            await ClientBuilder.watch(clientConfig, config.server, argv.env, config.dist);
        }
    }
}