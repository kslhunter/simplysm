import * as fs from "fs-extra";
import * as path from "path";
import * as tslint from "tslint";
import * as ts from "typescript";

const context = process.argv[2];

const tsconfig = fs.readJsonSync(path.resolve(context, `tsconfig.json`));
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, context);

const tsProgram = ts.createProgram(
    parsed.fileNames,
    parsed.options
) as ts.Program;

const tsLintWorker = new tslint.Linter({
    formatter: "prose",
    fix: false
}, tsProgram);

process.on("message", async (sourceFilePaths) => {
    /*const startTime = new Date().getTime();*/

    const promiseList = [];
    if (!sourceFilePaths) {
        const filePaths = tslint.Linter.getFileNames(tsProgram);
        for (const filePath of filePaths) {
            promiseList.push(lintAsync(tsLintWorker, filePath));
        }
    }
    else {
        for (const sourceFilePath of sourceFilePaths) {
            promiseList.push(lintAsync(tsLintWorker, sourceFilePath));
        }
    }
    await Promise.all(promiseList);

    /*process.send!({
        type: "log",
        message: `lint duration: ${new Time(new Date().getTime() - startTime).toFormatString("ss.fff")}`
    });*/

    process.send!("finish");
});

function lintAsync(linter: tslint.Linter, filePath: string): Promise<void> {
    return new Promise<void>((resolve) => {
        linter.lint(filePath, filePath, tslint.Configuration.findConfiguration(path.resolve(context, `tslint.json`), filePath).results);
        const lintResult = linter.getResult();
        if (lintResult.output.trim()) {
            process.send!({
                type: "warn",
                message: lintResult.output.trim()
            });
        }
        resolve();
    });
}