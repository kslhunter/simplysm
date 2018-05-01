import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import {ISimpackConfig} from "../commons/ISimpackConfig";
import * as glob from "glob";
import {Exception, Logger} from "../../../sd-core/src";
import {FtpStorage} from "../../../sd-storage/src";

export class SdPackagePublisher {
    private _logger = new Logger("@simplism/sd-pack", `SdPackagePublisher :: ${this._packageName}`);

    private _root(...args: string[]): string {
        return path.resolve.apply(path, [process.cwd(), `packages/${this._packageName}`].concat(args));
    }

    public constructor(private _packageName: string) {
    }

    public async runAsync(config: ISimpackConfig | undefined): Promise<void> {
        // 최상위 package.json 설정 가져오기
        const rootPackageJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));

        // package.json 설정 가져오기
        let packageJson: any;
        if (fs.existsSync(this._root("package.json"))) {
            packageJson = fs.readJsonSync(this._root("package.json"));
        }

        if (packageJson) {
            this._logger.log(`${rootPackageJson.version} 배포 시작`);

            await new Promise<void>((resolve, reject) => {
                // 의존성 버전 재구성
                const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
                for (const depTypeName of depTypeNames) {
                    for (const depName of Object.keys(packageJson[depTypeName] || {})) {
                        if (depName.startsWith("@simplism")) {
                            packageJson[depTypeName][depName] = `^${rootPackageJson.version}`;
                        }
                        else if (rootPackageJson.dependencies[depName]) {
                            packageJson[depTypeName][depName] = rootPackageJson.dependencies[depName];
                        }
                        else {
                            throw new Exception(`'${this._packageName}'패키지의 의존성 패키지 정보가 루트 패키지에 없습니다.`);
                        }
                    }
                }

                // package.json 파일 다시쓰기
                fs.writeJsonSync(this._root("package.json"), packageJson, {spaces: 2});

                // 새 버전으로 배포
                /*const newVersion = semver.inc(packageJson.version, "patch")!;*/
                const shell = child_process.spawn("yarn", ["publish", "--new-version", rootPackageJson.version, "--access", "public", "--no-git-tag-version"], {
                    shell: true,
                    stdio: "pipe",
                    cwd: this._root()
                });

                shell.stderr.on("data", (chunk) => {
                    const message = chunk.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").trim();
                    if (message) {
                        this._logger.error(message);
                        reject();
                    }
                });

                shell.on("exit", () => {
                    this._logger.info(`v${rootPackageJson.version} 배포 완료`);
                    resolve();
                });
            });
        }
        else if (config && (config.type === "server" || config.type === "client")) {
            this._logger.log(`${rootPackageJson.version} 배포 시작`);

            const spawn1 = child_process.spawnSync("git", ["diff"], {
                shell: true
            });
            if (spawn1.output.filter((item: any) => item && item.toString().trim()).length > 0) {
                this._logger.error("커밋 되지 않은 정보가 있습니다.");
                return;
            }

            /*const spawn2 = child_process.spawnSync("git", ["log", "origin/master..HEAD"], {
                shell: true
            });
            if (spawn2.output.filter((item: any) => item && item.toString().trim()).length > 0) {
                this._logger.error("푸쉬되지 않은 정보가 있습니다.");
                return;
            }*/

            if (!config.publish) {
                this._logger.error("배포 설정을 찾을 수 없습니다.");
                return;
            }

            //-- 배포
            const storage = new FtpStorage();
            await storage.connect({
                host: config.publish.host,
                port: config.publish.port,
                user: config.publish.userName,
                password: config.publish.password
            });

            //-- 루트 디렉토리 생성
            await storage.mkdir(config.publish.root);

            //-- 로컬 파일 전송
            const distPath = (config && config.type === "client") ? path.resolve(process.cwd(), "dist", "www", config.publish.root) : path.resolve(process.cwd(), "dist");
            const filePaths = (config && config.type === "client")
                ? glob.sync(path.resolve(distPath, "**", "*"), {})
                : glob.sync(path.resolve(distPath, "**", "*"), {ignore: ["www"]});

            for (const filePath of filePaths) {
                const ftpFilePath = config.publish.root + "/" + path.relative(distPath, filePath).replace(/\\/g, "/");
                if (fs.lstatSync(filePath).isDirectory()) {
                    await
                        storage.mkdir(ftpFilePath);
                }
                else {
                    await
                        storage.put(filePath, ftpFilePath);
                }
            }

            //-- pm2.json 전송
            if (config.type === "server") {
                await storage.put(
                    Buffer.from(
                        JSON.stringify({
                            apps: [{
                                name: config.publish.root,
                                script: "./app.js",
                                port: config.port,
                                watch: [
                                    "app.js",
                                    "pm2.json"
                                ]
                            }]
                        }, undefined, 2)
                    ),
                    `/${config.publish.root}/pm2.json`
                );
            }

            await storage.close();
        }
    }
}