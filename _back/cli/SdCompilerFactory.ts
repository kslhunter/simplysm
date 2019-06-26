import * as ts from "typescript";
import {SdWorkerHelpers} from "../workers/SdWorkerHelpers";

export class SdCompilerFactory {
  public static createWatchCompilerHost(cmdLine: ts.ParsedCommandLine, emit: boolean, onWatch: () => void, onFinish: (messages: string[]) => void): ts.WatchCompilerHost<ts.BuilderProgram> {
    let messages: string[] = [];

    const builderProgram = (
      emit ? ts.createEmitAndSemanticDiagnosticsBuilderProgram : ts.createSemanticDiagnosticsBuilderProgram
    ) as ts.CreateProgram<ts.BuilderProgram>;

    return ts.createWatchCompilerHost(
      cmdLine.fileNames,
      cmdLine.options,
      ts.sys,
      builderProgram,
      emit
        ? diagnostic => {
          const message = SdWorkerHelpers.diagnosticToMessage(diagnostic);
          if (message) {
            messages.push(message);
          }
        }
        : undefined,
      diagnostic => {
        const messageText = diagnostic.messageText.toString();
        if (messageText.includes("Starting compilation in watch mode") || messageText.includes("File change detected. Starting incremental compilation")) {
          onWatch();
        }
        else if (messageText.includes("Watching for file changes")) {
          onFinish(messages);
          messages = [];
        }
      }
    );
  }
}
