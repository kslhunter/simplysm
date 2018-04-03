import * as path from "path";
import * as fs from "fs-extra";
import * as semver from "semver";
import {spawn} from "child_process";
import * as sass from "node-sass";
import {Exception} from "@simplism/core";

export async function publish(packageName: string): Promise<void> {
    console.log(packageName + " :: 배포");

    const rootPackageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const rootVersion = rootPackageConfig.version;

    const packagePath = path.resolve(process.cwd(), "packages", packageName);
    const packageConfig = fs.readJsonSync(path.resolve(packagePath, "package.json"));
    if (packageConfig.style) {
        try {
            const scssEntryFilePath = path.resolve(packagePath, packageConfig.style.replace("dist", "scss").replace(/\.css$/g, ".scss"));
            const outputFilePath = path.resolve(packagePath, packageConfig.style);

            const result = sass.renderSync({
                file: scssEntryFilePath,
                outFile: outputFilePath,
                sourceMap: true,
                importer: (url) => ({
                    file: url.replace(/~/g, path.resolve(process.cwd(), "node_modules").replace(/\\/g, "/") + "/")
                })
            });
            fs.mkdirsSync(path.dirname(outputFilePath));
            fs.writeFileSync(outputFilePath, result.css);
        }
        catch (e) {
            console.error("scss error: " + e.message);
            throw e;
        }
    }

    const mainPackageConfig = fs.readJSONSync(path.resolve(process.cwd(), "package.json"));
    const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
    for (const depTypeName of depTypeNames) {
        for (const depName of Object.keys(packageConfig[depTypeName] || {})) {
            if (depName.startsWith("@simplism")) {
                const targetPackageName = depName.substr(10);
                const targetPackageConfigPath = path.resolve(process.cwd(), "packages", targetPackageName, "package.json");
                const targetPackageConfigVersion = fs.readJSONSync(targetPackageConfigPath).version;
                if (!targetPackageConfigVersion) {
                    throw new Exception(`'${targetPackageName}'패키지의 버전을 알 수 없습니다.`);
                }
                packageConfig[depTypeName][depName] = "^" + targetPackageConfigVersion;
            }
            else if (!mainPackageConfig.devDependencies[depName]) {
                throw new Exception(`'${packageName}'패키지의 의존성 패키지 정보가 루트 패키지에 없습니다.`);
            }
            else {
                packageConfig[depTypeName][depName] = mainPackageConfig.devDependencies[depName];
            }
        }
    }

    if (semver.gt(rootVersion, packageConfig.version)) {
        packageConfig.version = rootVersion;
    }

    fs.writeJsonSync(path.resolve(packagePath, "package.json"), packageConfig, {
        spaces: 2
    });

    const newVersion = semver.inc(packageConfig.version, "patch")!;
    await new Promise<void>(resolve => {
        const shell = spawn("yarn", ["publish", "--new-version", newVersion, "--access", "public", "--no-git-tag-version"], {
            shell: true,
            stdio: "pipe",
            cwd: packagePath
        });

        shell.stderr.on("data", chunk => {
            console.error(chunk.toString());
        });

        shell.on("exit", () => {
            resolve();
        });
    });

    console.log(packageName + ` :: 배포 완료 (${newVersion})`);
}