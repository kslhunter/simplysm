import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";

const context = process.argv[2];
const outputPath = process.argv[3];

const tsconfig = fs.readJsonSync(path.resolve(context, `tsconfig.json`));
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, context);

let tsHost: ts.CompilerHost | undefined;
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

        content = content.replace(/from ".*(sd-[^/]*)[^;]*/g, (match, ...args) => {
            return `from "@simplism/${args[0]}"`;
        });

        ts.sys.writeFile(fileName, content);
    };
}

process.on("message", async (msg: { sourceFilePaths: string[] | undefined }) => {
    /*const startTime = new Date().getTime();*/

    const tsProgram = ts.createProgram(
        parsed.fileNames,
        {
            ...parsed.options,
            ...parsed.options.declaration
                ? {emitDeclarationOnly: true}
                : {}
        },
        tsHost
    ) as ts.Program;

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

    process.send!("finish", (err: Error) => {
        if (err) {
            console.error(err);
        }
    });
});

function buildAsync(program: ts.Program, filePath?: string): Promise<void> {
    return new Promise<void>((resolve) => {
        const diagnostics = parsed.options.declaration
            ? [
                ...program.emit(filePath ? program.getSourceFile(filePath) : undefined, undefined, undefined, true).diagnostics,
                ...ts.getPreEmitDiagnostics(program)
            ]
            : program.getSemanticDiagnostics(filePath ? program.getSourceFile(filePath) : undefined);

        for (const diagnostic of diagnostics) {
            if (diagnostic.file) {
                if (diagnostic.file.fileName.startsWith(context.replace(/\\/g, "/"))) {
                    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                    process.send!({
                        type: "error",
                        message: `${diagnostic.file.fileName}\nERROR: ${diagnostic.file.fileName}[${position.line + 1}, ${position.character + 1}]: ${message}`
                    }, (err: Error) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                }
            }
            else {
                process.send!({
                    type: "error",
                    message: `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
                }, (err: Error) => {
                    if (err) {
                        console.error(err);
                    }
                });
            }
        }
        resolve();
    });
}