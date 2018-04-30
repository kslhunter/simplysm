import "../../sd-core/src/extensions/ArrayExtensions";
import * as path from "path";
import * as tslint from "tslint";
import * as ts from "typescript";

const context = process.argv[2];

const tsconfigPath = path.resolve(context, `tsconfig.json`);

process.on("message", async (msg: { sourceFilePaths: string[] | undefined }) => {
    const tsLinterProgram = tslint.Linter.createProgram(tsconfigPath, context);
    const tsLinter = new tslint.Linter({
        formatter: "json",
        fix: false
    }, tsLinterProgram);

    /*const startTime = new Date().getTime();*/

    const promiseList = [];
    if (!msg.sourceFilePaths) {
        const filePaths = tslint.Linter.getFileNames(tsLinterProgram);
        for (const filePath of filePaths) {
            promiseList.push(lintAsync(tsLinterProgram, tsLinter, filePath));
        }
    }
    else {
        for (const sourceFilePath of msg.sourceFilePaths) {
            promiseList.push(lintAsync(tsLinterProgram, tsLinter, sourceFilePath));
        }
    }
    await Promise.all(promiseList);

    /*process.send!({
        type: "log",
        message: `lint duration: ${new Time(new Date().getTime() - startTime).toFormatString("ss.fff")}`
    });*/

    process.send!("finish");
});

function lintAsync(program: ts.Program, linter: tslint.Linter, filePath: string): Promise<void> {
    return new Promise<void>((resolve) => {
        if (program.getSourceFile(filePath)) {
            const config = tslint.Configuration.findConfiguration(path.resolve(context, `tslint.json`), filePath);
            linter.lint(filePath, program.getSourceFile(filePath)!.getFullText(), config.results);
            const lintResult = linter.getResult();

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
                });
            }
        }
        resolve();
    });
}