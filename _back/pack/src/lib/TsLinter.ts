import {Configuration, Linter} from "tslint";
import * as path from "path";
import {spawn} from "child_process";

export class TsLinter {
    static async lint(projectPath: string, fix: boolean): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const cmd = spawn("tsc", ["--noEmit"], {
                cwd: projectPath,
                shell: true
            });
            let errorMessage = "";
            cmd.stdout.on("data", data => {
                errorMessage += data.toString();
            });
            cmd.stderr.on("data", data => {
                errorMessage += data.toString();
            });
            cmd.on("exit", () => {
                if (errorMessage) {
                    let result = "";
                    const messages = errorMessage.split("\n");
                    for (const message of messages) {
                        const matches = message.trim().match(/^([^(]*)\(([^,]*),([^)]*)\): [^:]*: (.*)$/);
                        if (matches) {
                            const filePath = path.resolve(projectPath, matches![1]);
                            const lineNumber = matches![2];
                            const charNumber = matches![3];
                            const currMessage = matches![4];
                            result += `ERROR: ${filePath}[${lineNumber}, ${charNumber}]: ${currMessage}\n`;
                        }
                    }
                    reject(new Error("build error\n" + result));
                }
                else {
                    resolve();
                }
            });
        });

        const program = Linter.createProgram(path.resolve(projectPath, "tsconfig.json"), projectPath);
        const linter = new Linter({
            fix,
            formatter: "json"
        }, program);

        const errorMessages: string[] = [];
            const filePaths = Linter.getFileNames(program);
            for (const filePath of filePaths) {
            const configPath = path.resolve(process.cwd(), "tslint.json");
            linter.lint(filePath, program.getSourceFile(filePath)!.getFullText(), Configuration.findConfiguration(configPath, filePath).results);
            const result = linter.getResult();
            errorMessages.pushRange(result.failures.map(failure => {
                const severity = failure.getRuleSeverity().toUpperCase();
                const message = `${failure.getFailure()}`;
                const rule = `(${failure.getRuleName()})`;
                const fileName = failure.getFileName();
                const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
                const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;
                return `${severity}: ${fileName}[${lineNumber}, ${charNumber}]: ${message} ${rule}`;
            }));
        }
        if (errorMessages.length > 0) {
            //process.stderr.write(errorMessages.join("\n") + "\n\n");
            throw new Error("lint error\n" + errorMessages.distinct().sort().join("\n") + "\n\n");
        }
    }
}
