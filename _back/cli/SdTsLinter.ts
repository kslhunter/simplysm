import * as ts from "typescript";
import * as tslint from "tslint";
import * as path from "path";
import {SdWorkerHelpers} from "../workers/SdWorkerHelpers";

export class SdTsLinter {
  public static run(program: ts.Program, contextPath: string): string[] {
    const config = tslint.Configuration.findConfiguration(path.resolve(contextPath, "tslint.json")).results!;
    const linter = new tslint.Linter({formatter: "json", fix: false}, program);

    for (const sourceFile of program.getSourceFiles()) {
      if (SdWorkerHelpers.getIsMyTsFile(sourceFile.fileName, contextPath)) {
        linter.lint(sourceFile.fileName, sourceFile.getFullText(), config);
      }
    }

    return linter.getResult().failures
      .map(failure => SdTsLinter._lintFailureToMessage(failure))
      .distinct();
  }

  public static inject<T extends ts.BuilderProgram>(host: ts.WatchCompilerHost<T>, contextPath: string, callback: (messages: string[]) => void): void {
    let program: ts.Program;

    const watchingFileMap = new Map<string, string>();

    const prevAfterProgramCreate = host.afterProgramCreate;
    host.afterProgramCreate = watcherProgram => {
      program = watcherProgram.getProgram();
      const prevGetSemanticDiagnostics = program.getSemanticDiagnostics;
      program.getSemanticDiagnostics = (sourceFile, cancellationToken) => {
        if (sourceFile) {
          const content = sourceFile.getFullText();
          if (SdWorkerHelpers.getIsMyTsFile(sourceFile.fileName, contextPath) && content && !watchingFileMap.has(sourceFile.fileName)) {
            watchingFileMap.set(sourceFile.fileName, content);
          }
        }
        return prevGetSemanticDiagnostics(sourceFile, cancellationToken);
      };

      if (prevAfterProgramCreate) {
        prevAfterProgramCreate(watcherProgram);
      }
    };

    const prevOnWatchStatusChange = host.onWatchStatusChange;
    host.onWatchStatusChange = (diagnostic, newLine, options) => {
      if (prevOnWatchStatusChange) {
        prevOnWatchStatusChange(diagnostic, newLine, options);
      }

      const messageText = diagnostic.messageText.toString();
      if (messageText.includes("Watching for file changes")) {
        const config = tslint.Configuration.findConfiguration(path.resolve(contextPath, "tslint.json")).results!;

        const linter = new tslint.Linter({formatter: "json", fix: false}, program);
        for (const fileName of Array.from(watchingFileMap.keys())) {
          linter.lint(fileName, watchingFileMap.get(fileName)!, config);
        }

        const failures = linter.getResult().failures;

        const failureFileNames = failures.map(item => item.getFileName()).distinct();
        const successFileNames = Array.from(watchingFileMap.keys()).filter(fileName => !failureFileNames.includes(fileName)).distinct();
        for (const successFileName of successFileNames) {
          watchingFileMap.delete(successFileName);
        }

        callback(
          failures.map(failure => SdTsLinter._lintFailureToMessage(failure)).distinct()
        );
      }
    };
  }

  private static _lintFailureToMessage(failure: tslint.RuleFailure): string {
    const severity = failure.getRuleSeverity();
    const message = failure.getFailure();
    const rule = failure.getRuleName();
    const fileName = failure.getFileName();
    const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
    const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;

    return `${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} (${rule})`;
  }
}
