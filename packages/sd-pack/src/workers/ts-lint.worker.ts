import "@simplism/sd-core"; // tslint:disable-line:no-import-side-effect
import * as fs from "fs";
import * as path from "path";
import * as tslint from "tslint";
import * as ts from "typescript";
import * as yargs from "yargs";

const argv = yargs
  .options({
    package: {
      type: "string",
      required: true
    }
  })
  .argv;

const packageName = argv.package;
const getContextPath = (...args: string[]) => path.resolve(process.cwd(), `packages/${packageName}`, ...args);

const tsconfigPath = getContextPath("tsconfig.json");
const tsconfigJson = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
const tsconfig = ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, getContextPath());

const tslintConfig = tslint.Configuration.findConfiguration(getContextPath("tslint.json"));

process.on("message", (filePaths: string[]) => {
  const tslintProgram = tslint.Linter.createProgram(tsconfigPath, getContextPath());
  const tslintLinter = new tslint.Linter({formatter: "json", fix: false}, tslintProgram);

  const lintFilePaths = filePaths.length > 0 ? filePaths : tsconfig.fileNames;

  let messages: string[] = [];
  for (const filePath of lintFilePaths) {
    const sourceFile = tslintProgram.getSourceFile(filePath);
    if (sourceFile) {
      tslintLinter.lint(filePath, sourceFile.getFullText(), tslintConfig.results);

      const lintResult = tslintLinter.getResult();

      messages = messages.concat(
        lintResult.failures.map(failure => {
          const severity = failure.getRuleSeverity();
          const message = `${failure.getFailure()}`;
          const rule = `(${failure.getRuleName()})`;
          const fileName = failure.getFileName();
          const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
          const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;
          return `${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} ${rule}`;
        })
      );
    }
    else {
      messages.push(filePath + ": 소스파일이 잘못되었습니다");
    }
  }

  messages = messages.distinct();

  process.send!(messages, (err: Error) => {
    if (err) throw err;
  });
});