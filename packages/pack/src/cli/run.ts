import {ISimpackConfig} from "../lib/ISimpackConfig";
import * as path from "path";
import * as fs from "fs-extra";
import * as childProcess from "child_process";
import {Exception, Safe} from "@simplism/core";
import {host} from "../lib/helpers";

export async function run(argv: { config: string; env: string; client: string; release: boolean; debug: boolean }): Promise<void> {
    process.env.NODE_ENV = "production";
    process.env.SD_ENV = argv.env;

    require("ts-node/register");
    const configPath = path.resolve(process.cwd(), argv.config);
    const config: ISimpackConfig = require(configPath);
    if (config.server) {
        config.server.host = host(config.server.host);
    }

    const clientConfig = Safe.arr(config.clients).singleOr(undefined, item => item.package === argv.client);
    if (!clientConfig) {
        throw new Exception("클라이언트 설정을 찾을 수 없습니다. [패키지: " + argv.client + "]");
    }

    const platform = Safe.obj(clientConfig.cordova).platform;
    if (clientConfig.cordova && platform === "android") {
        if (argv.release || argv.debug) {
            if (argv.release && clientConfig.cordova.platform === "android" && clientConfig.cordova.sign) {
                fs.copySync(clientConfig.cordova.sign, path.resolve(process.cwd(), ".cordova", "platforms", "android"));
            }

            let configFileContent = fs.readFileSync(path.resolve(process.cwd(), ".cordova", "config.xml"), "utf-8");
            configFileContent = configFileContent.replace(/<allow-navigation href="[^"]"\s?\/>/g, "");
            fs.writeFileSync(path.resolve(process.cwd(), ".cordova", "config.xml"), configFileContent, "utf-8");

            const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");
            childProcess.spawnSync(cordovaBinPath, [
                "run",
                clientConfig.cordova.platform,
                "--device",
                argv.release ? "--release" : ""
            ], {
                shell: true,
                stdio: "inherit",
                cwd: path.resolve(process.cwd(), ".cordova")
            });
        }
        else {
            const devServerUrl = `http://${config.server.host}:${config.server.port}/${clientConfig.package}`;
            const cordovaPath = path.resolve(process.cwd(), ".cordova");
            fs.removeSync(path.resolve(cordovaPath, "www"));
            fs.mkdirsSync(path.resolve(cordovaPath, "www"));
            fs.writeFileSync(path.resolve(cordovaPath, "www/index.html"), `'${devServerUrl}'로 이동중... <script>window.location.href = "${devServerUrl}";</script>`.trim(), "utf-8");

            let configFileContent = fs.readFileSync(path.resolve(cordovaPath, "config.xml"), "utf-8");
            if (!new RegExp(`<allow-navigation href="${devServerUrl}(/\\*)?"\\s?/>`).test(configFileContent)) {
                configFileContent = configFileContent.replace("</widget>", `<allow-navigation href="${devServerUrl}" /></widget>`);
                configFileContent = configFileContent.replace("</widget>", `<allow-navigation href="${devServerUrl}/*" /></widget>`);
                fs.writeFileSync(path.resolve(cordovaPath, "config.xml"), configFileContent, "utf-8");
            }

            await childProcess.spawnSync("cordova", ["run", "android", "--device"], {
                stdio: "inherit",
                shell: true,
                cwd: cordovaPath
            });
        }
    }
    else {
        throw new Exception("실행할 수 없는 플랫폼입니다. (패키지: " + argv.client + ", 플랫폼: " + platform + ")");
    }
}