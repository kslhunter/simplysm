import * as path from "path";
import * as fs from "fs-extra";
import {spawnSync} from "child_process";
import {DatabaseFileGenerator} from "../../packages/pack/src/lib/DatabaseFileGenerator";
import * as sass from "node-sass";

export async function build(packageName: string): Promise<void> {
    const packagePath = path.resolve(process.cwd(), "packages", packageName);
    fs.removeSync(path.resolve(packagePath, "dist"));

    console.log(packageName + " :: 빌드");

    let tsconfigContent = fs.readFileSync(path.resolve(packagePath, "tsconfig.json"), "utf8");
    tsconfigContent = tsconfigContent.replace(/\/src\/index\.ts/g, "");
    fs.writeFileSync(path.resolve(packagePath, "tsconfig-build.json"), tsconfigContent);

    if (fs.existsSync(path.resolve(packagePath, "diagram"))) {
        await DatabaseFileGenerator.generateModelFirst({
            name: "Simplism" + packageName[0].toUpperCase() + packageName.substr(1).replace(/-[a-z]/g, item => item.toUpperCase().substr(1)),
            modelRoot: path.resolve(process.cwd(), "packages", packageName, "diagram"),
            dist: path.resolve(process.cwd(), "packages", packageName, "src"),
            useCamelCase: true
        });
    }

    const packageConfigPath = path.resolve(packagePath, "package.json");
    const packageConfig = fs.readJSONSync(packageConfigPath);
    if (packageConfig.style) {
        try {
            const scssEntryFilePath = path.resolve(packagePath, packageConfig.style.replace("dist", "scss").replace(/\.css$/g, ".scss"));
            const outputFilePath = path.resolve(packagePath, packageConfig.style);

            console.log(packageName + ": " + "SCSS".padEnd(8, " ") + ": 시작");
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
            console.log(packageName + ": " + "SCSS".padEnd(8, " ") + ": 완료");
        }
        catch (e) {
            console.error(e["formatted"] ? e["formatted"] : e.stack);
        }
    }

    spawnSync("tslint", ["-p", "./tsconfig-build.json"], {
        shell: true,
        stdio: "inherit",
        cwd: packagePath
    });

    spawnSync("tsc", ["-p", "./tsconfig-build.json"], {
        shell: true,
        stdio: "inherit",
        cwd: packagePath
    });
}