import {spawn} from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import {Exception} from "../../../core/src/index";
import {Logger} from "../../../core/src/utils/Logger";

export class LibraryPublisher {
    private _logger = new Logger("simpack", `LibraryPublisher :: ${this._packageName}`);

    private _root(...args: string[]): string {
        return path.resolve.apply(path, [process.cwd(), `packages/${this._packageName}`].concat(args));
    }

    public constructor(private _packageName: string) {
    }

    public async runAsync(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            // 최상위 package.json 설정 가져오기
            const rootPackageJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));

            // 시작 로그
            this._logger.log(`${rootPackageJson.version} 배포 시작`);

            // package.json 설정 가져오기
            const packageJson = fs.readJsonSync(this._root("package.json"));

            // 의존성 버전 재구성
            const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
            for (const depTypeName of depTypeNames) {
                for (const depName of Object.keys(packageJson[depTypeName] || {})) {
                    if (depName.startsWith("@simplism")) {
                        packageJson[depTypeName][depName] = `^${rootPackageJson.version}`;
                    }
                    else if (rootPackageJson.devDependencies[depName]) {
                        packageJson[depTypeName][depName] = rootPackageJson.devDependencies[depName];
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
            const shell = spawn("yarn", ["publish", "--new-version", rootPackageJson.version, "--access", "public", "--no-git-tag-version"], {
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
}