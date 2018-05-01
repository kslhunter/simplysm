import "../../sd-core/src";
import * as path from "path";
import * as tslint from "tslint";
import * as fs from "fs-extra";
import * as ts from "typescript";

const context = process.argv[2];

const tsconfigPath = path.resolve(context, `tsconfig.json`);
const tsconfig = fs.readJsonSync(tsconfigPath);
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, context);

process.on("message", (changedTsFiles: string[]) => {
    /*const startTime = new Date().getTime();*/

    const tsLinterProgram = tslint.Linter.createProgram(tsconfigPath, context);
    const tsLinter = new tslint.Linter({
        formatter: "json",
        fix: false
    }, tsLinterProgram);

    const checkFiles = changedTsFiles.length > 0 ? changedTsFiles : parsed.fileNames;
    for (const filePath of checkFiles) {
        const sourceFile = tsLinterProgram.getSourceFile(filePath);
        if (!sourceFile) continue;

        const config = tslint.Configuration.findConfiguration(path.resolve(context, `tslint.json`), filePath);
        tsLinter.lint(filePath, sourceFile.getFullText(), config.results);

        const lintResult = tsLinter.getResult();

        const errorMessages: string[] = lintResult.failures.map((failure) => {
            if (failure.getFileName() !== filePath) return;

            const severity = failure.getRuleSeverity().toUpperCase();
            const message = `${failure.getFailure()}`;
            const rule = `(${failure.getRuleName()})`;
            const fileName = failure.getFileName();
            const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
            const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;
            return `${severity}: ${fileName}[${lineNumber}, ${charNumber}]: ${message} ${rule}`;
        }).filterExists();

        if (errorMessages.length > 0) {
            process.send!({
                type: "warn",
                message: `${filePath}\n${errorMessages.join("\n")}`
            }, (err: Error) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    }

    /*const finishTime = new Date().getTime();
    process.send!({
        type: "log",
        message: `lint: ${finishTime - startTime}`
    }, (err: Error) => {
        if (err) {
            console.error(err);
        }
    });*/
    process.send!("finish", (err: Error) => {
        if (err) {
            console.error(err);
        }
    });
});