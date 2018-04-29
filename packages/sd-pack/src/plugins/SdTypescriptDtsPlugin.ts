import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import {helpers} from "../common/helpers";

export class TypescriptDtsPlugin {
    constructor(private _opts: { packageName: string }) {
    }

    apply(compiler: webpack.Compiler): void {
        let prevTimestamps: { [key: string]: number };
        compiler.hooks.afterEmit.tap(this.constructor.name, (compilation) => {
            const tsconfig = fs.readJsonSync(helpers.root(`tsconfig.json`));
            const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, helpers.root(`packages/${this._opts.packageName}`));
            if (!parsed.options.declaration) return;

            const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
            let changedTsFiles: string[] | undefined;
            if (prevTimestamps) {
                changedTsFiles = Array.from(fileTimestamps.keys())
                    .filter(fileName => prevTimestamps[fileName] < fileTimestamps.get(fileName)!)
                    .filter(fileName => path.extname(fileName) === ".ts");
            }

            prevTimestamps = prevTimestamps || {};
            for (const fileName of Array.from(fileTimestamps.keys())) {
                prevTimestamps[fileName] = fileTimestamps.get(fileName)!;
            }

            const tsHost = ts.createCompilerHost(parsed.options);
            tsHost.writeFile = (fileName: string, content: string) => {
                console.log(fileName);
                const distPath = helpers.root(`packages/${this._opts.packageName}/dist`);

                if (fileName.includes("src") && !fileName.startsWith(path.resolve(distPath, this._opts.packageName, "src").replace(/\\/g, "/"))) {
                    return;
                }

                if (fileName.includes("src") && fileName.startsWith(path.resolve(distPath, this._opts.packageName, "src").replace(/\\/g, "/"))) {
                    fileName = fileName.replace(this._opts.packageName + "/src/", "");
                }
                ts.sys.writeFile(fileName, content);
            };

            const tsProgram = ts.createProgram(
                compilation.entries.map(item => item.resource) as ReadonlyArray<string>,
                parsed.options,
                tsHost
            ) as ts.Program;

            if (changedTsFiles) {
                for (const changedTsFile of changedTsFiles) {
                    tsProgram.emit(tsProgram.getSourceFile(changedTsFile), undefined, undefined, true);
                }
            }
            else {
                tsProgram.emit(undefined, undefined, undefined, true);
            }
        });
    }
}