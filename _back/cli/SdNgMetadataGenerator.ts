import * as ts from "typescript";
import {MetadataCollector} from "@angular/compiler-cli";
import * as fs from "fs-extra";
import * as path from "path";
import {SdWorkerHelpers} from "../workers/SdWorkerHelpers";

export class SdNgMetadataGenerator {
  public static run(program: ts.Program, contextPath: string): string[] {
    const diagnostics: ts.Diagnostic[] = [];
    for (const sourceFile of program.getSourceFiles()) {
      if (SdWorkerHelpers.getIsMyTsFile(sourceFile.fileName, contextPath)) {
        diagnostics.pushRange(
          SdNgMetadataGenerator._writeMetadata(sourceFile, contextPath)
        );
      }
    }

    return diagnostics.map(item => SdWorkerHelpers.diagnosticToMessage(item)).filterExists().distinct();
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
        const diagnostics: ts.Diagnostic[] = [];
        for (const fileName of Array.from(watchingFileMap.keys())) {
          const sourceFile = program.getSourceFile(fileName);
          if (sourceFile) {
            diagnostics.pushRange(
              SdNgMetadataGenerator._writeMetadata(sourceFile, contextPath)
            );
          }
        }

        const failureFileNames = diagnostics.map(item => item.file ? item.file.fileName : undefined).filterExists().distinct();
        const successFileNames = Array.from(watchingFileMap.keys()).filter(fileName => !failureFileNames.includes(fileName)).distinct();
        for (const successFileName of successFileNames) {
          watchingFileMap.delete(successFileName);
        }

        callback(
          diagnostics.map(item => SdWorkerHelpers.diagnosticToMessage(item)).filterExists().distinct()
        );
      }
    };
  }

  private static _writeMetadata(sourceFile: ts.SourceFile, contextPath: string): ts.Diagnostic[] {
    const messages: ts.Diagnostic[] = [];
    const metadata = new MetadataCollector().getMetadata(sourceFile, false, (value, tsNode) => {
      if (value && value["__symbolic"] && value["__symbolic"] === "error") {
        messages.push({
          file: sourceFile,
          start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
          messageText: value["message"],
          category: ts.DiagnosticCategory.Error,
          code: 0,
          length: undefined
        });
      }
      return value;
    });

    const relativePath = path.relative(path.resolve(contextPath, "src"), sourceFile.fileName);
    const outPath = path.resolve(path.resolve(contextPath, "dist"), relativePath).replace(/\.ts$/, ".metadata.json");

    if (metadata) {
      fs.mkdirsSync(path.dirname(outPath));
      fs.writeJsonSync(outPath, metadata);
    }

    return messages;
  }
}
