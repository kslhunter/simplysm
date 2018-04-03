import * as path from "path";
import * as fs from "fs-extra";
import * as sass from "node-sass";
import {spawn} from "child_process";
import {FileWatcher} from "../../packages/pack/src/lib/FileWatcher";
import {DatabaseFileGenerator} from "../../packages/pack/src/lib/DatabaseFileGenerator";

export async function watch(packageName: string): Promise<void> {
    const logTitle = packageName.padEnd(15, " ");
    console.log(logTitle + ": 감지시작");

    const packagePath = path.resolve(process.cwd(), "packages", packageName);
    fs.removeSync(path.resolve(packagePath, "dist"));

    const promises = [];

    await new Promise(resolve => {
        FileWatcher.watch(path.resolve(packagePath, "tsconfig.json"), {}, async events => {
            let tsconfigContent = fs.readFileSync(path.resolve(packagePath, "tsconfig.json"), "utf8");
            tsconfigContent = tsconfigContent.replace(/\/src\/index\.ts/g, "");
            fs.writeFileSync(path.resolve(packagePath, "tsconfig-build.json"), tsconfigContent);

            if (events.some(event => event.type === "ready")) {
                resolve();
            }
        });
    });

    if (fs.existsSync(path.resolve(packagePath, "diagram"))) {
        await DatabaseFileGenerator.watchModelFirst({
            name: "Simplism" + packageName[0].toUpperCase() + packageName.substr(1).replace(/-[a-z]/g, item => item.toUpperCase().substr(1)),
            modelRoot: path.resolve(process.cwd(), "packages", packageName, "diagram"),
            dist: path.resolve(process.cwd(), "packages", packageName, "src"),
            useCamelCase: true
        });
    }

    const packageConfigPath = path.resolve(packagePath, "package.json");
    const packageConfig = fs.readJSONSync(packageConfigPath);
    if (packageConfig.style) {
        const scssEntryFilePath = path.resolve(packagePath, packageConfig.style.replace("dist", "scss").replace(/\.css$/g, ".scss"));
        const outputFilePath = path.resolve(packagePath, packageConfig.style);

        const scssBuild = () => new Promise(resolve => {
            try {
                console.log(logTitle + ": " + "SCSS".padEnd(8, " ") + ": 시작");
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
                console.log(logTitle + ": " + "SCSS".padEnd(8, " ") + ": 완료");
            }
            catch (e) {
                console.error(e["formatted"] ? e["formatted"] : e.stack);
            }
            resolve();
        });

        promises.push(
            new Promise(resolve => {
                FileWatcher.watch([
                    path.resolve(path.dirname(scssEntryFilePath), "**", "*.scss"),
                    path.resolve(path.dirname(scssEntryFilePath), "*.scss")
                ], {}, async events => {
                    await scssBuild();
                    if (events.some(event => event.type === "ready")) {
                        resolve();
                    }
                });
            })
        );
    }

    const tslinter = () => new Promise(resolve => {
        console.log(logTitle + ": " + "TSLINT".padEnd(8, " ") + ": 시작");
        const tslint = spawn("tslint", ["-p", "./tsconfig-build.json", "--exclude", "**/*.d.ts", "--exclude", "**/*.js", "--format", "msbuild"], {
            shell: true,
            cwd: packagePath
        });
        tslint.stdout.on("data", chunk => {
            console.error(chunk.toString().trim());
        });
        tslint.stderr.on("data", chunk => {
            console.error(logTitle + ": " + "TSLINT".padEnd(8, " ") + ": ERROR??: " + chunk.toString());
        });
        tslint.on("exit", () => {
            console.log(logTitle + ": " + "TSLINT".padEnd(8, " ") + ": 완료");
            resolve();
        });
    });

    const packageSourcePath = path.resolve(packagePath, "src");

    promises.push(
        new Promise(resolve => {
            FileWatcher.watch(path.resolve(packageSourcePath, "**", "*.ts"), {}, async events => {
                await tslinter();
                if (events.some(event => event.type === "ready")) {
                    resolve();
                }
            });
        })
    );

    promises.push(
        new Promise(resolve => {
            const tsc = spawn("tsc", ["-p", "./tsconfig-build.json", "--watch"], {
                shell: true,
                cwd: packagePath
            });
            tsc.stdout.on("data", chunk => {
                if (chunk.toString().includes("watch mode")) {
                    console.log(logTitle + ": " + "TS".padEnd(8, " ") + ": 시작");
                }

                if (chunk.toString().includes("error")) {
                    const message = chunk.toString();
                    const matchList = message.match(/([^(]*)\(([^)]*)\): error ([^:]*): (.*)/g);
                    if (matchList) {
                        for (const match of matchList) {
                            const matches = match.match(/([^(]*)\(([^)]*)\): error ([^:]*): (.*)/)!;
                            console.error("ERROR: " + path.resolve(process.cwd(), "packages", packageName, matches[1]) + "[" + matches[2] + "]: " + matches[3] + ": " + matches[4]);
                        }
                    }
                    else {
                        console.error(chunk.toString());
                    }
                }

                if (chunk.toString().includes("Compilation complete")) {
                    console.log(logTitle + ": " + "TS".padEnd(8, " ") + ": 완료");
                    resolve();
                }
            });
            tsc.stderr.on("data", chunk => {
                console.error(logTitle + ": " + "TS".padEnd(8, " ") + ": ERROR??: " + chunk.toString());
            });
        })
    );

    await Promise.all(promises);
}