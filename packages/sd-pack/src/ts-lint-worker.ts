import * as fs from "fs-extra";
import * as path from "path";
import * as tslint from "tslint";
import * as ts from "typescript";

const context = process.argv[2];
const outputPath = process.argv[3];

const tsconfig = fs.readJsonSync(path.resolve(context, `tsconfig.json`));
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, context);
if (!parsed.options.declaration) process.exit();

const tsHost = ts.createCompilerHost(parsed.options);
tsHost.writeFile = (fileName: string, content: string) => {
    const distPath = outputPath;
    const packageName = path.basename(context);

    if (fileName.includes("src") && !fileName.startsWith(path.resolve(distPath, packageName, "src").replace(/\\/g, "/"))) {
        return;
    }

    if (fileName.includes("src") && fileName.startsWith(path.resolve(distPath, packageName, "src").replace(/\\/g, "/"))) {
        fileName = fileName.replace(`${packageName}/src/`, "");
    }
    ts.sys.writeFile(fileName, content);
};

const tsProgram = ts.createProgram(
    parsed.fileNames,
    parsed.options,
    tsHost
) as ts.Program;

const tsLinter = new tslint.Linter({
    formatter: "prose",
    fix: false
}, tsProgram);

process.on("message", async (sourceFilePaths) => {
    const promiseList = [];
    if (!sourceFilePaths) {
        promiseList.push(buildAsync(tsProgram));

        const filePaths = tslint.Linter.getFileNames(tsProgram);
        for (const filePath of filePaths) {
            promiseList.push(lintAsync(tsLinter, filePath));
        }
    }
    else {
        for (const sourceFilePath of sourceFilePaths) {
            promiseList.push(buildAsync(tsProgram, sourceFilePath));
            promiseList.push(lintAsync(tsLinter, sourceFilePath));
        }
    }
    await Promise.all(promiseList);
    process.send!("finish");
});

function buildAsync(program: ts.Program, filePath?: string): Promise<void> {
    return new Promise<void>((resolve) => {
        const buildResult = program.emit(filePath ? program.getSourceFile(filePath) : undefined, undefined, undefined, true);
        const diagnostics = ts.getPreEmitDiagnostics(program).concat(buildResult.diagnostics);
        for (const diagnostic of diagnostics) {
            if (diagnostic.file) {
                const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                process.send!({
                    type: "error",
                    message: `${diagnostic.file.fileName}\nERROR: ${diagnostic.file.fileName}[${position.line + 1}, ${position.character + 1}]: ${message}`
                });
            }
            else {
                process.send!({
                    type: "error",
                    message: `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
                });
            }
        }
        resolve();
    });
}

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