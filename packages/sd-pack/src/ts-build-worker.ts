import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";

const context = process.argv[2];
const outputPath = process.argv[3];

const tsconfig = fs.readJsonSync(path.resolve(context, `tsconfig.json`));
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, context);

let tsHost;
if (parsed.options.declaration) {
    tsHost = ts.createCompilerHost(parsed.options);
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
}

const tsProgram = ts.createProgram(
    parsed.fileNames,
    parsed.options,
    tsHost
) as ts.Program;

process.on("message", async (msg: { sourceFilePaths: string[] | undefined }) => {
    /*const startTime = new Date().getTime();*/
    const promiseList = [];
    if (!msg.sourceFilePaths) {
        promiseList.push(buildAsync(tsProgram));
    }
    else {
        for (const sourceFilePath of msg.sourceFilePaths) {
            promiseList.push(buildAsync(tsProgram, sourceFilePath));
        }
    }

    await Promise.all(promiseList);

    /*process.send!({
        type: "log",
        message: `build duration: ${new Time(new Date().getTime() - startTime).toFormatString("ss.fff")}`
    });*/

    process.send!("finish");
});

function buildAsync(program: ts.Program, filePath?: string): Promise<void> {
    return new Promise<void>((resolve) => {
        const diagnostics = [
            ...parsed.options.declaration
                ? program.emit(filePath ? program.getSourceFile(filePath) : undefined, undefined, undefined, true).diagnostics
                : program.getSemanticDiagnostics(filePath ? program.getSourceFile(filePath) : undefined),
            ...ts.getPreEmitDiagnostics(program)
        ];
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