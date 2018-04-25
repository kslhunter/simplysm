import {spawn} from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import {Exception} from "../../../core/src";

export async function publish(): Promise<void> {
    // 최상위 package.json 설정 가져오기
    const rootPackageJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));

    const promiseList: Promise<void>[] = [];
    for (const packageName of fs.readdirSync(path.resolve(process.cwd(), `packages`))) {
        promiseList.push(new Promise<void>((resolve, reject) => {
            const packagePath = path.resolve(path.resolve(process.cwd(), "packages", packageName));

            // package.json 설정 가져오기
            const packageJson = fs.readJsonSync(path.resolve(packagePath, "package.json"));

            // 최상위 package.json 버전이 더 크면 버전 덮어쓰기
            if (semver.gt(rootPackageJson.version, packageJson.version)) {
                packageJson.version = rootPackageJson.version;
            }

            // 의존성 버전 재구성
            const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
            for (const depTypeName of depTypeNames) {
                for (const depName of Object.keys(packageJson[depTypeName] || {})) {
                    if (depName.startsWith("@simplism")) {
                        const targetPackageName = depName.substr(10);
                        const targetPackageJsonPath = path.resolve(process.cwd(), "packages", targetPackageName, "package.json");
                        const targetVersion = fs.readJSONSync(targetPackageJsonPath).version;
                        if (!targetVersion) {
                            throw new Exception(`'${targetPackageName}'패키지의 버전을 알 수 없습니다.`);
                        }
                        packageJson[depTypeName][depName] = `^${targetVersion}`;
                    }
                    else if (rootPackageJson.devDependencies[depName]) {
                        packageJson[depTypeName][depName] = rootPackageJson.devDependencies[depName];
                    }
                    else {
                        throw new Exception(`'${packageName}'패키지의 의존성 패키지 정보가 루트 패키지에 없습니다.`);
                    }
                }
            }

            // package.json 파일 다시쓰기
            fs.writeJsonSync(path.resolve(packagePath, "package.json"), packageJson, {spaces: 2});

            // 새 버전으로 배포
            const newVersion = semver.inc(packageJson.version, "patch")!;
            const shell = spawn("yarn", ["publish", "--new-version", newVersion, "--access", "public", "--no-git-tag-version"], {
                shell: true,
                stdio: "pipe",
                cwd: packagePath
            });

            shell.stderr.on("data", (chunk) => {
                if (chunk.toString().trim()) {
                    console.error(chunk.toString().trim());
                    reject();
                }
            });

            shell.on("exit", () => {
                resolve();
            });
        }));
    }

    await Promise.all(promiseList);
}